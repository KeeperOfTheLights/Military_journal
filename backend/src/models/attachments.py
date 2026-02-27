"""
Attachment model for file uploads.
Supports attachments for schedules/lessons, assignments, and other entities.
"""
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Enum, func, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from src.models.users import User
    from src.models.schedule import Schedule
    from src.models.assignments import Assignment


class AttachmentType(str, PyEnum):
    """Types of attachments."""
    DOCUMENT = "document"      # PDF, DOC, etc.
    IMAGE = "image"            # JPG, PNG, etc.
    VIDEO = "video"            # MP4, etc.
    AUDIO = "audio"            # MP3, etc.
    ARCHIVE = "archive"        # ZIP, RAR, etc.
    OTHER = "other"


class AttachmentEntity(str, PyEnum):
    """
    Entity types that can have attachments.
    Allows flexible attachment to different models.
    """
    SCHEDULE = "schedule"       # Lesson materials
    ASSIGNMENT = "assignment"   # Assignment files
    SYMBOL = "symbol"           # Map board symbols
    # Future extensibility:
    # STUDENT = "student"       # Student documents
    # TEACHER = "teacher"       # Teacher documents
    # GROUP = "group"           # Group materials


class Attachment(Base):
    """
    File attachment model.
    
    Flexible design allows attaching files to different entities
    (schedules, assignments, etc.) via entity_type and entity_id.
    
    Supports both local storage and AWS S3 through the storage_backend field.
    """
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Polymorphic association - attach to different entity types
    entity_type: Mapped[AttachmentEntity] = mapped_column(
        Enum(AttachmentEntity),
        index=True,
        comment="Type of entity this attachment belongs to"
    )
    entity_id: Mapped[int] = mapped_column(
        Integer,
        index=True,
        comment="ID of the entity this attachment belongs to"
    )
    
    # File metadata
    original_filename: Mapped[str] = mapped_column(
        String(255),
        comment="Original filename uploaded by user"
    )
    storage_key: Mapped[str] = mapped_column(
        String(500),
        unique=True,
        index=True,
        comment="Unique key/path in storage system"
    )
    content_type: Mapped[str] = mapped_column(
        String(100),
        comment="MIME type of the file"
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        comment="File size in bytes"
    )
    checksum: Mapped[str] = mapped_column(
        String(32),
        comment="MD5 checksum for integrity verification"
    )
    
    # Storage info
    storage_backend: Mapped[str] = mapped_column(
        String(20),
        default="local",
        comment="Storage backend: 'local' or 's3'"
    )
    
    # Classification
    attachment_type: Mapped[AttachmentType] = mapped_column(
        Enum(AttachmentType),
        default=AttachmentType.DOCUMENT,
        comment="Type/category of attachment"
    )
    
    # Optional metadata
    title: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Display title (if different from filename)"
    )
    url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="Public URL for the attachment"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Optional description of the attachment"
    )
    
    # Ownership and audit
    uploaded_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        comment="User who uploaded the file"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )
    
    # Soft delete support
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Soft delete timestamp"
    )
    
    # Relationships
    uploaded_by: Mapped["User"] = relationship(
        back_populates="attachments",
        foreign_keys=[uploaded_by_id]
    )
    
    @property
    def is_deleted(self) -> bool:
        """Check if attachment is soft-deleted."""
        return self.deleted_at is not None
    
    @property
    def file_size_mb(self) -> float:
        """Get file size in megabytes."""
        return round(self.file_size / (1024 * 1024), 2)
    
    @property
    def file_extension(self) -> str:
        """Get file extension."""
        if '.' in self.original_filename:
            return self.original_filename.rsplit('.', 1)[-1].lower()
        return ''
    
    @classmethod
    def determine_type(cls, content_type: str, filename: str) -> AttachmentType:
        """Determine attachment type from content type and filename."""
        content_type = content_type.lower()
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        
        # Check by MIME type
        if content_type.startswith('image/'):
            return AttachmentType.IMAGE
        elif content_type.startswith('video/'):
            return AttachmentType.VIDEO
        elif content_type.startswith('audio/'):
            return AttachmentType.AUDIO
        elif content_type in ('application/pdf', 'application/msword',
                               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                               'application/vnd.ms-excel',
                               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                               'application/vnd.ms-powerpoint',
                               'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                               'text/plain', 'text/rtf'):
            return AttachmentType.DOCUMENT
        elif content_type in ('application/zip', 'application/x-rar-compressed',
                               'application/x-7z-compressed', 'application/gzip',
                               'application/x-tar'):
            return AttachmentType.ARCHIVE
        
        # Fallback to extension check
        if ext in ('jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'):
            return AttachmentType.IMAGE
        elif ext in ('mp4', 'avi', 'mov', 'mkv', 'webm'):
            return AttachmentType.VIDEO
        elif ext in ('mp3', 'wav', 'ogg', 'flac', 'm4a'):
            return AttachmentType.AUDIO
        elif ext in ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'):
            return AttachmentType.DOCUMENT
        elif ext in ('zip', 'rar', '7z', 'tar', 'gz'):
            return AttachmentType.ARCHIVE
        
        return AttachmentType.OTHER
    
    def __repr__(self):
        return f"<Attachment(id={self.id}, filename='{self.original_filename}', entity={self.entity_type}:{self.entity_id})>"
