from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.groups import Group
from backend.src.models.students import Student
from backend.src.schemas.groups import GroupCreate, GroupRead, GroupUpdate
from backend.src.schemas.students import StudentRead

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new student group (teachers and admins only).
    """
    # Check if group name already exists
    result = await session.execute(
        select(Group).where(Group.name == group_data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group with this name already exists"
        )

    new_group = Group(**group_data.model_dump())
    session.add(new_group)
    await session.commit()
    await session.refresh(new_group)

    return GroupRead.model_validate(new_group)


@router.get("/", response_model=List[GroupRead])
async def list_groups(
    session: SessionDep,
    course: int = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all groups (public endpoint for registration).
    """
    query = select(Group)
    if course:
        query = query.where(Group.course == course)
    query = query.offset(skip).limit(limit).order_by(Group.name)

    result = await session.execute(query)
    groups = result.scalars().all()
    return [GroupRead.model_validate(g) for g in groups]


@router.get("/{group_id}", response_model=GroupRead)
async def get_group(group_id: int, session: SessionDep, current_user: CurrentUser):
    """
    Get group by ID.
    """
    result = await session.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    return GroupRead.model_validate(group)


@router.get("/{group_id}/students", response_model=List[StudentRead])
async def get_group_students(
    group_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get all students in a group.
    """
    result = await session.execute(
        select(Student)
        .where(Student.group_id == group_id)
        .options(selectinload(Student.group))
        .order_by(Student.last_name)
    )
    students = result.scalars().all()
    return [StudentRead.model_validate(s) for s in students]


@router.patch("/{group_id}", response_model=GroupRead)
async def update_group(
    group_id: int,
    group_update: GroupUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update group information (teachers and admins only).
    """
    result = await session.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    update_data = group_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)

    await session.commit()
    await session.refresh(group)

    return GroupRead.model_validate(group)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete a group (teachers and admins only).
    """
    result = await session.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Check if group has students
    students_result = await session.execute(
        select(Student).where(Student.group_id == group_id).limit(1)
    )
    if students_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete group with students. Move or remove students first."
        )

    await session.delete(group)
    await session.commit()



