from datetime import datetime
from pydantic import BaseModel, field_validator
from typing import Optional

from src.schemas.students import StudentRead


class GradeCreate(BaseModel):
    """Schema for creating a new grade."""
    student_id: int
    assessment_event_id: int
    score: Optional[float] = None
    comment: Optional[str] = None

    @field_validator('score')
    @classmethod
    def validate_score(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError('Score cannot be negative')
        return v


class GradeRead(BaseModel):
    """Schema for reading grade information."""
    id: int
    student_id: int
    assessment_event_id: int
    score: Optional[float]
    comment: Optional[str]
    created_at: datetime
    updated_at: datetime
    letter_grade: str = ""
    
    # Nested
    student: Optional[StudentRead] = None

    class Config:
        from_attributes = True
    
    def model_post_init(self, __context):
        if self.score is None:
            self.letter_grade = "N/A"
        elif self.score >= 90:
            self.letter_grade = "A"
        elif self.score >= 80:
            self.letter_grade = "B"
        elif self.score >= 70:
            self.letter_grade = "C"
        elif self.score >= 60:
            self.letter_grade = "D"
        else:
            self.letter_grade = "F"


class GradeUpdate(BaseModel):
    """Schema for updating grade information."""
    score: Optional[float] = None
    comment: Optional[str] = None


class BulkGradeInput(BaseModel):
    """Schema for bulk grade input (for one student in an event)."""
    student_id: int
    score: Optional[float] = None
    comment: Optional[str] = None


class BulkGradesCreate(BaseModel):
    """Schema for creating multiple grades at once for an event."""
    assessment_event_id: int
    grades: list[BulkGradeInput]
