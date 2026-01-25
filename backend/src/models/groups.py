from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, TYPE_CHECKING

from backend.src.database import Base

if TYPE_CHECKING:
    from backend.src.models.students import Student
    from backend.src.models.schedule import Schedule
    from backend.src.models.assignments import Assignment


class Group(Base):
    """
    Student group (e.g., ВК-21-1, ВК-22-2).
    """
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g., "ВК-21-1"
    course: Mapped[int] = mapped_column(Integer)  # 1, 2, 3, 4
    year: Mapped[int] = mapped_column(Integer)  # Enrollment year
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    students: Mapped[List["Student"]] = relationship(back_populates="group")
    schedules: Mapped[List["Schedule"]] = relationship(back_populates="group")
    assignments: Mapped[List["Assignment"]] = relationship(back_populates="group")

    def __repr__(self):
        return f"<Group(id={self.id}, name='{self.name}', course={self.course})>"




