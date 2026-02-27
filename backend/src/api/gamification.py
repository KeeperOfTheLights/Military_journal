from typing import List, Annotated
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.dependencies import SessionDep, CurrentUser, TeacherUser
from src.models.gamification import MapBoard, TopographicSymbol, SymbolRenderType
from src.models.attachments import Attachment, AttachmentEntity
from src.schemas.gamification import (
    MapBoardCreate, MapBoardRead, MapBoardUpdate,
    TopographicSymbolCreate, TopographicSymbolUpdate, TopographicSymbolRead
)
from src.models.canvas import Canvas
from src.storage import Storage, get_storage, StoredFile

router = APIRouter(prefix="/gamification", tags=["Gamification"])
StorageDep = Annotated[Storage, Depends(get_storage)]


# --- Map Board Endpoints ---

@router.post("/map-boards", response_model=MapBoardRead, status_code=status.HTTP_201_CREATED)
async def create_map_board(
    map_board_data: MapBoardCreate,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Create a new map board.
    """
    # Verify canvas exists
    canvas = await session.get(Canvas, map_board_data.canvas_id)
    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )

    new_map_board = MapBoard(
        name=map_board_data.name,
        canvas_id=map_board_data.canvas_id
    )
    
    # Add symbols
    if map_board_data.symbol_ids:
        symbols_result = await session.execute(
            select(TopographicSymbol).where(TopographicSymbol.id.in_(map_board_data.symbol_ids))
        )
        symbols = symbols_result.scalars().all()
        new_map_board.symbols = symbols

    session.add(new_map_board)
    await session.commit()
    await session.refresh(new_map_board)
    
    # Eager load symbols for response
    result = await session.execute(
        select(MapBoard)
        .where(MapBoard.id == new_map_board.id)
        .options(selectinload(MapBoard.symbols))
    )
    return MapBoardRead.model_validate(result.scalar_one())


@router.get("/map-boards", response_model=List[MapBoardRead])
async def list_map_boards(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all map boards.
    """
    query = (
        select(MapBoard)
        .options(selectinload(MapBoard.symbols))
        .offset(skip).limit(limit).order_by(MapBoard.name)
    )
    result = await session.execute(query)
    map_boards = result.scalars().all()
    return [MapBoardRead.model_validate(mb) for mb in map_boards]


@router.get("/map-boards/{map_board_id}", response_model=MapBoardRead)
async def get_map_board(
    map_board_id: int,
    session: SessionDep,
    current_user: CurrentUser
):
    """
    Get map board by ID.
    """
    result = await session.execute(
        select(MapBoard)
        .where(MapBoard.id == map_board_id)
        .options(selectinload(MapBoard.symbols))
    )
    map_board = result.scalar_one_or_none()

    if not map_board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Map Board not found"
        )

    return MapBoardRead.model_validate(map_board)


@router.put("/map-boards/{map_board_id}", response_model=MapBoardRead)
async def update_map_board(
    map_board_id: int,
    map_board_update: MapBoardUpdate,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Update map board.
    """
    result = await session.execute(
        select(MapBoard)
        .where(MapBoard.id == map_board_id)
        .options(selectinload(MapBoard.symbols))
    )
    map_board = result.scalar_one_or_none()

    if not map_board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Map Board not found"
        )

    if map_board_update.name is not None:
        map_board.name = map_board_update.name
    if map_board_update.canvas_id is not None:
         # Verify canvas exists
        canvas = await session.get(Canvas, map_board_update.canvas_id)
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        map_board.canvas_id = map_board_update.canvas_id
        
    if map_board_update.symbol_ids is not None:
        symbols_result = await session.execute(
            select(TopographicSymbol).where(TopographicSymbol.id.in_(map_board_update.symbol_ids))
        )
        symbols = symbols_result.scalars().all()
        map_board.symbols = symbols

    await session.commit()
    await session.refresh(map_board)

    return MapBoardRead.model_validate(map_board)


@router.delete("/map-boards/{map_board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_map_board(
    map_board_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Delete a map board.
    """
    map_board = await session.get(MapBoard, map_board_id)
    if not map_board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Map Board not found"
        )
    
    await session.delete(map_board)
    await session.commit()


# --- Topographic Symbol Endpoints ---

