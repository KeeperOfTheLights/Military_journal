"""
Pydantic schemas for file attachments.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Self

from src.models.attachments import AttachmentType, AttachmentEntity


class AttachmentCreate(BaseModel):
    """Schema for creating an attachment (metadata only, file sent separately)."""
    entity_type: AttachmentEntity = Field(
        ...,
        description="Type of entity to attach to (schedule, assignment)"
    )
    entity_id: int = Field(
        ...,
        description="ID of the entity to attach to"
    )
    title: Optional[str] = Field(
        None,
        max_length=255,
        description="Optional display title"
    )
    description: Optional[str] = Field(
        None,
        description="Optional description"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "entity_type": "schedule",
                "entity_id": 1,
                "title": "Лекция 1 - Введение",
                "description": "Материалы первой лекции по тактике"
            }
        }


class AttachmentRead(BaseModel):
    """Schema for reading attachment information."""
    id: int
    entity_type: AttachmentEntity
    entity_id: int
    
    original_filename: str
    storage_key: str
    content_type: str
    file_size: int
    attachment_type: AttachmentType
    storage_backend: str
    
    title: Optional[str] = None
    description: Optional[str] = None
    
    uploaded_by_id: int
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    file_size_mb: Optional[float] = None
    download_url: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "entity_type": "schedule",
                "entity_id": 5,
                "original_filename": "lecture_01.pdf",
                "storage_key": "schedules/20240115_abc123def456.pdf",
                "content_type": "application/pdf",
                "file_size": 2048576,
                "attachment_type": "document",
                "storage_backend": "local",
                "title": "Лекция 1 - Введение",
                "description": "Материалы первой лекции",
                "uploaded_by_id": 1,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "file_size_mb": 1.95,
                "download_url": "/api/files/schedules/20240115_abc123def456.pdf"
            }
        }
    
    @model_validator(mode='after')
    def compute_fields(self) -> Self:
        """Compute derived fields."""
        if self.file_size and not self.file_size_mb:
            self.file_size_mb = round(self.file_size / (1024 * 1024), 2)
        return self


class AttachmentUpdate(BaseModel):
    """Schema for updating attachment metadata."""
    title: Optional[str] = Field(
        None,
        max_length=255,
        description="Display title"
    )
    description: Optional[str] = Field(
        None,
        description="Description"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Лекция 1 - Обновленное название",
                "description": "Обновленное описание"
            }
        }


class AttachmentUploadResponse(BaseModel):
    """Response after successful file upload."""
    attachment: AttachmentRead
    message: str = "Файл успешно загружен"

    class Config:
        json_schema_extra = {
            "example": {
                "attachment": {
                    "id": 1,
                    "entity_type": "schedule",
                    "entity_id": 5,
                    "original_filename": "lecture_01.pdf",
                    "file_size_mb": 1.95
                },
                "message": "Файл успешно загружен"
            }
        }


class AttachmentListResponse(BaseModel):
    """Response for listing attachments."""
    items: List[AttachmentRead]
    total: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 0
            }
        }


class StorageInfoResponse(BaseModel):
    """Information about storage configuration."""
    backend: str = Field(..., description="Storage backend type: 'local' or 's3'")
    max_file_size_mb: int = Field(..., description="Maximum allowed file size in MB")
    allowed_extensions: List[str] = Field(..., description="List of allowed file extensions")

    class Config:
        json_schema_extra = {
            "example": {
                "backend": "local",
                "max_file_size_mb": 50,
                "allowed_extensions": [".pdf", ".doc", ".docx", ".jpg", ".png"]
            }
        }
