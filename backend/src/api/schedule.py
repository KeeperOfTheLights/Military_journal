from typing import List
from datetime import date
from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.schedule import Schedule, DayOfWeek
from backend.src.models.groups import Group
from backend.src.models.subjects import Subject
from backend.src.models.teachers import Teacher
from backend.src.models.users import UserRole
from backend.src.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate

router = APIRouter(prefix="/schedule", tags=["Schedule"])


@router.post("/", response_model=ScheduleRead, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: ScheduleCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new schedule entry (teachers and admins only).
    """
    # Verify group exists
    group_result = await session.execute(
        select(Group).where(Group.id == schedule_data.group_id)
    )
    if not group_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify subject exists
    subject_result = await session.execute(
        select(Subject).where(Subject.id == schedule_data.subject_id)
    )
    if not subject_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subject not found")

    # Verify teacher exists
    teacher_result = await session.execute(
        select(Teacher).where(Teacher.id == schedule_data.teacher_id)
    )
    if not teacher_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Check for time conflicts
    conflict_result = await session.execute(
        select(Schedule).where(
            and_(
                Schedule.group_id == schedule_data.group_id,
                Schedule.day_of_week == schedule_data.day_of_week,
                Schedule.academic_year == schedule_data.academic_year,
                Schedule.semester == schedule_data.semester,
                Schedule.is_active == True,
                # Time overlap check
                Schedule.start_time < schedule_data.end_time,
                Schedule.end_time > schedule_data.start_time,
            )
        )
    )
    if conflict_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Schedule conflict: this time slot is already occupied"
        )

    new_schedule = Schedule(**schedule_data.model_dump())
    session.add(new_schedule)
    await session.commit()
    await session.refresh(new_schedule)

    # Load relationships
    result = await session.execute(
        select(Schedule)
        .where(Schedule.id == new_schedule.id)
        .options(
            selectinload(Schedule.group),
            selectinload(Schedule.subject),
            selectinload(Schedule.teacher),
        )
    )
    new_schedule = result.scalar_one()

    return ScheduleRead.model_validate(new_schedule)


@router.get("/", response_model=List[ScheduleRead])
async def list_schedules(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: int = None,
    teacher_id: int = None,
    subject_id: int = None,
    day_of_week: DayOfWeek = None,
    academic_year: str = None,
    semester: int = None,
    active_only: bool = True,
):
    """
    List schedules with optional filters.
    """
    query = select(Schedule).options(
        selectinload(Schedule.group),
        selectinload(Schedule.subject),
        selectinload(Schedule.teacher),
    )

    if group_id:
        query = query.where(Schedule.group_id == group_id)
    if teacher_id:
        query = query.where(Schedule.teacher_id == teacher_id)
    if subject_id:
        query = query.where(Schedule.subject_id == subject_id)
    if day_of_week:
        query = query.where(Schedule.day_of_week == day_of_week)
    if academic_year:
        query = query.where(Schedule.academic_year == academic_year)
    if semester:
        query = query.where(Schedule.semester == semester)
    if active_only:
        query = query.where(Schedule.is_active == True)

    query = query.order_by(Schedule.day_of_week, Schedule.start_time)

    result = await session.execute(query)
    schedules = result.scalars().all()
    return [ScheduleRead.model_validate(s) for s in schedules]


@router.get("/group/{group_id}", response_model=List[ScheduleRead])
async def get_schedule_by_group(
    group_id: int,
    session: SessionDep,
    current_user: CurrentUser,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get schedule for a specific group.
    """
    query = select(Schedule).options(
        selectinload(Schedule.group),
        selectinload(Schedule.subject),
        selectinload(Schedule.teacher),
    ).where(
        Schedule.group_id == group_id,
        Schedule.is_active == True
    )

    if academic_year:
        query = query.where(Schedule.academic_year == academic_year)
    if semester:
        query = query.where(Schedule.semester == semester)

    query = query.order_by(Schedule.day_of_week, Schedule.start_time)

    result = await session.execute(query)
    schedules = result.scalars().all()
    return [ScheduleRead.model_validate(s) for s in schedules]


@router.get("/my", response_model=List[ScheduleRead])
async def get_my_schedule(
    session: SessionDep,
    current_user: CurrentUser,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get schedule for current user (student or teacher).
    """
    query = select(Schedule).options(
        selectinload(Schedule.group),
        selectinload(Schedule.subject),
        selectinload(Schedule.teacher),
    ).where(Schedule.is_active == True)

    if current_user.role == UserRole.STUDENT:
        # Get student's group schedule
        from backend.src.models.students import Student
        student_result = await session.execute(
            select(Student).where(Student.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        query = query.where(Schedule.group_id == student.group_id)

    elif current_user.role == UserRole.TEACHER:
        # Get teacher's schedule
        teacher_result = await session.execute(
            select(Teacher).where(Teacher.user_id == current_user.id)
        )
        teacher = teacher_result.scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        query = query.where(Schedule.teacher_id == teacher.id)

    if academic_year:
        query = query.where(Schedule.academic_year == academic_year)
    if semester:
        query = query.where(Schedule.semester == semester)

    query = query.order_by(Schedule.day_of_week, Schedule.start_time)

    result = await session.execute(query)
    schedules = result.scalars().all()
    return [ScheduleRead.model_validate(s) for s in schedules]


@router.get("/{schedule_id}", response_model=ScheduleRead)
async def get_schedule(
    schedule_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get schedule by ID.
    """
    result = await session.execute(
        select(Schedule)
        .where(Schedule.id == schedule_id)
        .options(
            selectinload(Schedule.group),
            selectinload(Schedule.subject),
            selectinload(Schedule.teacher),
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    return ScheduleRead.model_validate(schedule)


@router.patch("/{schedule_id}", response_model=ScheduleRead)
async def update_schedule(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update schedule (teachers and admins only).
    """
    result = await session.execute(
        select(Schedule)
        .where(Schedule.id == schedule_id)
        .options(
            selectinload(Schedule.group),
            selectinload(Schedule.subject),
            selectinload(Schedule.teacher),
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = schedule_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    await session.commit()
    await session.refresh(schedule)

    return ScheduleRead.model_validate(schedule)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete schedule (teachers and admins only).
    """
    result = await session.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await session.delete(schedule)
    await session.commit()




