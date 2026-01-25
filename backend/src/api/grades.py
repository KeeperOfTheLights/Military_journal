from typing import List
from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.grades import Grade, GradeType
from backend.src.models.students import Student
from backend.src.models.subjects import Subject
from backend.src.models.users import UserRole
from backend.src.schemas.grades import GradeCreate, GradeRead, GradeUpdate

router = APIRouter(prefix="/grades", tags=["Grades"])


@router.post("/", response_model=GradeRead, status_code=status.HTTP_201_CREATED)
async def create_grade(
    grade_data: GradeCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new grade (teachers and admins only).
    """
    # Verify student exists
    student_result = await session.execute(
        select(Student).where(Student.id == grade_data.student_id)
    )
    if not student_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify subject exists
    subject_result = await session.execute(
        select(Subject).where(Subject.id == grade_data.subject_id)
    )
    if not subject_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subject not found")

    new_grade = Grade(**grade_data.model_dump())
    session.add(new_grade)
    await session.commit()
    await session.refresh(new_grade)

    # Load relationships
    result = await session.execute(
        select(Grade)
        .where(Grade.id == new_grade.id)
        .options(
            selectinload(Grade.student),
            selectinload(Grade.subject),
        )
    )
    new_grade = result.scalar_one()

    return GradeRead.model_validate(new_grade)


@router.get("/", response_model=List[GradeRead])
async def list_grades(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: int = None,
    subject_id: int = None,
    group_id: int = None,
    grade_type: GradeType = None,
    academic_year: str = None,
    semester: int = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    List grades with optional filters.
    """
    query = select(Grade).options(
        selectinload(Grade.student),
        selectinload(Grade.subject),
    )

    if student_id:
        query = query.where(Grade.student_id == student_id)
    if subject_id:
        query = query.where(Grade.subject_id == subject_id)
    if group_id:
        query = query.join(Student).where(Student.group_id == group_id)
    if grade_type:
        query = query.where(Grade.grade_type == grade_type)
    if academic_year:
        query = query.where(Grade.academic_year == academic_year)
    if semester:
        query = query.where(Grade.semester == semester)

    query = query.offset(skip).limit(limit).order_by(Grade.date.desc())

    result = await session.execute(query)
    grades = result.scalars().all()
    return [GradeRead.model_validate(g) for g in grades]


@router.get("/my", response_model=List[GradeRead])
async def get_my_grades(
    session: SessionDep,
    current_user: CurrentUser,
    subject_id: int = None,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get current user's grades (for students).
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

    query = select(Grade).where(Grade.student_id == student.id).options(
        selectinload(Grade.subject),
    )

    if subject_id:
        query = query.where(Grade.subject_id == subject_id)
    if academic_year:
        query = query.where(Grade.academic_year == academic_year)
    if semester:
        query = query.where(Grade.semester == semester)

    query = query.order_by(Grade.date.desc())

    result = await session.execute(query)
    grades = result.scalars().all()
    return [GradeRead.model_validate(g) for g in grades]


@router.get("/stats/student/{student_id}")
async def get_student_grade_stats(
    student_id: int,
    session: SessionDep,
    current_user: CurrentUser,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get grade statistics for a student.
    """
    query = select(
        Subject.id,
        Subject.name,
        func.avg(Grade.score * 100 / Grade.max_score).label("avg_percentage"),
        func.min(Grade.score * 100 / Grade.max_score).label("min_percentage"),
        func.max(Grade.score * 100 / Grade.max_score).label("max_percentage"),
        func.count(Grade.id).label("count"),
    ).join(Subject).where(Grade.student_id == student_id)

    if academic_year:
        query = query.where(Grade.academic_year == academic_year)
    if semester:
        query = query.where(Grade.semester == semester)

    query = query.group_by(Subject.id, Subject.name)

    result = await session.execute(query)
    stats = result.all()

    subject_stats = []
    for stat in stats:
        avg_pct = float(stat.avg_percentage) if stat.avg_percentage else 0
        # Calculate letter grade
        if avg_pct >= 90:
            letter = "A"
        elif avg_pct >= 80:
            letter = "B"
        elif avg_pct >= 70:
            letter = "C"
        elif avg_pct >= 60:
            letter = "D"
        else:
            letter = "F"

        subject_stats.append({
            "subject_id": stat.id,
            "subject_name": stat.name,
            "average_score": round(avg_pct, 2),
            "min_score": round(float(stat.min_percentage) if stat.min_percentage else 0, 2),
            "max_score": round(float(stat.max_percentage) if stat.max_percentage else 0, 2),
            "grades_count": stat.count,
            "letter_grade": letter,
        })

    # Calculate overall average
    overall_avg = sum(s["average_score"] for s in subject_stats) / len(subject_stats) if subject_stats else 0

    return {
        "subjects": subject_stats,
        "overall_average": round(overall_avg, 2),
    }


@router.get("/{grade_id}", response_model=GradeRead)
async def get_grade(
    grade_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get grade by ID.
    """
    result = await session.execute(
        select(Grade)
        .where(Grade.id == grade_id)
        .options(
            selectinload(Grade.student),
            selectinload(Grade.subject),
        )
    )
    grade = result.scalar_one_or_none()

    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    return GradeRead.model_validate(grade)


@router.patch("/{grade_id}", response_model=GradeRead)
async def update_grade(
    grade_id: int,
    grade_update: GradeUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update grade (teachers and admins only).
    """
    result = await session.execute(
        select(Grade)
        .where(Grade.id == grade_id)
        .options(
            selectinload(Grade.student),
            selectinload(Grade.subject),
        )
    )
    grade = result.scalar_one_or_none()

    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    update_data = grade_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grade, field, value)

    await session.commit()
    await session.refresh(grade)

    return GradeRead.model_validate(grade)


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    grade_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete grade (teachers and admins only).
    """
    result = await session.execute(select(Grade).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()

    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    await session.delete(grade)
    await session.commit()








