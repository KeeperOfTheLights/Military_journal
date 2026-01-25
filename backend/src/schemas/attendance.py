from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional, List

from backend.src.models.attendance import AttendanceStatus
from backend.src.schemas.students import StudentRead


class AttendanceCreate(BaseModel):
    """Schema for creating a single attendance record."""
    student_id: int
    schedule_id: int
    date: date
    status: AttendanceStatus
    reason: Optional[str] = None


class AttendanceBulkCreate(BaseModel):
    """Schema for bulk attendance marking (entire class at once)."""
    schedule_id: int
    date: date
    records: List["AttendanceRecord"]


class AttendanceRecord(BaseModel):
    """Single student attendance record for bulk operations."""
    student_id: int
    status: AttendanceStatus
    reason: Optional[str] = None


class AttendanceRead(BaseModel):
    """Schema for reading attendance information."""
    id: int
    student_id: int
    schedule_id: int
    date: date
    status: AttendanceStatus
    reason: Optional[str]
    marked_at: datetime
    updated_at: datetime

    # Nested
    student: Optional[StudentRead] = None

    class Config:
        from_attributes = True


class AttendanceUpdate(BaseModel):
    """Schema for updating attendance information."""
    status: Optional[AttendanceStatus] = None
    reason: Optional[str] = None


# Rebuild model to resolve forward references
AttendanceBulkCreate.model_rebuild()








