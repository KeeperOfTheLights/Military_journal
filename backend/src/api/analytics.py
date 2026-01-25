from typing import List, Dict, Any
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from backend.src.api.dependencies import SessionDep, TeacherUser, CurrentUser
from backend.src.models.users import User, UserRole
from backend.src.models.students import Student
from backend.src.models.teachers import Teacher
from backend.src.models.groups import Group
from backend.src.models.subjects import Subject
from backend.src.models.attendance import Attendance, AttendanceStatus
from backend.src.models.grades import Grade
from backend.src.models.disciplinary import DisciplinaryRecord
from backend.src.models.schedule import Schedule
from backend.src.schemas.analytics import DashboardStats, GroupAnalytics, StudentAnalytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    session: SessionDep,
    current_user: TeacherUser,
):
    """
    Get dashboard statistics for admin/teacher overview.
    """
    # Count totals
    students_result = await session.execute(select(func.count(Student.id)))
    total_students = students_result.scalar() or 0

    teachers_result = await session.execute(select(func.count(Teacher.id)))
    total_teachers = teachers_result.scalar() or 0

    groups_result = await session.execute(select(func.count(Group.id)))
    total_groups = groups_result.scalar() or 0

    subjects_result = await session.execute(select(func.count(Subject.id)))
    total_subjects = subjects_result.scalar() or 0

    # Today's attendance
    today = date.today()
    today_attendance_query = select(
        Attendance.status,
        func.count(Attendance.id).label("count")
    ).where(Attendance.date == today).group_by(Attendance.status)

    today_result = await session.execute(today_attendance_query)
    today_stats = {r.status.value: r.count for r in today_result.all()}

    today_total = sum(today_stats.values())
    today_present = today_stats.get("present", 0) + today_stats.get("late", 0)
    today_rate = (today_present / today_total * 100) if today_total > 0 else 0

    # Semester attendance (approximate - last 4 months)
    from datetime import timedelta
    semester_start = today - timedelta(days=120)

    semester_query = select(
        Attendance.status,
        func.count(Attendance.id).label("count")
    ).where(Attendance.date >= semester_start).group_by(Attendance.status)

    semester_result = await session.execute(semester_query)
    semester_stats = {r.status.value: r.count for r in semester_result.all()}

    semester_total = sum(semester_stats.values())
    semester_present = semester_stats.get("present", 0) + semester_stats.get("late", 0)
    semester_rate = (semester_present / semester_total * 100) if semester_total > 0 else 0

    # Average grade
    avg_grade_result = await session.execute(
        select(func.avg(Grade.score * 100 / Grade.max_score))
    )
    avg_grade = avg_grade_result.scalar() or 0

    # Recent violations (last 30 days)
    violations_result = await session.execute(
        select(func.count(DisciplinaryRecord.id)).where(
            DisciplinaryRecord.date >= today - timedelta(days=30)
        )
    )
    recent_violations = violations_result.scalar() or 0

    return DashboardStats(
        total_students=total_students,
        total_teachers=total_teachers,
        total_groups=total_groups,
        total_subjects=total_subjects,
        today_attendance_rate=round(today_rate, 2),
        semester_attendance_rate=round(semester_rate, 2),
        average_grade=round(float(avg_grade), 2),
        recent_violations=recent_violations,
    )


