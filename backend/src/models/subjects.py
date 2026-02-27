from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from src.models.schedule import Schedule
    from src.models.assignments import Assignment
    from src.models.assessment_events import AssessmentEvent


class Subject(Base):
    """
    Academic subject taught at the Military Department.
    """
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)  # e.g., "MIL-101"
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    credits: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    schedules: Mapped[List["Schedule"]] = relationship(back_populates="subject")
    assignments: Mapped[List["Assignment"]] = relationship(back_populates="subject")
    assessment_events: Mapped[List["AssessmentEvent"]] = relationship(back_populates="subject")

    def __repr__(self):
        return f"<Subject(id={self.id}, name='{self.name}', code='{self.code}')>"








