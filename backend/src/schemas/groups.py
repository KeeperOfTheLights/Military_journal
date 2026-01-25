from datetime import datetime
from pydantic import BaseModel, field_validator
from typing import Optional


class GroupCreate(BaseModel):
    """Schema for creating a new group."""
    name: str  # e.g., "ВК-21-1"
    course: int
    year: int

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Group name must be at least 2 characters')
        if len(v) > 50:
            raise ValueError('Group name must not exceed 50 characters')
        return v

    @field_validator('course')
    @classmethod
    def validate_course(cls, v: int) -> int:
        if v < 1 or v > 6:
            raise ValueError('Course must be between 1 and 6')
        return v


class GroupRead(BaseModel):
    """Schema for reading group information."""
    id: int
    name: str
    course: int
    year: int
    created_at: datetime

    class Config:
        from_attributes = True


class GroupUpdate(BaseModel):
    """Schema for updating group information."""
    name: Optional[str] = None
    course: Optional[int] = None
    year: Optional[int] = None

    @field_validator('course')
    @classmethod
    def validate_course(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 6):
            raise ValueError('Course must be between 1 and 6')
        return v








