from datetime import date
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class AttendanceStats(BaseModel):
    """Attendance statistics."""
    total_classes: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_rate: float  # Percentage
    by_month: Dict[str, Dict[str, int]] = {}  # {"2024-01": {"present": 10, "absent": 2}}


class GradeStats(BaseModel):
    """Grade statistics."""
    subject_id: int
    subject_name: str
    average_score: float
    min_score: float
    max_score: float
    grades_count: int
    letter_grade: str


class StudentAnalytics(BaseModel):
    """Complete analytics for a single student."""
    student_id: int
    student_name: str
    group_name: str
    attendance: AttendanceStats
    grades: List[GradeStats]
    overall_average: float
    disciplinary_count: int
    semester: int
    academic_year: str


class GroupAnalytics(BaseModel):
    """Analytics for a group."""
    group_id: int
    group_name: str
    student_count: int
    average_attendance_rate: float
    average_grade: float
    top_students: List[Dict[str, Any]]  # [{name, average}]
    attendance_by_subject: Dict[str, float]  # {subject_name: rate}
    grades_by_subject: Dict[str, float]  # {subject_name: average}


class DashboardStats(BaseModel):
    """Dashboard statistics for admin/teacher."""
    total_students: int
    total_teachers: int
    total_groups: int
    total_subjects: int
    today_attendance_rate: float
    semester_attendance_rate: float
    average_grade: float
    recent_violations: int

