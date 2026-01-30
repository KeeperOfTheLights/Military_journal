from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.grades import Grade
from backend.src.models.assessment_events import AssessmentEvent
from backend.src.models.students import Student
from backend.src.schemas.grades import GradeCreate, GradeRead, GradeUpdate, BulkGradesCreate

router = APIRouter(prefix="/grades", tags=["Grades"])


@router.post("/bulk", status_code=status.HTTP_200_OK)
async def create_bulk_grades(
    bulk_data: BulkGradesCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create or update multiple grades for an assessment event.
    """
    # Verify event exists
    event_result = await session.execute(
        select(AssessmentEvent).where(AssessmentEvent.id == bulk_data.assessment_event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Assessment event not found")

    created = 0
    updated = 0
    skipped = 0

    for grade_input in bulk_data.grades:
        # Check if student exists
        student_result = await session.execute(
            select(Student).where(Student.id == grade_input.student_id)
        )
        if not student_result.scalar_one_or_none():
            continue  # Skip invalid students

        # Check if grade already exists
        existing_grade_result = await session.execute(
            select(Grade).where(
                Grade.student_id == grade_input.student_id,
                Grade.assessment_event_id == bulk_data.assessment_event_id
            )
        )
        existing_grade = existing_grade_result.scalar_one_or_none()

        if existing_grade:
            # Update if there are changes
            if grade_input.score is None and grade_input.comment is None:
                skipped += 1
                continue
            
            changed = False
            if grade_input.score is not None and existing_grade.score != grade_input.score:
                existing_grade.score = grade_input.score
                changed = True
            if grade_input.comment is not None and existing_grade.comment != grade_input.comment:
                existing_grade.comment = grade_input.comment
                changed = True
            
            if changed:
                updated += 1
            else:
                skipped += 1
        else:
            # Create new grade only if score or comment is provided
            if grade_input.score is None and not grade_input.comment:
                skipped += 1
                continue
                
            new_grade = Grade(
                student_id=grade_input.student_id,
                assessment_event_id=bulk_data.assessment_event_id,
                score=grade_input.score,
                comment=grade_input.comment
            )
            session.add(new_grade)
            created += 1

    await session.commit()

    return {
        "message": "Grades saved",
        "created": created,
        "updated": updated,
        "skipped": skipped
    }


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

    # Verify event exists
    event_result = await session.execute(
        select(AssessmentEvent).where(AssessmentEvent.id == grade_data.assessment_event_id)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Assessment event not found")

    # Check if grade already exists
    existing_result = await session.execute(
        select(Grade).where(
            Grade.student_id == grade_data.student_id,
            Grade.assessment_event_id == grade_data.assessment_event_id
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Grade already exists for this student and event")

    new_grade = Grade(**grade_data.model_dump())
    session.add(new_grade)
    await session.commit()
    await session.refresh(new_grade)

    # Load student relationship
    result = await session.execute(
        select(Grade)
        .where(Grade.id == new_grade.id)
        .options(selectinload(Grade.student))
    )
    new_grade = result.scalar_one()

    return GradeRead.model_validate(new_grade)


@router.get("/", response_model=List[GradeRead])
async def list_grades(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: int = None,
    assessment_event_id: int = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    List grades with optional filters.
    """
    query = select(Grade).options(selectinload(Grade.student))

    if student_id:
        query = query.where(Grade.student_id == student_id)
    if assessment_event_id:
        query = query.where(Grade.assessment_event_id == assessment_event_id)

    query = query.offset(skip).limit(limit)

    result = await session.execute(query)
    grades = result.scalars().all()
    return [GradeRead.model_validate(g) for g in grades]


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
        .options(selectinload(Grade.student))
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
        .options(selectinload(Grade.student))
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
