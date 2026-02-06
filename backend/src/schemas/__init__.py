# Schemas package
from src.schemas.users import UserCreate, UserRead, UserLogin, UserUpdate, TokenResponse
from src.schemas.groups import GroupCreate, GroupRead, GroupUpdate
from src.schemas.subjects import SubjectCreate, SubjectRead, SubjectUpdate
from src.schemas.students import StudentCreate, StudentRead, StudentUpdate
from src.schemas.teachers import TeacherCreate, TeacherRead, TeacherUpdate
from src.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate
from src.schemas.attendance import AttendanceCreate, AttendanceRead, AttendanceUpdate, AttendanceBulkCreate
from src.schemas.grades import GradeCreate, GradeRead, GradeUpdate
from src.schemas.assignments import AssignmentCreate, AssignmentRead, AssignmentUpdate
from src.schemas.disciplinary import DisciplinaryCreate, DisciplinaryRead, DisciplinaryUpdate
from src.schemas.analytics import (
    AttendanceStats,
    GradeStats,
    StudentAnalytics,
    GroupAnalytics,
)
from src.schemas.attachments import (
    AttachmentCreate,
    AttachmentRead,
    AttachmentUpdate,
    AttachmentUploadResponse,
    AttachmentListResponse,
    StorageInfoResponse,
)
from src.schemas.errors import (
    ErrorResponse,
    ErrorDetail,
    ValidationErrorResponse,
    AuthenticationErrorResponse,
    AuthorizationErrorResponse,
    NotFoundErrorResponse,
    COMMON_ERROR_RESPONSES,
)

__all__ = [
    # Users
    "UserCreate", "UserRead", "UserLogin", "UserUpdate", "TokenResponse",
    # Groups
    "GroupCreate", "GroupRead", "GroupUpdate",
    # Subjects
    "SubjectCreate", "SubjectRead", "SubjectUpdate",
    # Students
    "StudentCreate", "StudentRead", "StudentUpdate",
    # Teachers
    "TeacherCreate", "TeacherRead", "TeacherUpdate",
    # Schedule
    "ScheduleCreate", "ScheduleRead", "ScheduleUpdate",
    # Attendance
    "AttendanceCreate", "AttendanceRead", "AttendanceUpdate", "AttendanceBulkCreate",
    # Grades
    "GradeCreate", "GradeRead", "GradeUpdate",
    # Assignments
    "AssignmentCreate", "AssignmentRead", "AssignmentUpdate",
    # Disciplinary
    "DisciplinaryCreate", "DisciplinaryRead", "DisciplinaryUpdate",
    # Analytics
    "AttendanceStats", "GradeStats", "StudentAnalytics", "GroupAnalytics",
    # Attachments
    "AttachmentCreate", "AttachmentRead", "AttachmentUpdate",
    "AttachmentUploadResponse", "AttachmentListResponse", "StorageInfoResponse",
    # Errors
    "ErrorResponse", "ErrorDetail", "ValidationErrorResponse",
    "AuthenticationErrorResponse", "AuthorizationErrorResponse",
    "NotFoundErrorResponse", "COMMON_ERROR_RESPONSES",
]








