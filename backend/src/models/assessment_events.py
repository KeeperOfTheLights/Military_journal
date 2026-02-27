from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING, List

from src.database import Base

if TYPE_CHECKING:
    from src.models.groups import Group
    from src.models.subjects import Subject
    from src.models.grades import Grade


class AssessmentEventType(str, PyEnum):
    """Types of assessment events."""
    MIDTERM_1 = "midterm_1"  # Рубежный контроль 1
    MIDTERM_2 = "midterm_2"  # Рубежный контроль 2
    EXAM_1 = "exam_1"  # Экзамен 1
    EXAM_2 = "exam_2"  # Экзамен 2
    CUSTOM = "custom"  # Пользовательское событие


class AssessmentEvent(Base):
    """
    Assessment event (e.g., midterm control, exam).
    Each event has a group, subject, and associated grades.
    """
    __tablename__ = "assessment_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))  # e.g., "Рубежный контроль 1"
    event_type: Mapped[AssessmentEventType] = mapped_column(Enum(AssessmentEventType))
    
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    
    date: Mapped[date] = mapped_column(Date)
    semester: Mapped[int] = mapped_column(Integer)  # 1 or 2
    academic_year: Mapped[str] = mapped_column(String(9))  # e.g., "2024-2025"
    
    max_score: Mapped[float] = mapped_column(Integer, default=100)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    group: Mapped["Group"] = relationship(back_populates="assessment_events")
    subject: Mapped["Subject"] = relationship(back_populates="assessment_events")
    grades: Mapped[List["Grade"]] = relationship(back_populates="assessment_event", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AssessmentEvent(id={self.id}, name='{self.name}', group_id={self.group_id})>"
