from datetime import datetime, date
from pydantic import BaseModel, field_validator, computed_field
from typing import Optional

from src.models.disciplinary import ViolationType, SeverityLevel
from src.schemas.students import StudentRead
from src.schemas.teachers import TeacherRead


class DisciplinaryCreate(BaseModel):
    """Schema for creating a new disciplinary record."""
    student_id: int
    reported_by_id: int
    violation_type: ViolationType
    severity: SeverityLevel
    date: date
    description: str
    action_taken: Optional[str] = None

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Description must be at least 3 characters')
        return v


class DisciplinaryRead(BaseModel):
    """Schema for reading disciplinary record information."""
    id: int
    student_id: int
    reported_by_id: int
    violation_type: ViolationType
    severity: SeverityLevel
    date: date
    description: str
    action_taken: Optional[str]
    report_number: Optional[str]
    is_resolved: bool
    resolved_date: Optional[date]
    resolution_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Nested
    student: Optional[StudentRead] = None
    reported_by: Optional[TeacherRead] = None

    @computed_field
    @property
    def student_name(self) -> str:
        """Computed field for student's full name."""
        if self.student:
            return f"{self.student.last_name} {self.student.first_name}"
        return "Студент"

    class Config:
        from_attributes = True


class DisciplinaryUpdate(BaseModel):
    """Schema for updating disciplinary record information."""
    violation_type: Optional[ViolationType] = None
    severity: Optional[SeverityLevel] = None
    description: Optional[str] = None
    action_taken: Optional[str] = None
    is_resolved: Optional[bool] = None
    resolved_date: Optional[date] = None
    resolution_notes: Optional[str] = None








