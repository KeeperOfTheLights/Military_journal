from datetime import datetime
from pydantic import BaseModel, field_validator
from typing import Optional


class SubjectCreate(BaseModel):
    """Schema for creating a new subject."""
    name: str
    code: str  # e.g., "MIL-101"
    description: Optional[str] = None
    credits: int = 3

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Subject name must be at least 2 characters')
        if len(v) > 200:
            raise ValueError('Subject name must not exceed 200 characters')
        return v

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) < 2 or len(v) > 20:
            raise ValueError('Subject code must be 2-20 characters')
        return v

    @field_validator('credits')
    @classmethod
    def validate_credits(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError('Credits must be between 1 and 10')
        return v


class SubjectRead(BaseModel):
    """Schema for reading subject information."""
    id: int
    name: str
    code: str
    description: Optional[str]
    credits: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubjectUpdate(BaseModel):
    """Schema for updating subject information."""
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[int] = None








