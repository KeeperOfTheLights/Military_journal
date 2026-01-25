from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, Date, ForeignKey, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from backend.src.database import Base

if TYPE_CHECKING:
    from backend.src.models.students import Student
    from backend.src.models.schedule import Schedule


class AttendanceStatus(str, PyEnum):
    """Attendance status options."""
    PRESENT = "present"  # Присутствует
    ABSENT = "absent"  # Отсутствует
    LATE = "late"  # Опоздал
    EXCUSED = "excused"  # Уважительная причина


class Attendance(Base):
    """
    Attendance record for tracking student presence at classes.
    """
    __tablename__ = "attendances"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"))
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))

    date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus))
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Причина отсутствия

    marked_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="attendances")
    schedule: Mapped["Schedule"] = relationship(back_populates="attendances")

    def __repr__(self):
        return f"<Attendance(student_id={self.student_id}, date={self.date}, status={self.status})>"








