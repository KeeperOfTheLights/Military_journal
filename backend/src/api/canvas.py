from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from src.api.dependencies import SessionDep, CurrentUser
from src.models.canvas import Canvas
from src.models.gamification import TopographicSymbol
from src.schemas.canvas import (
    CanvasCreate, CanvasRead, CanvasUpdate, 
    CanvasContent, CanvasObjectType
)

router = APIRouter(prefix="/canvases", tags=["Canvases"])


@router.post("/", response_model=CanvasRead, status_code=status.HTTP_201_CREATED)
async def create_canvas(
    canvas_data: CanvasCreate,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Create a new canvas.
    """
    new_canvas = Canvas(**canvas_data.model_dump(), creator_id=current_user.id)
    session.add(new_canvas)
    await session.commit()
    await session.refresh(new_canvas)

    return CanvasRead.model_validate(new_canvas)


@router.get("/", response_model=List[CanvasRead])
async def list_canvases(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all canvases.
    """
    query = select(Canvas).offset(skip).limit(limit).order_by(Canvas.title)
    result = await session.execute(query)
    canvases = result.scalars().all()
    return [CanvasRead.model_validate(c) for c in canvases]


@router.get("/{canvas_id}", response_model=CanvasRead)
async def get_canvas(canvas_id: int, session: SessionDep, current_user: CurrentUser):
    """
    Get canvas by ID.
    """
    result = await session.execute(select(Canvas).where(Canvas.id == canvas_id))
    canvas = result.scalar_one_or_none()

    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )

    return CanvasRead.model_validate(canvas)


@router.put("/{canvas_id}", response_model=CanvasRead)
async def update_canvas(
    canvas_id: int,
    canvas_update: CanvasUpdate,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Update canvas information.
    """
    result = await session.execute(select(Canvas).where(Canvas.id == canvas_id))
    canvas = result.scalar_one_or_none()

    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
        
    # Permission check (optional: only creator or admin)
    if canvas.creator_id != current_user.id and current_user.role != "admin": # assuming role exists on user model
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this canvas"
        )

    update_data = canvas_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(canvas, field, value)

    await session.commit()
    await session.refresh(canvas)

    return CanvasRead.model_validate(canvas)


@router.delete("/{canvas_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_canvas(
    canvas_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Delete a canvas.
    """
    result = await session.execute(select(Canvas).where(Canvas.id == canvas_id))
    canvas = result.scalar_one_or_none()

    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    
     # Permission check
    if canvas.creator_id != current_user.id and current_user.role != "admin":
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this canvas"
        )

    await session.delete(canvas)
    await session.commit()

@router.get("/{canvas_id}/load-content", response_model=CanvasContent)
async def load_canvas_content(
    canvas_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Load canvas content.
    """
    result = await session.execute(select(Canvas).where(Canvas.id == canvas_id))
    canvas = result.scalar_one_or_none()

    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    
    if not canvas.content:
        # Return default empty content if None
        return CanvasContent()
        
    try:
        # Content is stored as string in DB, parse it
        return CanvasContent.model_validate_json(canvas.content)
    except Exception:
        # Fallback if parsing fails or legacy format
        return CanvasContent()


@router.post("/{canvas_id}/save-content", response_model=CanvasContent)
async def save_canvas_content(
    canvas_id: int,
    content_data: CanvasContent,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Save canvas content.
    """
    result = await session.execute(select(Canvas).where(Canvas.id == canvas_id))
    canvas = result.scalar_one_or_none()

    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    
    # Permission check or logic if needed (e.g. check creator)
    if canvas.creator_id != current_user.id and current_user.role != "admin": # assuming role exists
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this canvas"
        )

    # --- Validation Logic ---
    symbol_ids = set()
    for obj in content_data.objects:
        if obj.type == CanvasObjectType.SYMBOL:
            symbol_ids.add(obj.fields.symbol_id)
    
    if symbol_ids:
        query = select(TopographicSymbol.id).where(TopographicSymbol.id.in_(symbol_ids))
        result = await session.execute(query)
        existing_ids = set(result.scalars().all())
        
        missing_ids = symbol_ids - existing_ids
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid symbol IDs: {missing_ids}"
            )

    # Save as JSON string
    canvas.content = content_data.model_dump_json()
    await session.commit()
    await session.refresh(canvas)

    return content_data
