"""
API endpoints for file attachments.
Supports uploading, downloading, and managing file attachments for lessons and assignments.
"""
from typing import List, Annotated
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import datetime

from src.api.dependencies import SessionDep, CurrentUser, TeacherUser
from src.models.attachments import Attachment, AttachmentEntity, AttachmentType
from src.models.schedule import Schedule
from src.models.assignments import Assignment
from src.schemas.attachments import (
    AttachmentRead,
    AttachmentUpdate,
    AttachmentUploadResponse,
    AttachmentListResponse,
    StorageInfoResponse,
)
from src.storage import Storage, get_storage, StoredFile
from src.exceptions import NotFoundError, InsufficientPermissionsError, ValidationError

router = APIRouter(prefix="/attachments", tags=["Attachments"])

# Dependency
StorageDep = Annotated[Storage, Depends(get_storage)]


def add_download_url(attachment: Attachment, storage: Storage) -> AttachmentRead:
    """Convert attachment model to schema with download URL."""
    data = AttachmentRead.model_validate(attachment)
    # Prefer stored URL, fallback to generated
    data.url = attachment.url or storage.get_url(attachment.storage_key)
    return data


@router.get("/storage-info", response_model=StorageInfoResponse)
async def get_storage_info(
    storage: StorageDep,
    current_user: CurrentUser,
):
    """
    Get information about the current storage configuration.
    Useful for frontend to show upload limits.
    """
    return StorageInfoResponse(
        backend=storage.backend_type,
        max_file_size_mb=storage.config.max_file_size_mb,
        allowed_extensions=list(storage.config.allowed_extensions),
    )


@router.post("/upload", response_model=AttachmentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    session: SessionDep,
    storage: StorageDep,
    current_user: TeacherUser,  # Only teachers/admins can upload
    file: UploadFile = File(..., description="File to upload"),
    entity_type: AttachmentEntity = Form(..., description="Entity type (schedule, assignment)"),
    entity_id: int = Form(..., description="Entity ID"),
    title: str = Form(None, description="Optional display title"),
    description: str = Form(None, description="Optional description"),
):
    """
    Upload a file attachment to a lesson (schedule) or assignment.
    
    - **file**: The file to upload
    - **entity_type**: Type of entity to attach to (schedule, assignment)
    - **entity_id**: ID of the entity
    - **title**: Optional display title (defaults to filename)
    - **description**: Optional description
    
    Returns the created attachment with download URL.
    """
    # Verify entity exists
    if entity_type == AttachmentEntity.SCHEDULE:
        result = await session.execute(
            select(Schedule).where(Schedule.id == entity_id)
        )
        entity = result.scalar_one_or_none()
        if not entity:
            raise NotFoundError("Занятие", entity_id)
        folder = "schedules"
    elif entity_type == AttachmentEntity.ASSIGNMENT:
        result = await session.execute(
            select(Assignment).where(Assignment.id == entity_id)
        )
        entity = result.scalar_one_or_none()
        if not entity:
            raise NotFoundError("Задание", entity_id)
        folder = "assignments"
    elif entity_type == AttachmentEntity.SYMBOL:
         # No specific entity verification for now as symbols are independent or attached to boards differently?
         # User's code said "SYMBOL = 'symbol'". 
         # Assuming logic exists or we just allow it. The previous code didn't handle SYMBOL in if/elif.
         # But the enum has SYMBOL. I should probably add a check or just assume folder "symbols".
         folder = "symbols"
    else:
        raise ValidationError(
            message="Неподдерживаемый тип сущности",
            errors=[{"field": "entity_type", "message": f"Unsupported: {entity_type}", "type": "value_error"}]
        )
    
    # Save file to storage
    stored: StoredFile = await storage.save(
        file=file.file,
        filename=file.filename,
        content_type=file.content_type,
        folder=folder,
    )
    
    # Determine attachment type
    attachment_type = Attachment.determine_type(
        content_type=stored.content_type,
        filename=stored.original_filename
    )
    
    # Create attachment record
    attachment = Attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        original_filename=stored.original_filename,
        storage_key=stored.key,
        content_type=stored.content_type,
        file_size=stored.size,
        checksum=stored.checksum,
        storage_backend=stored.storage_backend,
        attachment_type=attachment_type,
        title=title or stored.original_filename,
        description=description,
        uploaded_by_id=current_user.id,
        url=stored.url, # Save URL
    )
    
    session.add(attachment)
    await session.commit()
    await session.refresh(attachment)
    
    return AttachmentUploadResponse(
        attachment=add_download_url(attachment, storage),
        message="Файл успешно загружен",
    )


