from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, Date, ForeignKey, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from src.models.students import Student
    from src.models.teachers import Teacher


class ViolationType(str, PyEnum):
    """Types of disciplinary violations."""
    UNIFORM = "uniform"  # Нарушение формы одежды
    LATE = "late"  # Опоздание
    ABSENCE = "absence"  # Неявка без уважительной причины
    BEHAVIOR = "behavior"  # Нарушение дисциплины
    DISRESPECT = "disrespect"  # Неуважительное отношение
    OTHER = "other"  # Другое


class SeverityLevel(str, PyEnum):
    """Severity levels for violations."""
    MINOR = "minor"  # Незначительное
    MODERATE = "moderate"  # Умеренное
    MAJOR = "major"  # Серьёзное
    CRITICAL = "critical"  # Критическое


class DisciplinaryRecord(Base):
    """
    Disciplinary records for tracking violations and incidents.
    """
    __tablename__ = "disciplinary_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"))
    reported_by_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"))

    violation_type: Mapped[ViolationType] = mapped_column(Enum(ViolationType))
    severity: Mapped[SeverityLevel] = mapped_column(Enum(SeverityLevel))
    date: Mapped[date] = mapped_column(Date, index=True)

    description: Mapped[str] = mapped_column(Text)
    action_taken: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Принятые меры

    # For automatic report generation
    report_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(default=False)
    resolved_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="disciplinary_records")
    reported_by: Mapped["Teacher"] = relationship(back_populates="disciplinary_records")

    def __repr__(self):
        return f"<DisciplinaryRecord(id={self.id}, student_id={self.student_id}, type={self.violation_type})>"