@router.get("/groups/{group_id}", response_model=GroupAnalytics)
async def get_group_analytics(
    group_id: int,
    session: SessionDep,
    current_user: TeacherUser,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get comprehensive analytics for a group.
    """
    # Get group
    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get student count
    student_count_result = await session.execute(
        select(func.count(Student.id)).where(Student.group_id == group_id)
    )
    student_count = student_count_result.scalar() or 0

    # Get students for this group
    students_result = await session.execute(
        select(Student).where(Student.group_id == group_id)
    )
    students = students_result.scalars().all()
    student_ids = [s.id for s in students]

    if not student_ids:
        return GroupAnalytics(
            group_id=group.id,
            group_name=group.name,
            student_count=0,
            average_attendance_rate=0,
            average_grade=0,
            top_students=[],
            attendance_by_subject={},
            grades_by_subject={},
        )

    # Calculate average attendance
    attendance_query = select(
        Attendance.status,
        func.count(Attendance.id).label("count")
    ).where(Attendance.student_id.in_(student_ids))

    attendance_result = await session.execute(attendance_query)
    att_stats = {r.status.value: r.count for r in attendance_result.all()}

    att_total = sum(att_stats.values())
    att_present = att_stats.get("present", 0) + att_stats.get("late", 0)
    avg_attendance = (att_present / att_total * 100) if att_total > 0 else 0

    # Calculate average grade
    avg_grade_result = await session.execute(
        select(func.avg(Grade.score * 100 / Grade.max_score)).where(
            Grade.student_id.in_(student_ids)
        )
    )
    avg_grade = avg_grade_result.scalar() or 0

    # Get top students by average grade
    top_students_query = select(
        Student.id,
        Student.first_name,
        Student.last_name,
        func.avg(Grade.score * 100 / Grade.max_score).label("average")
    ).join(Grade).where(
        Student.group_id == group_id
    ).group_by(Student.id, Student.first_name, Student.last_name).order_by(
        func.avg(Grade.score * 100 / Grade.max_score).desc()
    ).limit(5)

    top_result = await session.execute(top_students_query)
    top_students = [
        {"name": f"{r.last_name} {r.first_name}", "average": round(float(r.average), 2)}
        for r in top_result.all()
    ]

    # Attendance by subject
    att_by_subject_query = select(
        Subject.name,
        func.count(Attendance.id).filter(
            Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        ).label("present"),
        func.count(Attendance.id).label("total")
    ).join(Schedule, Attendance.schedule_id == Schedule.id).join(
        Subject, Schedule.subject_id == Subject.id
    ).where(
        Attendance.student_id.in_(student_ids)
    ).group_by(Subject.name)

    att_subj_result = await session.execute(att_by_subject_query)
    attendance_by_subject = {
        r.name: round((r.present / r.total * 100) if r.total > 0 else 0, 2)
        for r in att_subj_result.all()
    }

    # Grades by subject
    grades_by_subject_query = select(
        Subject.name,
        func.avg(Grade.score * 100 / Grade.max_score).label("average")
    ).join(Subject).where(
        Grade.student_id.in_(student_ids)
    ).group_by(Subject.name)

    grades_subj_result = await session.execute(grades_by_subject_query)
    grades_by_subject = {
        r.name: round(float(r.average), 2)
        for r in grades_subj_result.all()
    }

    return GroupAnalytics(
        group_id=group.id,
        group_name=group.name,
        student_count=student_count,
        average_attendance_rate=round(avg_attendance, 2),
        average_grade=round(float(avg_grade), 2),
        top_students=top_students,
        attendance_by_subject=attendance_by_subject,
        grades_by_subject=grades_by_subject,
    )


@router.get("/students/{student_id}")
async def get_student_analytics(
    student_id: int,
    session: SessionDep,
    current_user: CurrentUser,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get comprehensive analytics for a student.
    """
    # Verify access - students can only view their own analytics
    if current_user.role == UserRole.STUDENT:
        student_result = await session.execute(
            select(Student).where(Student.user_id == current_user.id)
        )
        current_student = student_result.scalar_one_or_none()
        if not current_student or current_student.id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Get student with group
    student_result = await session.execute(
        select(Student)
        .where(Student.id == student_id)
        .options(selectinload(Student.group))
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Attendance statistics
    att_query = select(
        Attendance.status,
        func.count(Attendance.id).label("count")
    ).where(Attendance.student_id == student_id)

    if academic_year or semester:
        att_query = att_query.join(Schedule)
        if academic_year:
            att_query = att_query.where(Schedule.academic_year == academic_year)
        if semester:
            att_query = att_query.where(Schedule.semester == semester)

    att_query = att_query.group_by(Attendance.status)
    att_result = await session.execute(att_query)
    att_stats = {r.status.value: r.count for r in att_result.all()}

    total_classes = sum(att_stats.values())
    present = att_stats.get("present", 0)
    absent = att_stats.get("absent", 0)
    late = att_stats.get("late", 0)
    excused = att_stats.get("excused", 0)
    attendance_rate = ((present + late) / total_classes * 100) if total_classes > 0 else 0

    # Grade statistics by subject
    grade_query = select(
        Subject.id,
        Subject.name,
        func.avg(Grade.score * 100 / Grade.max_score).label("avg"),
        func.min(Grade.score * 100 / Grade.max_score).label("min"),
        func.max(Grade.score * 100 / Grade.max_score).label("max"),
        func.count(Grade.id).label("count")
    ).join(Subject).where(Grade.student_id == student_id)

    if academic_year:
        grade_query = grade_query.where(Grade.academic_year == academic_year)
    if semester:
        grade_query = grade_query.where(Grade.semester == semester)

    grade_query = grade_query.group_by(Subject.id, Subject.name)
    grade_result = await session.execute(grade_query)

    grades = []
    total_avg = 0
    for r in grade_result.all():
        avg_pct = float(r.avg) if r.avg else 0
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

        grades.append({
            "subject_id": r.id,
            "subject_name": r.name,
            "average_score": round(avg_pct, 2),
            "min_score": round(float(r.min) if r.min else 0, 2),
            "max_score": round(float(r.max) if r.max else 0, 2),
            "grades_count": r.count,
            "letter_grade": letter,
        })
        total_avg += avg_pct

    overall_average = total_avg / len(grades) if grades else 0

    # Disciplinary count
    disc_result = await session.execute(
        select(func.count(DisciplinaryRecord.id)).where(
            DisciplinaryRecord.student_id == student_id
        )
    )
    disciplinary_count = disc_result.scalar() or 0

    return {
        "student_id": student.id,
        "student_name": f"{student.last_name} {student.first_name}",
        "group_name": student.group.name if student.group else "",
        "attendance": {
            "total_classes": total_classes,
            "present_count": present,
            "absent_count": absent,
            "late_count": late,
            "excused_count": excused,
            "attendance_rate": round(attendance_rate, 2),
        },
        "grades": grades,
        "overall_average": round(overall_average, 2),
        "disciplinary_count": disciplinary_count,
        "semester": semester or 0,
        "academic_year": academic_year or "",
    }


@router.get("/attendance/by-date")
async def get_attendance_by_date(
    session: SessionDep,
    current_user: TeacherUser,
    group_id: int = None,
    date_from: date = None,
    date_to: date = None,
):
    """
    Get attendance statistics grouped by date.
    """
    from datetime import timedelta

    if not date_from:
        date_from = date.today() - timedelta(days=30)
    if not date_to:
        date_to = date.today()

    query = select(
        Attendance.date,
        func.count(Attendance.id).filter(
            Attendance.status == AttendanceStatus.PRESENT
        ).label("present"),
        func.count(Attendance.id).filter(
            Attendance.status == AttendanceStatus.ABSENT
        ).label("absent"),
        func.count(Attendance.id).filter(
            Attendance.status == AttendanceStatus.LATE
        ).label("late"),
        func.count(Attendance.id).filter(
            Attendance.status == AttendanceStatus.EXCUSED
        ).label("excused"),
        func.count(Attendance.id).label("total"),
    ).where(
        and_(Attendance.date >= date_from, Attendance.date <= date_to)
    )

    if group_id:
        query = query.join(Student).where(Student.group_id == group_id)

    query = query.group_by(Attendance.date).order_by(Attendance.date)

    result = await session.execute(query)

    return [
        {
            "date": r.date.isoformat(),
            "present": r.present,
            "absent": r.absent,
            "late": r.late,
            "excused": r.excused,
            "total": r.total,
            "rate": round((r.present + r.late) / r.total * 100 if r.total > 0 else 0, 2),
        }
        for r in result.all()
    ]


@router.get("/grades/distribution")
async def get_grades_distribution(
    session: SessionDep,
    current_user: TeacherUser,
    subject_id: int = None,
    group_id: int = None,
    academic_year: str = None,
    semester: int = None,
):
    """
    Get grade distribution statistics.
    """
    # Define grade ranges
    query = select(
        func.count(Grade.id).filter(Grade.score * 100 / Grade.max_score >= 90).label("a_count"),
        func.count(Grade.id).filter(
            and_(Grade.score * 100 / Grade.max_score >= 80, Grade.score * 100 / Grade.max_score < 90)
        ).label("b_count"),
        func.count(Grade.id).filter(
            and_(Grade.score * 100 / Grade.max_score >= 70, Grade.score * 100 / Grade.max_score < 80)
        ).label("c_count"),
        func.count(Grade.id).filter(
            and_(Grade.score * 100 / Grade.max_score >= 60, Grade.score * 100 / Grade.max_score < 70)
        ).label("d_count"),
        func.count(Grade.id).filter(Grade.score * 100 / Grade.max_score < 60).label("f_count"),
        func.count(Grade.id).label("total"),
    )

    if subject_id:
        query = query.where(Grade.subject_id == subject_id)
    if group_id:
        query = query.join(Student).where(Student.group_id == group_id)
    if academic_year:
        query = query.where(Grade.academic_year == academic_year)
    if semester:
        query = query.where(Grade.semester == semester)

    result = await session.execute(query)
    r = result.one()

    return {
        "A": r.a_count,
        "B": r.b_count,
        "C": r.c_count,
        "D": r.d_count,
        "F": r.f_count,
        "total": r.total,
        "percentages": {
            "A": round(r.a_count / r.total * 100 if r.total > 0 else 0, 2),
            "B": round(r.b_count / r.total * 100 if r.total > 0 else 0, 2),
            "C": round(r.c_count / r.total * 100 if r.total > 0 else 0, 2),
            "D": round(r.d_count / r.total * 100 if r.total > 0 else 0, 2),
            "F": round(r.f_count / r.total * 100 if r.total > 0 else 0, 2),
        }
    }








