from typing import List
from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.attendance import Attendance, AttendanceStatus
from backend.src.models.schedule import Schedule
from backend.src.models.students import Student
from backend.src.models.users import UserRole
from backend.src.schemas.attendance import (
    AttendanceCreate,
    AttendanceRead,
    AttendanceUpdate,
    AttendanceBulkCreate,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
async def create_attendance(
    attendance_data: AttendanceCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Mark attendance for a single student (teachers and admins only).
    """
    # Verify student exists
    student_result = await session.execute(
        select(Student).where(Student.id == attendance_data.student_id)
    )
    if not student_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify schedule exists
    schedule_result = await session.execute(
        select(Schedule).where(Schedule.id == attendance_data.schedule_id)
    )
    if not schedule_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Check if attendance already marked
    existing = await session.execute(
        select(Attendance).where(
            and_(
                Attendance.student_id == attendance_data.student_id,
                Attendance.schedule_id == attendance_data.schedule_id,
                Attendance.date == attendance_data.date,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already marked for this student on this date"
        )

    new_attendance = Attendance(**attendance_data.model_dump())
    session.add(new_attendance)
    await session.commit()
    await session.refresh(new_attendance)

    return AttendanceRead.model_validate(new_attendance)


@router.post("/bulk", response_model=List[AttendanceRead], status_code=status.HTTP_201_CREATED)
async def create_bulk_attendance(
    bulk_data: AttendanceBulkCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Mark attendance for multiple students at once (teachers and admins only).
    """
    # Verify schedule exists
    schedule_result = await session.execute(
        select(Schedule).where(Schedule.id == bulk_data.schedule_id)
    )
    schedule = schedule_result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    created_records = []

    for record in bulk_data.records:
        # Check if already exists
        existing = await session.execute(
            select(Attendance).where(
                and_(
                    Attendance.student_id == record.student_id,
                    Attendance.schedule_id == bulk_data.schedule_id,
                    Attendance.date == bulk_data.date,
                )
            )
        )
        if existing.scalar_one_or_none():
            continue  # Skip if already marked

        new_attendance = Attendance(
            student_id=record.student_id,
            schedule_id=bulk_data.schedule_id,
            date=bulk_data.date,
            status=record.status,
            reason=record.reason,
        )
        session.add(new_attendance)
        created_records.append(new_attendance)

    await session.commit()

    # Refresh all records
    for record in created_records:
        await session.refresh(record)

    return [AttendanceRead.model_validate(r) for r in created_records]


@router.get("/", response_model=List[AttendanceRead])
async def list_attendance(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: int = None,
    schedule_id: int = None,
    group_id: int = None,
    date_from: date = None,
    date_to: date = None,
    status_filter: AttendanceStatus = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    List attendance records with optional filters.
    """
    query = select(Attendance).options(selectinload(Attendance.student))

    if student_id:
        query = query.where(Attendance.student_id == student_id)
    if schedule_id:
        query = query.where(Attendance.schedule_id == schedule_id)
    if group_id:
        query = query.join(Student).where(Student.group_id == group_id)
    if date_from:
        query = query.where(Attendance.date >= date_from)
    if date_to:
        query = query.where(Attendance.date <= date_to)
    if status_filter:
        query = query.where(Attendance.status == status_filter)

    query = query.offset(skip).limit(limit).order_by(Attendance.date.desc())

    result = await session.execute(query)
    attendances = result.scalars().all()
    return [AttendanceRead.model_validate(a) for a in attendances]


@router.get("/my", response_model=List[AttendanceRead])
async def get_my_attendance(
    session: SessionDep,
    current_user: CurrentUser,
    date_from: date = None,
    date_to: date = None,
):
    """
    Get current user's attendance records (for students).
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is for students only"
        )

    # Get student profile
    student_result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    query = select(Attendance).where(Attendance.student_id == student.id)

    if date_from:
        query = query.where(Attendance.date >= date_from)
    if date_to:
        query = query.where(Attendance.date <= date_to)

    query = query.order_by(Attendance.date.desc())

    result = await session.execute(query)
    attendances = result.scalars().all()
    return [AttendanceRead.model_validate(a) for a in attendances]


@router.get("/stats/student/{student_id}")
async def get_student_attendance_stats(
    student_id: int,
    session: SessionDep,
    current_user: CurrentUser,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get attendance statistics for a student.
    """
    query = select(
        Attendance.status,
        func.count(Attendance.id).label("count")
    ).where(Attendance.student_id == student_id)

    if academic_year or semester:
        query = query.join(Schedule)
        if academic_year:
            query = query.where(Schedule.academic_year == academic_year)
        if semester:
            query = query.where(Schedule.semester == semester)

    query = query.group_by(Attendance.status)

    result = await session.execute(query)
    stats = result.all()

    # Calculate totals
    total = sum(s.count for s in stats)
    stats_dict = {s.status.value: s.count for s in stats}

    present = stats_dict.get("present", 0)
    absent = stats_dict.get("absent", 0)
    late = stats_dict.get("late", 0)
    excused = stats_dict.get("excused", 0)

    attendance_rate = (present + late) / total * 100 if total > 0 else 0

    return {
        "total_classes": total,
        "present": present,
        "absent": absent,
        "late": late,
        "excused": excused,
        "attendance_rate": round(attendance_rate, 2),
    }


@router.get("/{attendance_id}", response_model=AttendanceRead)
async def get_attendance(
    attendance_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get attendance record by ID.
    """
    result = await session.execute(
        select(Attendance)
        .where(Attendance.id == attendance_id)
        .options(selectinload(Attendance.student))
    )
    attendance = result.scalar_one_or_none()

    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    return AttendanceRead.model_validate(attendance)


@router.patch("/{attendance_id}", response_model=AttendanceRead)
async def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update attendance record (teachers and admins only).
    """
    result = await session.execute(
        select(Attendance)
        .where(Attendance.id == attendance_id)
        .options(selectinload(Attendance.student))
    )
    attendance = result.scalar_one_or_none()

    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    update_data = attendance_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(attendance, field, value)

    await session.commit()
    await session.refresh(attendance)

    return AttendanceRead.model_validate(attendance)


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    attendance_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete attendance record (teachers and admins only).
    """
    result = await session.execute(
        select(Attendance).where(Attendance.id == attendance_id)
    )
    attendance = result.scalar_one_or_none()

    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    await session.delete(attendance)
    await session.commit()








