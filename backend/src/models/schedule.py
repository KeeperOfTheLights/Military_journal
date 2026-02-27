from datetime import datetime, date, time
from enum import Enum as PyEnum
from sqlalchemy import String, Integer, DateTime, Date, Time, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from src.models.groups import Group
    from src.models.subjects import Subject
    from src.models.teachers import Teacher
    from src.models.attendance import Attendance


class DayOfWeek(str, PyEnum):
    """Days of the week."""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"


class Schedule(Base):
    """
    Class schedule - links groups, subjects, teachers with time slots.
    All schedules are date-specific (no recurring templates).
    """
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"))

    # Schedule details - specific date only (no templates)
    specific_date: Mapped[date] = mapped_column(Date, index=True)
    
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    room: Mapped[str] = mapped_column(String(50))  # Аудитория

    # Semester info
    semester: Mapped[int] = mapped_column(Integer)  # 1 or 2
    academic_year: Mapped[str] = mapped_column(String(9))  # e.g., "2024-2025"

    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    group: Mapped["Group"] = relationship(back_populates="schedules")
    subject: Mapped["Subject"] = relationship(back_populates="schedules")
    teacher: Mapped["Teacher"] = relationship(back_populates="schedules")
    attendances: Mapped[List["Attendance"]] = relationship(back_populates="schedule")

    def __repr__(self):
        return f"<Schedule(id={self.id}, date={self.specific_date}, time={self.start_time}-{self.end_time})>"








