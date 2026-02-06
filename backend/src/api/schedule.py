from typing import List
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from src.models.schedule import Schedule
from src.models.groups import Group
from src.models.subjects import Subject
from src.models.teachers import Teacher
from src.models.users import UserRole
from src.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate, MonthlyScheduleCreate

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

    # Check for time conflicts on the same date
    conflict_result = await session.execute(
        select(Schedule).where(
            and_(
                Schedule.group_id == schedule_data.group_id,
                Schedule.specific_date == schedule_data.specific_date,
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
    if academic_year:
        query = query.where(Schedule.academic_year == academic_year)
    if semester:
        query = query.where(Schedule.semester == semester)
    if active_only:
        query = query.where(Schedule.is_active == True)

    query = query.order_by(Schedule.specific_date, Schedule.start_time)

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

    query = query.order_by(Schedule.specific_date, Schedule.start_time)

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
        from models.students import Student
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

    query = query.order_by(Schedule.specific_date, Schedule.start_time)

    result = await session.execute(query)
    schedules = result.scalars().all()
    return [ScheduleRead.model_validate(s) for s in schedules]


@router.get("/by-date-range", response_model=List[ScheduleRead])
async def get_schedule_by_date_range(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: int = Query(...),
    date_from: str = Query(...),
    date_to: str = Query(...),
):
    """
    Get schedule for a specific date range (for calendar view).
    Returns only specific date schedules (no templates).
    """
    # Parse date strings
    from datetime import datetime
    try:
        date_from_parsed = datetime.strptime(date_from, "%Y-%m-%d").date()
        date_to_parsed = datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    query = select(Schedule).options(
        selectinload(Schedule.group),
        selectinload(Schedule.subject),
        selectinload(Schedule.teacher),
    ).where(
        Schedule.group_id == group_id,
        Schedule.is_active == True,
        Schedule.specific_date >= date_from_parsed,
        Schedule.specific_date <= date_to_parsed
    ).order_by(Schedule.specific_date, Schedule.start_time)

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


@router.post("/copy-week")
async def copy_week_schedule(
    session: SessionDep,
    current_user: TeacherUser,
    source_date: date,
    target_date: date,
    group_id: int,
):
    """
    Copy schedule from one week to another.
    """
    # Get source week schedules
    source_week_start = source_date - timedelta(days=source_date.weekday())
    source_week_end = source_week_start + timedelta(days=6)
    
    source_schedules_result = await session.execute(
        select(Schedule).where(
            and_(
                Schedule.group_id == group_id,
                Schedule.specific_date >= source_week_start,
                Schedule.specific_date <= source_week_end,
                Schedule.is_active == True
            )
        )
    )
    source_schedules = source_schedules_result.scalars().all()
    
    if not source_schedules:
        raise HTTPException(status_code=404, detail="No schedules found in source week")
    
    # Calculate day offset
    target_week_start = target_date - timedelta(days=target_date.weekday())
    day_offset = (target_week_start - source_week_start).days
    
    created_count = 0
    for source in source_schedules:
        new_date = source.specific_date + timedelta(days=day_offset)
        
        # Check if schedule already exists
        existing_result = await session.execute(
            select(Schedule).where(
                and_(
                    Schedule.group_id == group_id,
                    Schedule.specific_date == new_date,
                    Schedule.start_time == source.start_time,
                    Schedule.is_active == True
                )
            )
        )
        
        if existing_result.scalar_one_or_none():
            continue
        
        # Create new schedule
        new_schedule = Schedule(
            group_id=source.group_id,
            subject_id=source.subject_id,
            teacher_id=source.teacher_id,
            specific_date=new_date,
            start_time=source.start_time,
            end_time=source.end_time,
            room=source.room,
            semester=source.semester,
            academic_year=source.academic_year,
            is_active=True
        )
        session.add(new_schedule)
        created_count += 1
    
    await session.commit()
    
    return {
        "message": "Week schedule copied successfully",
        "created": created_count,
        "source_week": source_week_start.isoformat(),
        "target_week": target_week_start.isoformat()
    }


@router.post("/create-monthly")
async def create_monthly_schedule(
    session: SessionDep,
    current_user: TeacherUser,
    monthly_data: MonthlyScheduleCreate,
):
    """
    Create schedule for a specific month.
    Allows specifying all lessons for the entire month at once.
    """
    # Verify group exists
    group_result = await session.execute(select(Group).where(Group.id == monthly_data.group_id))
    if not group_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"Group {monthly_data.group_id} not found")
    
    created_count = 0
    skipped_count = 0
    errors = []
    
    for item in monthly_data.schedule_items:
        # Verify date is in the specified month
        if item.specific_date.year != monthly_data.year or item.specific_date.month != monthly_data.month:
            errors.append(f"Date {item.specific_date} is not in {monthly_data.year}-{monthly_data.month:02d}")
            continue
        
        # Check if schedule already exists for this date/time
        existing_result = await session.execute(
            select(Schedule).where(
                and_(
                    Schedule.group_id == monthly_data.group_id,
                    Schedule.specific_date == item.specific_date,
                    Schedule.start_time == item.start_time,
                    Schedule.is_active == True
                )
            )
        )
        
        if existing_result.scalar_one_or_none():
            skipped_count += 1
            continue
        
        # Verify subject and teacher exist
        subject_result = await session.execute(select(Subject).where(Subject.id == item.subject_id))
        teacher_result = await session.execute(select(Teacher).where(Teacher.id == item.teacher_id))
        
        if not subject_result.scalar_one_or_none():
            errors.append(f"Subject {item.subject_id} not found")
            continue
        if not teacher_result.scalar_one_or_none():
            errors.append(f"Teacher {item.teacher_id} not found")
            continue
        
        # Create schedule entry
        new_schedule = Schedule(
            group_id=monthly_data.group_id,
            subject_id=item.subject_id,
            teacher_id=item.teacher_id,
            specific_date=item.specific_date,
            start_time=item.start_time,
            end_time=item.end_time,
            room=item.room,
            semester=monthly_data.semester,
            academic_year=monthly_data.academic_year,
            is_active=True
        )
        session.add(new_schedule)
        created_count += 1
    
    await session.commit()
    
    return {
        "message": "Monthly schedule created successfully",
        "created": created_count,
        "skipped": skipped_count,
        "errors": errors if errors else None,
        "month": f"{monthly_data.year}-{monthly_data.month:02d}",
    }




