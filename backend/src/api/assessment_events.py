from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.assessment_events import AssessmentEvent, AssessmentEventType
from backend.src.models.grades import Grade
from backend.src.models.groups import Group
from backend.src.models.subjects import Subject
from backend.src.models.students import Student
from backend.src.schemas.assessment_events import AssessmentEventCreate, AssessmentEventRead, AssessmentEventUpdate
from backend.src.schemas.grades import BulkGradeInput

router = APIRouter(prefix="/assessment-events", tags=["Assessment Events"])


@router.post("/", response_model=AssessmentEventRead, status_code=status.HTTP_201_CREATED)
async def create_assessment_event(
    event_data: AssessmentEventCreate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create a new assessment event (teachers and admins only).
    """
    # Verify group exists
    group_result = await session.execute(
        select(Group).where(Group.id == event_data.group_id)
    )
    if not group_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify subject exists
    subject_result = await session.execute(
        select(Subject).where(Subject.id == event_data.subject_id)
    )
    if not subject_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subject not found")

    new_event = AssessmentEvent(**event_data.model_dump())
    session.add(new_event)
    await session.commit()
    await session.refresh(new_event)

    return AssessmentEventRead.model_validate(new_event)


@router.get("/", response_model=List[AssessmentEventRead])
async def list_assessment_events(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    event_type: Optional[AssessmentEventType] = Query(None),
    academic_year: Optional[str] = Query(None),
    semester: Optional[int] = Query(None),
    skip: int = Query(0),
    limit: int = Query(100),
):
    """
    List assessment events with optional filters.
    """
    query = select(AssessmentEvent)

    if group_id is not None:
        query = query.where(AssessmentEvent.group_id == group_id)
    if subject_id is not None:
        query = query.where(AssessmentEvent.subject_id == subject_id)
    if event_type is not None:
        query = query.where(AssessmentEvent.event_type == event_type)
    if academic_year is not None:
        query = query.where(AssessmentEvent.academic_year == academic_year)
    if semester is not None:
        query = query.where(AssessmentEvent.semester == semester)

    query = query.offset(skip).limit(limit).order_by(AssessmentEvent.date.desc())

    result = await session.execute(query)
    events = result.scalars().all()
    return [AssessmentEventRead.model_validate(e) for e in events]


@router.get("/{event_id}", response_model=AssessmentEventRead)
async def get_assessment_event(
    event_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get assessment event by ID.
    """
    result = await session.execute(
        select(AssessmentEvent).where(AssessmentEvent.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Assessment event not found")

    return AssessmentEventRead.model_validate(event)


@router.get("/{event_id}/grades")
async def get_event_grades(
    event_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get all grades for an assessment event with student info.
    """
    # Verify event exists
    event_result = await session.execute(
        select(AssessmentEvent).where(AssessmentEvent.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Assessment event not found")

    # Get all students in the group
    students_result = await session.execute(
        select(Student).where(Student.group_id == event.group_id).order_by(Student.last_name, Student.first_name)
    )
    students = students_result.scalars().all()

    # Get existing grades for this event
    grades_result = await session.execute(
        select(Grade).where(Grade.assessment_event_id == event_id)
    )
    grades = grades_result.scalars().all()
    grades_dict = {g.student_id: g for g in grades}

    # Build response with all students
    result = []
    for student in students:
        grade = grades_dict.get(student.id)
        result.append({
            "student_id": student.id,
            "student_name": f"{student.last_name} {student.first_name}",
            "student_middle_name": student.middle_name or "",
            "score": grade.score if grade else None,
            "comment": grade.comment if grade else None,
            "grade_id": grade.id if grade else None,
            "letter_grade": grade.letter_grade if grade else "N/A"
        })

    return {
        "event_id": event_id,
        "event_name": event.name,
        "group_id": event.group_id,
        "subject_id": event.subject_id,
        "max_score": event.max_score,
        "grades": result
    }


@router.post("/{event_id}/grades/bulk")
async def bulk_update_grades(
    event_id: int,
    grades_data: List[BulkGradeInput],
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Create or update grades for multiple students in an event (bulk operation).
    """
    # Verify event exists
    event_result = await session.execute(
        select(AssessmentEvent).where(AssessmentEvent.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Assessment event not found")
    
    created_count = 0
    updated_count = 0
    
    for grade_input in grades_data:
        # Check if grade already exists
        grade_result = await session.execute(
            select(Grade).where(
                and_(
                    Grade.student_id == grade_input.student_id,
                    Grade.assessment_event_id == event_id
                )
            )
        )
        existing_grade = grade_result.scalar_one_or_none()
        
        if existing_grade:
            # Update existing grade
            if grade_input.score is not None:
                existing_grade.score = grade_input.score
            if grade_input.comment is not None:
                existing_grade.comment = grade_input.comment
            updated_count += 1
        else:
            # Create new grade
            new_grade = Grade(
                student_id=grade_input.student_id,
                assessment_event_id=event_id,
                score=grade_input.score,
                comment=grade_input.comment
            )
            session.add(new_grade)
            created_count += 1
    
    await session.commit()
    
    return {
        "message": f"Оценки сохранены! (создано: {created_count}, обновлено: {updated_count})",
        "created": created_count,
        "updated": updated_count
    }


@router.patch("/{event_id}", response_model=AssessmentEventRead)
async def update_assessment_event(
    event_id: int,
    event_update: AssessmentEventUpdate,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Update assessment event (teachers and admins only).
    """
    result = await session.execute(
        select(AssessmentEvent).where(AssessmentEvent.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Assessment event not found")

    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    await session.commit()
    await session.refresh(event)

    return AssessmentEventRead.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assessment_event(
    event_id: int,
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Delete assessment event (teachers and admins only).
    This will also delete all associated grades.
    """
    result = await session.execute(
        select(AssessmentEvent).where(AssessmentEvent.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Assessment event not found")

    await session.delete(event)
    await session.commit()
