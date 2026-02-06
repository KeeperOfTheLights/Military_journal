from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from models.users import User
    from models.groups import Group
    from models.attendance import Attendance
    from models.grades import Grade
    from models.disciplinary import DisciplinaryRecord


class Student(Base):
    """
    Student profile with personal and academic information.
    """
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"))

    # Personal info
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Military-specific
    military_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    rank: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Звание

    # Academic
    enrollment_date: Mapped[date] = mapped_column(Date)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="student")
    group: Mapped["Group"] = relationship(back_populates="students")
    attendances: Mapped[List["Attendance"]] = relationship(back_populates="student")
    grades: Mapped[List["Grade"]] = relationship(back_populates="student")
    disciplinary_records: Mapped[List["DisciplinaryRecord"]] = relationship(back_populates="student")

    @property
    def full_name(self) -> str:
        """Return full name in format: Last First Middle."""
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        return " ".join(parts)

    def __repr__(self):
        return f"<Student(id={self.id}, name='{self.full_name}')>"








