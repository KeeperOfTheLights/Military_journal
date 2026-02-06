from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from src.models.users import User, UserRole
from src.models.students import Student
from src.models.groups import Group
from src.schemas.students import StudentCreate, StudentRead, StudentUpdate
from src.security import hash_password

router = APIRouter(prefix="/students", tags=["Students"])


@router.post("/", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new student with user account (teachers and admins only).
    """
    # Check if email already exists
    result = await session.execute(
        select(User).where(User.email == student_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if group exists
    group_result = await session.execute(
        select(Group).where(Group.id == student_data.group_id)
    )
    if not group_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    try:
        # Create user account
        new_user = User(
            email=student_data.email.lower(),
            password_hash=hash_password(student_data.password),
            role=UserRole.STUDENT,
        )
        session.add(new_user)
        await session.flush()  # Get user ID

        # Create student profile
        student_dict = student_data.model_dump(exclude={"email", "password"})
        new_student = Student(user_id=new_user.id, **student_dict)
        session.add(new_student)

        await session.commit()
        await session.refresh(new_student)

        # Load group relationship
        result = await session.execute(
            select(Student)
            .where(Student.id == new_student.id)
            .options(selectinload(Student.group))
        )
        new_student = result.scalar_one()

        return StudentRead.model_validate(new_student)

    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create student"
        )


@router.get("/", response_model=List[StudentRead])
async def list_students(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: int = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    List all students.
    """
    query = select(Student).options(selectinload(Student.group))

    if group_id:
        query = query.where(Student.group_id == group_id)

    query = query.offset(skip).limit(limit).order_by(Student.last_name)

    result = await session.execute(query)
    students = result.scalars().all()
    return [StudentRead.model_validate(s) for s in students]


@router.get("/{student_id}", response_model=StudentRead)
async def get_student(
    student_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get student by ID.
    """
    result = await session.execute(
        select(Student)
        .where(Student.id == student_id)
        .options(selectinload(Student.group))
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    return StudentRead.model_validate(student)


@router.get("/me/profile", response_model=StudentRead)
async def get_my_student_profile(
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get current user's student profile.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a student"
        )

    result = await session.execute(
        select(Student)
        .where(Student.user_id == current_user.id)
        .options(selectinload(Student.group))
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )

    return StudentRead.model_validate(student)


@router.patch("/{student_id}", response_model=StudentRead)
async def update_student(
    student_id: int,
    student_update: StudentUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update student information (teachers and admins only).
    """
    result = await session.execute(
        select(Student)
        .where(Student.id == student_id)
        .options(selectinload(Student.group))
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    update_data = student_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    await session.commit()
    await session.refresh(student)

    return StudentRead.model_validate(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete a student (teachers and admins only).
    """
    result = await session.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Deactivate user account instead of deleting
    user_result = await session.execute(select(User).where(User.id == student.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.is_active = False

    await session.delete(student)
    await session.commit()








