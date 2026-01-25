from datetime import datetime, time
from pydantic import BaseModel, field_validator
from typing import Optional

from backend.src.models.schedule import DayOfWeek
from backend.src.schemas.groups import GroupRead
from backend.src.schemas.subjects import SubjectRead
from backend.src.schemas.teachers import TeacherRead


class ScheduleCreate(BaseModel):
    """Schema for creating a new schedule entry."""
    group_id: int
    subject_id: int
    teacher_id: int

    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    room: str

    semester: int
    academic_year: str

    @field_validator('semester')
    @classmethod
    def validate_semester(cls, v: int) -> int:
        if v not in [1, 2]:
            raise ValueError('Semester must be 1 or 2')
        return v

    @field_validator('academic_year')
    @classmethod
    def validate_academic_year(cls, v: str) -> str:
        v = v.strip()
        if len(v) != 9 or '-' not in v:
            raise ValueError('Academic year must be in format YYYY-YYYY')
        return v

    @field_validator('room')
    @classmethod
    def validate_room(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 50:
            raise ValueError('Room must be 1-50 characters')
        return v


class ScheduleRead(BaseModel):
    """Schema for reading schedule information."""
    id: int
    group_id: int
    subject_id: int
    teacher_id: int

    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    room: str

    semester: int
    academic_year: str
    is_active: bool

    created_at: datetime

    # Nested objects
    group: Optional[GroupRead] = None
    subject: Optional[SubjectRead] = None
    teacher: Optional[TeacherRead] = None

    class Config:
        from_attributes = True


class ScheduleUpdate(BaseModel):
    """Schema for updating schedule information."""
    group_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    day_of_week: Optional[DayOfWeek] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room: Optional[str] = None
    semester: Optional[int] = None
    academic_year: Optional[str] = None
    is_active: Optional[bool] = None