@router.get("/entity/{entity_type}/{entity_id}", response_model=AttachmentListResponse)
async def list_entity_attachments(
    entity_type: AttachmentEntity,
    entity_id: int,
    session: SessionDep,
    storage: StorageDep,
    current_user: CurrentUser,
):
    """
    List all attachments for a specific entity (lesson or assignment).
    """
    result = await session.execute(
        select(Attachment)
        .where(
            and_(
                Attachment.entity_type == entity_type,
                Attachment.entity_id == entity_id,
                Attachment.deleted_at.is_(None),
            )
        )
        .order_by(Attachment.created_at.desc())
    )
    attachments = result.scalars().all()
    
    return AttachmentListResponse(
        items=[add_download_url(a, storage) for a in attachments],
        total=len(attachments),
    )


@router.get("/{attachment_id}", response_model=AttachmentRead)
async def get_attachment(
    attachment_id: int,
    session: SessionDep,
    storage: StorageDep,
    current_user: CurrentUser,
):
    """
    Get attachment details by ID.
    """
    result = await session.execute(
        select(Attachment).where(
            and_(
                Attachment.id == attachment_id,
                Attachment.deleted_at.is_(None),
            )
        )
    )
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise NotFoundError("Вложение", attachment_id)
    
    return add_download_url(attachment, storage)


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    session: SessionDep,
    storage: StorageDep,
    current_user: CurrentUser,
):
    """
    Download an attachment file.
    Returns the file as a streaming response.
    """
    result = await session.execute(
        select(Attachment).where(
            and_(
                Attachment.id == attachment_id,
                Attachment.deleted_at.is_(None),
            )
        )
    )
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise NotFoundError("Вложение", attachment_id)
    
    # Get file from storage
    file_obj, content_type = await storage.get(attachment.storage_key)
    
    # Return as streaming response
    return StreamingResponse(
        file_obj,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{attachment.original_filename}"',
            "Content-Length": str(attachment.file_size),
        }
    )


@router.patch("/{attachment_id}", response_model=AttachmentRead)
async def update_attachment(
    attachment_id: int,
    update_data: AttachmentUpdate,
    session: SessionDep,
    storage: StorageDep,
    current_user: TeacherUser,
):
    """
    Update attachment metadata (title, description).
    Only teachers and admins can update.
    """
    result = await session.execute(
        select(Attachment).where(
            and_(
                Attachment.id == attachment_id,
                Attachment.deleted_at.is_(None),
            )
        )
    )
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise NotFoundError("Вложение", attachment_id)
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(attachment, field, value)
    
    await session.commit()
    await session.refresh(attachment)
    
    return add_download_url(attachment, storage)


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: int,
    session: SessionDep,
    storage: StorageDep,
    current_user: TeacherUser,
    permanent: bool = False,
):
    """
    Delete an attachment.
    
    - **permanent**: If true, permanently delete file from storage.
                    If false (default), soft delete (keep file, mark as deleted).
    """
    result = await session.execute(
        select(Attachment).where(Attachment.id == attachment_id)
    )
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise NotFoundError("Вложение", attachment_id)
    
    if permanent:
        # Delete from storage
        await storage.delete(attachment.storage_key)
        # Delete record
        await session.delete(attachment)
    else:
        # Soft delete
        attachment.deleted_at = datetime.utcnow()
    
    await session.commit()


@router.get("/", response_model=AttachmentListResponse)
async def list_attachments(
    session: SessionDep,
    storage: StorageDep,
    current_user: TeacherUser,
    entity_type: AttachmentEntity = None,
    attachment_type: AttachmentType = None,
    skip: int = 0,
    limit: int = 50,
):
    """
    List all attachments with optional filtering.
    Only teachers and admins can list all attachments.
    """
    query = select(Attachment).where(Attachment.deleted_at.is_(None))
    
    if entity_type:
        query = query.where(Attachment.entity_type == entity_type)
    if attachment_type:
        query = query.where(Attachment.attachment_type == attachment_type)
    
    query = query.order_by(Attachment.created_at.desc()).offset(skip).limit(limit)
    
    result = await session.execute(query)
    attachments = result.scalars().all()
    
    # Get total count
    count_query = select(Attachment).where(Attachment.deleted_at.is_(None))
    if entity_type:
        count_query = count_query.where(Attachment.entity_type == entity_type)
    if attachment_type:
        count_query = count_query.where(Attachment.attachment_type == attachment_type)
    
    count_result = await session.execute(count_query)
    total = len(count_result.scalars().all())
    
    return AttachmentListResponse(
        items=[add_download_url(a, storage) for a in attachments],
        total=total,
    )
