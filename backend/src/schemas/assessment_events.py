from datetime import datetime, date
from pydantic import BaseModel, field_validator
from typing import Optional

from backend.src.models.assessment_events import AssessmentEventType


class AssessmentEventCreate(BaseModel):
    """Schema for creating a new assessment event."""
    name: str
    event_type: AssessmentEventType
    group_id: int
    subject_id: int
    date: date
    semester: int
    academic_year: str
    max_score: float = 100
    description: Optional[str] = None

    @field_validator('semester')
    @classmethod
    def validate_semester(cls, v: int) -> int:
        if v not in [1, 2]:
            raise ValueError('Semester must be 1 or 2')
        return v
    
    @field_validator('max_score')
    @classmethod
    def validate_max_score(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('Max score must be positive')
        return v


class AssessmentEventRead(BaseModel):
    """Schema for reading assessment event information."""
    id: int
    name: str
    event_type: AssessmentEventType
    group_id: int
    subject_id: int
    date: date
    semester: int
    academic_year: str
    max_score: float
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssessmentEventUpdate(BaseModel):
    """Schema for updating assessment event information."""
    name: Optional[str] = None
    event_type: Optional[AssessmentEventType] = None
    date: Optional[date] = None
    max_score: Optional[float] = None
    description: Optional[str] = None
