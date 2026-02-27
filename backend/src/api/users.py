from typing import List
from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.dependencies import SessionDep, AdminUser, CurrentUser
from src.exceptions import NotFoundError, AuthorizationError
from src.models.users import User, UserRole
from src.schemas.users import UserRead, UserUpdate
from src.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=List[UserRead])
async def list_users(
    session: SessionDep,
    current_user: AdminUser,
    skip: int = 0,
    limit: int = 100,
    role: UserRole = None,
):
    """
    List all users (admin only).
    """
    query = select(User)
    if role:
        query = query.where(User.role == role)
    query = query.offset(skip).limit(limit)

    result = await session.execute(query)
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, session: SessionDep, current_user: CurrentUser):
    """
    Get user by ID.
    """
    # Users can only view their own profile unless admin
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise AuthorizationError()

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    session: SessionDep,
    current_user: AdminUser,
):
    """
    Update user information (admin only).
    """
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update fields
    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    await session.commit()
    await session.refresh(user)

    return UserRead.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, session: SessionDep, current_user: AdminUser):
    """
    Delete user (admin only). Actually deactivates the user.
    """
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Soft delete - deactivate instead of removing
    user.is_active = False
    await session.commit()
