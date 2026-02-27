from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from src.models.users import User
    from src.models.schedule import Schedule
    from src.models.assignments import Assignment
    from src.models.disciplinary import DisciplinaryRecord


class Teacher(Base):
    """
    Teacher/Instructor profile at the Military Department.
    """
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)

    # Personal info
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Military-specific
    military_rank: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Воинское звание
    position: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Должность

    # Academic
    department: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    hire_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="teacher")
    schedules: Mapped[List["Schedule"]] = relationship(back_populates="teacher")
    assignments: Mapped[List["Assignment"]] = relationship(back_populates="teacher")
    disciplinary_records: Mapped[List["DisciplinaryRecord"]] = relationship(back_populates="reported_by")

    @property
    def full_name(self) -> str:
        """Return full name in format: Last First Middle."""
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        return " ".join(parts)

    def __repr__(self):
        return f"<Teacher(id={self.id}, name='{self.full_name}', rank='{self.military_rank}')>"








