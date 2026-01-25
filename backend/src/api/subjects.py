from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.subjects import Subject
from backend.src.schemas.subjects import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.post("/", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_data: SubjectCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new subject (teachers and admins only).
    """
    # Check if subject code already exists
    result = await session.execute(
        select(Subject).where(Subject.code == subject_data.code)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject with this code already exists"
        )

    new_subject = Subject(**subject_data.model_dump())
    session.add(new_subject)
    await session.commit()
    await session.refresh(new_subject)

    return SubjectRead.model_validate(new_subject)


@router.get("/", response_model=List[SubjectRead])
async def list_subjects(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all subjects.
    """
    query = select(Subject).offset(skip).limit(limit).order_by(Subject.name)
    result = await session.execute(query)
    subjects = result.scalars().all()
    return [SubjectRead.model_validate(s) for s in subjects]


@router.get("/{subject_id}", response_model=SubjectRead)
async def get_subject(subject_id: int, session: SessionDep, current_user: CurrentUser):
    """
    Get subject by ID.
    """
    result = await session.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    return SubjectRead.model_validate(subject)


@router.patch("/{subject_id}", response_model=SubjectRead)
async def update_subject(
    subject_id: int,
    subject_update: SubjectUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update subject information (teachers and admins only).
    """
    result = await session.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    update_data = subject_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subject, field, value)

    await session.commit()
    await session.refresh(subject)

    return SubjectRead.model_validate(subject)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete a subject (teachers and admins only).
    """
    result = await session.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    await session.delete(subject)
    await session.commit()








