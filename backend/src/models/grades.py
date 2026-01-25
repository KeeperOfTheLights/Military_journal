from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Enum, Text, Float, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from backend.src.database import Base

if TYPE_CHECKING:
    from backend.src.models.students import Student
    from backend.src.models.subjects import Subject


class GradeType(str, PyEnum):
    """Types of grades/assessments."""
    HOMEWORK = "homework"  # Домашнее задание
    CLASSWORK = "classwork"  # Классная работа
    TEST = "test"  # Контрольная работа
    EXAM = "exam"  # Экзамен
    PROJECT = "project"  # Проект
    MIDTERM = "midterm"  # Промежуточная аттестация
    FINAL = "final"  # Итоговая оценка


class Grade(Base):
    """
    Grade/assessment record for students.
    Uses 100-point scale or traditional 5-point scale.
    """
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))

    grade_type: Mapped[GradeType] = mapped_column(Enum(GradeType))
    score: Mapped[float] = mapped_column(Float)  # 0-100 scale
    max_score: Mapped[float] = mapped_column(Float, default=100)
    weight: Mapped[float] = mapped_column(Float, default=1.0)  # Weight for final grade calculation

    date: Mapped[date] = mapped_column(Date)
    semester: Mapped[int] = mapped_column(Integer)  # 1 or 2
    academic_year: Mapped[str] = mapped_column(String(9))  # e.g., "2024-2025"

    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="grades")
    subject: Mapped["Subject"] = relationship(back_populates="grades")

    @property
    def percentage(self) -> float:
        """Calculate percentage score."""
        return (self.score / self.max_score) * 100 if self.max_score > 0 else 0

    @property
    def letter_grade(self) -> str:
        """Convert to letter grade (Kazakh system)."""
        pct = self.percentage
        if pct >= 90:
            return "A"
        elif pct >= 80:
            return "B"
        elif pct >= 70:
            return "C"
        elif pct >= 60:
            return "D"
        else:
            return "F"

    def __repr__(self):
        return f"<Grade(student_id={self.student_id}, subject_id={self.subject_id}, score={self.score})>"








