from typing import List
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.disciplinary import DisciplinaryRecord, ViolationType, SeverityLevel
from backend.src.models.students import Student
from backend.src.models.groups import Group
from backend.src.models.teachers import Teacher
from backend.src.models.users import UserRole
from backend.src.schemas.disciplinary import DisciplinaryCreate, DisciplinaryRead, DisciplinaryUpdate

router = APIRouter(prefix="/disciplinary", tags=["Disciplinary Records"])


def generate_report_number() -> str:
    """Generate a unique report number."""
    now = datetime.now()
    return f"RPT-{now.strftime('%Y%m%d%H%M%S')}"


@router.post("/", response_model=DisciplinaryRead, status_code=status.HTTP_201_CREATED)
async def create_disciplinary_record(
    record_data: DisciplinaryCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new disciplinary record (teachers and admins only).
    """
    # Verify student exists
    student_result = await session.execute(
        select(Student).where(Student.id == record_data.student_id)
    )
    if not student_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify teacher exists
    teacher_result = await session.execute(
        select(Teacher).where(Teacher.id == record_data.reported_by_id)
    )
    if not teacher_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Create record with auto-generated report number
    new_record = DisciplinaryRecord(
        **record_data.model_dump(),
        report_number=generate_report_number(),
    )
    session.add(new_record)
    await session.commit()
    await session.refresh(new_record)

    # Load relationships including nested ones
    result = await session.execute(
        select(DisciplinaryRecord)
        .where(DisciplinaryRecord.id == new_record.id)
        .options(
            selectinload(DisciplinaryRecord.student).selectinload(Student.group),
            selectinload(DisciplinaryRecord.reported_by),
        )
    )
    new_record = result.scalar_one()

    return DisciplinaryRead.model_validate(new_record)


@router.get("/", response_model=List[DisciplinaryRead])
async def list_disciplinary_records(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: int = None,
    group_id: int = None,
    violation_type: ViolationType = None,
    severity: SeverityLevel = None,
    is_resolved: bool = None,
    date_from: date = None,
    date_to: date = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    List disciplinary records with optional filters.
    Students can only see their own records.
    """
    query = select(DisciplinaryRecord).options(
        selectinload(DisciplinaryRecord.student).selectinload(Student.group),
        selectinload(DisciplinaryRecord.reported_by),
    )

    # Students can only see their own records
    if current_user.role == UserRole.STUDENT:
        student_result = await session.execute(
            select(Student).where(Student.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if student:
            query = query.where(DisciplinaryRecord.student_id == student.id)
        else:
            return []

    if student_id and current_user.role != UserRole.STUDENT:
        query = query.where(DisciplinaryRecord.student_id == student_id)
    if group_id:
        query = query.join(Student).where(Student.group_id == group_id)
    if violation_type:
        query = query.where(DisciplinaryRecord.violation_type == violation_type)
    if severity:
        query = query.where(DisciplinaryRecord.severity == severity)
    if is_resolved is not None:
        query = query.where(DisciplinaryRecord.is_resolved == is_resolved)
    if date_from:
        query = query.where(DisciplinaryRecord.date >= date_from)
    if date_to:
        query = query.where(DisciplinaryRecord.date <= date_to)

    query = query.offset(skip).limit(limit).order_by(DisciplinaryRecord.date.desc())

    result = await session.execute(query)
    records = result.scalars().all()
    return [DisciplinaryRead.model_validate(r) for r in records]


@router.get("/my", response_model=List[DisciplinaryRead])
async def get_my_disciplinary_records(
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get current user's disciplinary records (for students).
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

    query = select(DisciplinaryRecord).where(
        DisciplinaryRecord.student_id == student.id
    ).options(
        selectinload(DisciplinaryRecord.reported_by),
    ).order_by(DisciplinaryRecord.date.desc())

    result = await session.execute(query)
    records = result.scalars().all()
    return [DisciplinaryRead.model_validate(r) for r in records]


@router.get("/stats/student/{student_id}")
async def get_student_disciplinary_stats(
    student_id: int,
    session: SessionDep,
    current_user: CurrentUser,
    academic_year: str = None,
):
    """
    Get disciplinary statistics for a student.
    """
    # Verify student exists
    student_result = await session.execute(
        select(Student).where(Student.id == student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get counts by violation type
    type_query = select(
        DisciplinaryRecord.violation_type,
        func.count(DisciplinaryRecord.id).label("count")
    ).where(DisciplinaryRecord.student_id == student_id).group_by(
        DisciplinaryRecord.violation_type
    )

    type_result = await session.execute(type_query)
    by_type = {r.violation_type.value: r.count for r in type_result.all()}

    # Get counts by severity
    severity_query = select(
        DisciplinaryRecord.severity,
        func.count(DisciplinaryRecord.id).label("count")
    ).where(DisciplinaryRecord.student_id == student_id).group_by(
        DisciplinaryRecord.severity
    )

    severity_result = await session.execute(severity_query)
    by_severity = {r.severity.value: r.count for r in severity_result.all()}

    # Get total and resolved counts
    total_query = select(func.count(DisciplinaryRecord.id)).where(
        DisciplinaryRecord.student_id == student_id
    )
    total_result = await session.execute(total_query)
    total = total_result.scalar() or 0

    resolved_query = select(func.count(DisciplinaryRecord.id)).where(
        DisciplinaryRecord.student_id == student_id,
        DisciplinaryRecord.is_resolved == True
    )
    resolved_result = await session.execute(resolved_query)
    resolved = resolved_result.scalar() or 0

    return {
        "total_records": total,
        "resolved": resolved,
        "unresolved": total - resolved,
        "by_violation_type": by_type,
        "by_severity": by_severity,
    }


@router.get("/{record_id}", response_model=DisciplinaryRead)
async def get_disciplinary_record(
    record_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get disciplinary record by ID.
    """
    result = await session.execute(
        select(DisciplinaryRecord)
        .where(DisciplinaryRecord.id == record_id)
        .options(
            selectinload(DisciplinaryRecord.student),
            selectinload(DisciplinaryRecord.reported_by),
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Students can only see their own records
    if current_user.role == UserRole.STUDENT:
        student_result = await session.execute(
            select(Student).where(Student.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if not student or record.student_id != student.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return DisciplinaryRead.model_validate(record)


@router.patch("/{record_id}", response_model=DisciplinaryRead)
async def update_disciplinary_record(
    record_id: int,
    record_update: DisciplinaryUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update disciplinary record (teachers and admins only).
    """
    result = await session.execute(
        select(DisciplinaryRecord)
        .where(DisciplinaryRecord.id == record_id)
        .options(
            selectinload(DisciplinaryRecord.student),
            selectinload(DisciplinaryRecord.reported_by),
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    update_data = record_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    await session.commit()
    await session.refresh(record)

    return DisciplinaryRead.model_validate(record)


@router.post("/{record_id}/resolve", response_model=DisciplinaryRead)
async def resolve_disciplinary_record(
    record_id: int,
    resolution_notes: str,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Mark a disciplinary record as resolved (teachers and admins only).
    """
    result = await session.execute(
        select(DisciplinaryRecord)
        .where(DisciplinaryRecord.id == record_id)
        .options(
            selectinload(DisciplinaryRecord.student),
            selectinload(DisciplinaryRecord.reported_by),
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.is_resolved = True
    record.resolved_date = date.today()
    record.resolution_notes = resolution_notes

    await session.commit()
    await session.refresh(record)

    return DisciplinaryRead.model_validate(record)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disciplinary_record(
    record_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete disciplinary record (teachers and admins only).
    """
    result = await session.execute(
        select(DisciplinaryRecord).where(DisciplinaryRecord.id == record_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    await session.delete(record)
    await session.commit()








