from datetime import datetime, date
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, Self

from backend.src.schemas.groups import GroupRead


class StudentCreate(BaseModel):
    """Schema for creating a new student."""
    email: EmailStr
    password: str
    group_id: int

    # Personal info
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None

    # Military-specific
    military_id: Optional[str] = None
    rank: Optional[str] = None

    # Academic
    enrollment_date: date
    notes: Optional[str] = None

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Name must not exceed 100 characters')
        return v


class StudentRead(BaseModel):
    """Schema for reading student information."""
    id: int
    user_id: int
    group_id: int

    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None

    military_id: Optional[str] = None
    rank: Optional[str] = None

    enrollment_date: date
    notes: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    # Nested
    group: Optional[GroupRead] = None
    
    # Computed fields for frontend
    group_name: Optional[str] = None
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
    
    @model_validator(mode='after')
    def compute_fields(self) -> Self:
        """Compute group_name and full_name after model creation."""
        # Compute group_name from nested group
        if self.group:
            self.group_name = self.group.name
        # Compute full_name
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        self.full_name = " ".join(parts)
        return self


class StudentUpdate(BaseModel):
    """Schema for updating student information."""
    group_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None
    military_id: Optional[str] = None
    rank: Optional[str] = None
    notes: Optional[str] = None



