# Schemas package
from backend.src.schemas.users import UserCreate, UserRead, UserLogin, UserUpdate, TokenResponse
from backend.src.schemas.groups import GroupCreate, GroupRead, GroupUpdate
from backend.src.schemas.subjects import SubjectCreate, SubjectRead, SubjectUpdate
from backend.src.schemas.students import StudentCreate, StudentRead, StudentUpdate
from backend.src.schemas.teachers import TeacherCreate, TeacherRead, TeacherUpdate
from backend.src.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate
from backend.src.schemas.attendance import AttendanceCreate, AttendanceRead, AttendanceUpdate, AttendanceBulkCreate
from backend.src.schemas.grades import GradeCreate, GradeRead, GradeUpdate
from backend.src.schemas.assignments import AssignmentCreate, AssignmentRead, AssignmentUpdate
from backend.src.schemas.disciplinary import DisciplinaryCreate, DisciplinaryRead, DisciplinaryUpdate
from backend.src.schemas.analytics import (
    AttendanceStats,
    GradeStats,
    StudentAnalytics,
    GroupAnalytics,
)
from backend.src.schemas.attachments import (
    AttachmentCreate,
    AttachmentRead,
    AttachmentUpdate,
    AttachmentUploadResponse,
    AttachmentListResponse,
    StorageInfoResponse,
)
from backend.src.schemas.errors import (
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








