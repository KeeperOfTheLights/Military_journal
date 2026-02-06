from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from models.subjects import Subject
    from models.teachers import Teacher
    from models.groups import Group


class Assignment(Base):
    """
    Assignments and tasks created by teachers.
    """
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"))
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # File attachments (store file paths or URLs)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    max_score: Mapped[float] = mapped_column(default=100)

    is_published: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    subject: Mapped["Subject"] = relationship(back_populates="assignments")
    teacher: Mapped["Teacher"] = relationship(back_populates="assignments")
    group: Mapped[Optional["Group"]] = relationship(back_populates="assignments")

    def __repr__(self):
        return f"<Assignment(id={self.id}, title='{self.title}')>"




