from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, Float, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from backend.src.database import Base

if TYPE_CHECKING:
    from backend.src.models.students import Student
    from backend.src.models.assessment_events import AssessmentEvent


class Grade(Base):
    """
    Grade for a student in an assessment event.
    Uses 100-point scale (0-100).
    """
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"))
    assessment_event_id: Mapped[int] = mapped_column(ForeignKey("assessment_events.id"))
    
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0-100 scale, nullable if not graded yet
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="grades")
    assessment_event: Mapped["AssessmentEvent"] = relationship(back_populates="grades")

    @property
    def letter_grade(self) -> str:
        """Convert to letter grade (Kazakh system)."""
        if self.score is None:
            return "N/A"
        if self.score >= 90:
            return "A"
        elif self.score >= 80:
            return "B"
        elif self.score >= 70:
            return "C"
        elif self.score >= 60:
            return "D"
        else:
            return "F"

    def __repr__(self):
        return f"<Grade(student_id={self.student_id}, event_id={self.assessment_event_id}, score={self.score})>"








