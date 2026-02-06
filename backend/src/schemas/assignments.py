from datetime import datetime, date
from pydantic import BaseModel, field_validator
from typing import Optional

from src.schemas.subjects import SubjectRead
from src.schemas.teachers import TeacherRead
from src.schemas.groups import GroupRead


class AssignmentCreate(BaseModel):
    """Schema for creating a new assignment."""
    subject_id: int
    teacher_id: Optional[int] = None  # Will be set from current user if teacher
    group_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    attachment_url: Optional[str] = None
    due_date: Optional[date] = None
    max_score: float = 100
    is_published: bool = True  # Default to published

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Title must be at least 3 characters')
        if len(v) > 300:
            raise ValueError('Title must not exceed 300 characters')
        return v


class AssignmentRead(BaseModel):
    """Schema for reading assignment information."""
    id: int
    subject_id: int
    teacher_id: int
    group_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    attachment_url: Optional[str] = None
    due_date: Optional[date] = None
    max_score: float
    is_published: bool
    created_at: datetime
    updated_at: datetime

    # Nested
    subject: Optional[SubjectRead] = None
    teacher: Optional[TeacherRead] = None
    group: Optional[GroupRead] = None

    class Config:
        from_attributes = True


class AssignmentUpdate(BaseModel):
    """Schema for updating assignment information."""
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    attachment_url: Optional[str] = None
    due_date: Optional[date] = None
    max_score: Optional[float] = None
    is_published: Optional[bool] = None
    group_id: Optional[int] = None




