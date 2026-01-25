from datetime import datetime, date
from pydantic import BaseModel, field_validator
from typing import Optional

from backend.src.models.grades import GradeType
from backend.src.schemas.students import StudentRead
from backend.src.schemas.subjects import SubjectRead


class GradeCreate(BaseModel):
    """Schema for creating a new grade."""
    student_id: int
    subject_id: int
    grade_type: GradeType
    score: float
    max_score: float = 100
    weight: float = 1.0
    date: date
    semester: int
    academic_year: str
    description: Optional[str] = None
    comment: Optional[str] = None

    @field_validator('score')
    @classmethod
    def validate_score(cls, v: float) -> float:
        if v < 0:
            raise ValueError('Score cannot be negative')
        return v

    @field_validator('max_score')
    @classmethod
    def validate_max_score(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('Max score must be positive')
        return v

    @field_validator('semester')
    @classmethod
    def validate_semester(cls, v: int) -> int:
        if v not in [1, 2]:
            raise ValueError('Semester must be 1 or 2')
        return v


class GradeRead(BaseModel):
    """Schema for reading grade information."""
    id: int
    student_id: int
    subject_id: int
    grade_type: GradeType
    score: float
    max_score: float
    weight: float
    date: date
    semester: int
    academic_year: str
    description: Optional[str]
    comment: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Computed
    percentage: float = 0
    letter_grade: str = ""

    # Nested
    student: Optional[StudentRead] = None
    subject: Optional[SubjectRead] = None

    class Config:
        from_attributes = True

    def model_post_init(self, __context):
        if self.max_score > 0:
            self.percentage = (self.score / self.max_score) * 100
            pct = self.percentage
            if pct >= 90:
                self.letter_grade = "A"
            elif pct >= 80:
                self.letter_grade = "B"
            elif pct >= 70:
                self.letter_grade = "C"
            elif pct >= 60:
                self.letter_grade = "D"
            else:
                self.letter_grade = "F"


class GradeUpdate(BaseModel):
    """Schema for updating grade information."""
    grade_type: Optional[GradeType] = None
    score: Optional[float] = None
    max_score: Optional[float] = None
    weight: Optional[float] = None
    date: Optional[date] = None
    description: Optional[str] = None
    comment: Optional[str] = None








