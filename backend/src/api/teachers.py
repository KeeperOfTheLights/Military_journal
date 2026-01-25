from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from backend.src.api.dependencies import SessionDep, AdminUser, CurrentUser
from backend.src.models.users import User, UserRole
from backend.src.models.teachers import Teacher
from backend.src.schemas.teachers import TeacherCreate, TeacherRead, TeacherUpdate
from backend.src.security import hash_password

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.post("/", response_model=TeacherRead, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    teacher_data: TeacherCreate,
    session: SessionDep,
    current_user: AdminUser,
):
    """
    Create a new teacher with user account (admin only).
    """
    # Check if email already exists
    result = await session.execute(
        select(User).where(User.email == teacher_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    try:
        # Create user account
        new_user = User(
            email=teacher_data.email.lower(),
            password_hash=hash_password(teacher_data.password),
            role=UserRole.TEACHER,
        )
        session.add(new_user)
        await session.flush()

        # Create teacher profile
        teacher_dict = teacher_data.model_dump(exclude={"email", "password"})
        new_teacher = Teacher(user_id=new_user.id, **teacher_dict)
        session.add(new_teacher)

        await session.commit()
        await session.refresh(new_teacher)

        return TeacherRead.model_validate(new_teacher)

    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create teacher"
        )


@router.get("/", response_model=List[TeacherRead])
async def list_teachers(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all teachers.
    """
    query = select(Teacher).offset(skip).limit(limit).order_by(Teacher.last_name)
    result = await session.execute(query)
    teachers = result.scalars().all()
    return [TeacherRead.model_validate(t) for t in teachers]


@router.get("/{teacher_id}", response_model=TeacherRead)
async def get_teacher(
    teacher_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get teacher by ID.
    """
    result = await session.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )

    return TeacherRead.model_validate(teacher)


@router.get("/me/profile", response_model=TeacherRead)
async def get_my_teacher_profile(
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get current user's teacher profile.
    """
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a teacher"
        )

    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found"
        )

    return TeacherRead.model_validate(teacher)


@router.patch("/{teacher_id}", response_model=TeacherRead)
async def update_teacher(
    teacher_id: int,
    teacher_update: TeacherUpdate,
    session: SessionDep,
    current_user: AdminUser,
):
    """
    Update teacher information (admin only).
    """
    result = await session.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )

    update_data = teacher_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(teacher, field, value)

    await session.commit()
    await session.refresh(teacher)

    return TeacherRead.model_validate(teacher)


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    teacher_id: int,
    session: SessionDep,
    current_user: AdminUser,
):
    """
    Delete a teacher (admin only).
    """
    result = await session.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )

    # Deactivate user account
    user_result = await session.execute(select(User).where(User.id == teacher.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.is_active = False

    await session.delete(teacher)
    await session.commit()








