# Models package
from backend.src.models.users import User
from backend.src.models.groups import Group
from backend.src.models.subjects import Subject
from backend.src.models.students import Student
from backend.src.models.teachers import Teacher
from backend.src.models.schedule import Schedule
from backend.src.models.attendance import Attendance
from backend.src.models.grades import Grade
from backend.src.models.assignments import Assignment
from backend.src.models.disciplinary import DisciplinaryRecord

__all__ = [
    "User",
    "Group",
    "Subject",
    "Student",
    "Teacher",
    "Schedule",
    "Attendance",
    "Grade",
    "Assignment",
    "DisciplinaryRecord",
]








