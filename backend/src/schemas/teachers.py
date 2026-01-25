from datetime import datetime, date
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class TeacherCreate(BaseModel):
    """Schema for creating a new teacher."""
    email: EmailStr
    password: str

    # Personal info
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    phone: Optional[str] = None

    # Military-specific
    military_rank: Optional[str] = None
    position: Optional[str] = None

    # Academic
    department: Optional[str] = None
    hire_date: Optional[date] = None
    bio: Optional[str] = None

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Name must not exceed 100 characters')
        return v


class TeacherRead(BaseModel):
    """Schema for reading teacher information."""
    id: int
    user_id: int

    first_name: str
    last_name: str
    middle_name: Optional[str]
    phone: Optional[str]

    military_rank: Optional[str]
    position: Optional[str]

    department: Optional[str]
    hire_date: Optional[date]
    bio: Optional[str]

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @property
    def full_name(self) -> str:
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        return " ".join(parts)


class TeacherUpdate(BaseModel):
    """Schema for updating teacher information."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    phone: Optional[str] = None
    military_rank: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    hire_date: Optional[date] = None
    bio: Optional[str] = None