@router.get("/symbols", response_model=List[TopographicSymbolRead])
async def list_symbols(
    session: SessionDep,
    storage: StorageDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all topographic symbols.
    """
    # Eager load attachment and thumbnail
    query = (
        select(TopographicSymbol)
        .options(
            selectinload(TopographicSymbol.attachment),
            selectinload(TopographicSymbol.thumbnail_attachment)
        )
        .offset(skip)
        .limit(limit)
        .order_by(TopographicSymbol.name)
    )
    result = await session.execute(query)
    symbols = result.scalars().all()
    
    # Map to read model and populate attachment URLs
    response = []
    for symbol in symbols:
        schema = TopographicSymbolRead.model_validate(symbol)
        if schema.attachment and not schema.attachment.url:
            schema.attachment.url = storage.get_url(symbol.attachment.storage_key)
        if schema.thumbnail_attachment and not schema.thumbnail_attachment.url:
            schema.thumbnail_attachment.url = storage.get_url(symbol.thumbnail_attachment.storage_key)
        response.append(schema)
        
    return response


@router.post("/symbols", response_model=TopographicSymbolRead, status_code=status.HTTP_201_CREATED)
async def create_symbol(
    symbol_data: TopographicSymbolCreate,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Create a new symbol (JSON).
    Use this for EDITOR type symbols.
    """
    new_symbol = TopographicSymbol(**symbol_data.model_dump())
    session.add(new_symbol)
    await session.commit()
    await session.refresh(new_symbol)
    return TopographicSymbolRead.model_validate(new_symbol)


@router.post("/symbols/upload", response_model=TopographicSymbolRead, status_code=status.HTTP_201_CREATED)
async def upload_symbol(
    session: SessionDep,
    storage: StorageDep,
    current_user: CurrentUser,
    file: UploadFile = File(..., description="Symbol image file"),
    name: str = "New Symbol",
    description: str | None = None,
):
    """Upload a symbol image with linked attachment."""
    # Save file to storage
    stored: StoredFile = await storage.save(
        file=file.file,
        filename=file.filename,
        content_type=file.content_type,
        folder="symbols",
    )
    
    # Create symbol
    new_symbol = TopographicSymbol(
        name=name,
        description=description,
        render_type=SymbolRenderType.FILE,
    )
    session.add(new_symbol)
    await session.flush()
    
    # Create attachment linked to symbol
    attachment = Attachment(
        entity_type=AttachmentEntity.SYMBOL,
        entity_id=new_symbol.id,
        original_filename=stored.original_filename,
        storage_key=stored.key,
        content_type=stored.content_type,
        file_size=stored.size,
        checksum=stored.checksum,
        storage_backend=stored.storage_backend,
        attachment_type=Attachment.determine_type(stored.content_type, stored.original_filename),
        title=name,
        uploaded_by_id=current_user.id,
        url=stored.url,
    )
    session.add(attachment)
    await session.flush()
    
    new_symbol.attachment_id = attachment.id
    
    await session.commit()
    await session.refresh(new_symbol, attribute_names=["attachment", "thumbnail_attachment"])
    
    return TopographicSymbolRead.model_validate(new_symbol)


@router.get("/symbols/{symbol_id}", response_model=TopographicSymbolRead)
async def get_symbol(
    symbol_id: int,
    session: SessionDep,
    storage: StorageDep,
    current_user: CurrentUser
):
    """
    Get topographic symbol by ID.
    """
    query = (
        select(TopographicSymbol)
        .where(TopographicSymbol.id == symbol_id)
        .options(
            selectinload(TopographicSymbol.attachment),
            selectinload(TopographicSymbol.thumbnail_attachment)
        )
    )
    result = await session.execute(query)
    symbol = result.scalar_one_or_none()

    if not symbol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symbol not found"
        )

    schema = TopographicSymbolRead.model_validate(symbol)
    if schema.attachment and not schema.attachment.url:
        schema.attachment.url = storage.get_url(symbol.attachment.storage_key)
    if schema.thumbnail_attachment and not schema.thumbnail_attachment.url:
        schema.thumbnail_attachment.url = storage.get_url(symbol.thumbnail_attachment.storage_key)

    return schema


@router.put("/symbols/{symbol_id}", response_model=TopographicSymbolRead)
async def update_symbol(
    symbol_id: int,
    symbol_update: TopographicSymbolUpdate,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Update topographic symbol.
    """
    symbol = await session.get(TopographicSymbol, symbol_id)

    if not symbol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symbol not found"
        )

    update_data = symbol_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(symbol, key, value)

    await session.commit()
    await session.refresh(symbol, attribute_names=["attachment", "thumbnail_attachment"])

    return TopographicSymbolRead.model_validate(symbol)


@router.delete("/symbols/{symbol_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_symbol(
    symbol_id: int,
    session: SessionDep,
    storage: StorageDep,
    current_user: CurrentUser,
):
    """Delete a symbol and its associated attachments and storage files."""
    symbol = await session.get(
        TopographicSymbol,
        symbol_id,
        options=[
            selectinload(TopographicSymbol.attachment),
            selectinload(TopographicSymbol.thumbnail_attachment),
        ],
    )
    if not symbol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Symbol not found")
    
    # Collect attachments to clean up
    attachments = [a for a in [symbol.attachment, symbol.thumbnail_attachment] if a]
    
    # Unlink before deleting
    symbol.attachment_id = None
    symbol.thumbnail_attachment_id = None
    await session.flush()
    
    # Delete storage files and attachment records
    for attachment in attachments:
        try:
            await storage.delete(attachment.storage_key)
        except Exception:
            pass  # File may already be gone
        await session.delete(attachment)
    
    await session.delete(symbol)
    await session.commit()

