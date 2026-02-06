from typing import List
from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from src.models.assignments import Assignment
from src.models.subjects import Subject
from src.models.teachers import Teacher
from src.models.students import Student
from src.models.groups import Group
from src.models.users import UserRole
from src.schemas.assignments import AssignmentCreate, AssignmentRead, AssignmentUpdate

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.post("/", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment_data: AssignmentCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new assignment (teachers and admins only).
    """
    # Verify subject exists
    subject_result = await session.execute(
        select(Subject).where(Subject.id == assignment_data.subject_id)
    )
    if not subject_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subject not found")

    # Get teacher_id from current user if not provided
    teacher_id = assignment_data.teacher_id
    if not teacher_id and current_user.role == UserRole.TEACHER:
        teacher_result = await session.execute(
            select(Teacher).where(Teacher.user_id == current_user.id)
        )
        teacher = teacher_result.scalar_one_or_none()
        if teacher:
            teacher_id = teacher.id
    
    if not teacher_id:
        raise HTTPException(status_code=400, detail="Teacher ID is required")

    # Verify teacher exists
    teacher_result = await session.execute(
        select(Teacher).where(Teacher.id == teacher_id)
    )
    if not teacher_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Teacher not found")

    assignment_dict = assignment_data.model_dump()
    assignment_dict['teacher_id'] = teacher_id
    
    new_assignment = Assignment(**assignment_dict)
    session.add(new_assignment)
    await session.commit()
    await session.refresh(new_assignment)

    # Load relationships
    result = await session.execute(
        select(Assignment)
        .where(Assignment.id == new_assignment.id)
        .options(
            selectinload(Assignment.subject),
            selectinload(Assignment.teacher),
            selectinload(Assignment.group),
        )
    )
    new_assignment = result.scalar_one()

    return AssignmentRead.model_validate(new_assignment)


@router.get("/", response_model=List[AssignmentRead])
async def list_assignments(
    session: SessionDep,
    current_user: CurrentUser,
    subject_id: int = None,
    teacher_id: int = None,
    group_id: int = None,
    published_only: bool = True,
    skip: int = 0,
    limit: int = 100,
):
    """
    List assignments with optional filters.
    Students only see published assignments.
    """
    query = select(Assignment).options(
        selectinload(Assignment.subject),
        selectinload(Assignment.teacher),
        selectinload(Assignment.group),
    )

    if subject_id:
        query = query.where(Assignment.subject_id == subject_id)
    if teacher_id:
        query = query.where(Assignment.teacher_id == teacher_id)
    if group_id:
        query = query.where(Assignment.group_id == group_id)

    # Students can only see published assignments
    if current_user.role == UserRole.STUDENT or published_only:
        query = query.where(Assignment.is_published == True)

    query = query.offset(skip).limit(limit).order_by(Assignment.created_at.desc())

    result = await session.execute(query)
    assignments = result.scalars().all()
    return [AssignmentRead.model_validate(a) for a in assignments]


@router.get("/my", response_model=List[AssignmentRead])
async def get_my_assignments(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 100,
):
    """
    Get assignments for current user's group (students only).
    Teachers get all their assignments.
    """
    query = select(Assignment).options(
        selectinload(Assignment.subject),
        selectinload(Assignment.teacher),
        selectinload(Assignment.group),
    ).where(Assignment.is_published == True)

    if current_user.role == UserRole.STUDENT:
        # Get student's group
        student_result = await session.execute(
            select(Student).where(Student.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            return []
        
        query = query.where(Assignment.group_id == student.group_id)

    elif current_user.role == UserRole.TEACHER:
        # Get teacher's assignments
        teacher_result = await session.execute(
            select(Teacher).where(Teacher.user_id == current_user.id)
        )
        teacher = teacher_result.scalar_one_or_none()
        if not teacher:
            return []
        
        query = query.where(Assignment.teacher_id == teacher.id)

    query = query.order_by(Assignment.due_date.desc()).limit(limit)

    result = await session.execute(query)
    assignments = result.scalars().all()
    return [AssignmentRead.model_validate(a) for a in assignments]


@router.get("/upcoming", response_model=List[AssignmentRead])
async def get_upcoming_assignments(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 10,
):
    """
    Get upcoming assignments with due dates.
    """
    today = date.today()

    query = select(Assignment).options(
        selectinload(Assignment.subject),
        selectinload(Assignment.teacher),
        selectinload(Assignment.group),
    ).where(
        Assignment.is_published == True,
        Assignment.due_date >= today,
    ).order_by(Assignment.due_date).limit(limit)

    result = await session.execute(query)
    assignments = result.scalars().all()
    return [AssignmentRead.model_validate(a) for a in assignments]


@router.get("/{assignment_id}", response_model=AssignmentRead)
async def get_assignment(
    assignment_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get assignment by ID.
    """
    result = await session.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.subject),
            selectinload(Assignment.teacher),
            selectinload(Assignment.group),
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Students can only see published assignments
    if current_user.role == UserRole.STUDENT and not assignment.is_published:
        raise HTTPException(status_code=404, detail="Assignment not found")

    return AssignmentRead.model_validate(assignment)


@router.patch("/{assignment_id}", response_model=AssignmentRead)
async def update_assignment(
    assignment_id: int,
    assignment_update: AssignmentUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update assignment (teachers and admins only).
    """
    result = await session.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.subject),
            selectinload(Assignment.teacher),
            selectinload(Assignment.group),
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = assignment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)

    await session.commit()
    
    # Reload with all relationships after update
    result = await session.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.subject),
            selectinload(Assignment.teacher),
            selectinload(Assignment.group),
        )
    )
    assignment = result.scalar_one()

    return AssignmentRead.model_validate(assignment)


@router.post("/{assignment_id}/publish", response_model=AssignmentRead)
async def publish_assignment(
    assignment_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Publish an assignment (teachers and admins only).
    """
    result = await session.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.subject),
            selectinload(Assignment.teacher),
            selectinload(Assignment.group),
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.is_published = True
    await session.commit()
    
    # Reload with relationships
    result = await session.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.subject),
            selectinload(Assignment.teacher),
            selectinload(Assignment.group),
        )
    )
    assignment = result.scalar_one()

    return AssignmentRead.model_validate(assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete assignment (teachers and admins only).
    """
    result = await session.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await session.delete(assignment)
    await session.commit()




