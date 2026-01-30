from datetime import timedelta, date
from fastapi import APIRouter, HTTPException, status

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from backend.src.api.dependencies import SessionDep, CurrentUser
from backend.src.models.users import User, UserRole
from backend.src.models.students import Student
from backend.src.models.teachers import Teacher
from backend.src.models.groups import Group
from backend.src.schemas.users import UserCreate, UserRead, UserLogin, TokenResponse
from backend.src.security import hash_password, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: SessionDep):
    """
    Register a new user account.
    Returns JWT token upon successful registration.
    """
    # Check if email already exists
    result = await session.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    try:
        new_user = User(
            email=user_data.email.lower(),
            password_hash=hash_password(user_data.password),
            role=user_data.role,
        )
        session.add(new_user)
        await session.flush()  # Get the user ID without committing
        
        # Create profile based on role
        if user_data.role == UserRole.STUDENT:
            # Validate group_id for students
            if not user_data.group_id:
                # Get default group or first available group
                result = await session.execute(select(Group).limit(1))
                default_group = result.scalar_one_or_none()
                if not default_group:
                    await session.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No groups available. Please contact administrator."
                    )
                group_id = default_group.id
            else:
                # Verify group exists
                result = await session.execute(
                    select(Group).where(Group.id == user_data.group_id)
                )
                if not result.scalar_one_or_none():
                    await session.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Selected group does not exist"
                    )
                group_id = user_data.group_id
            
            student = Student(
                user_id=new_user.id,
                group_id=group_id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                middle_name=user_data.middle_name,
                phone=user_data.phone,
                enrollment_date=date.today(),
            )
            session.add(student)
            
        elif user_data.role == UserRole.TEACHER:
            teacher = Teacher(
                user_id=new_user.id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                middle_name=user_data.middle_name,
                phone=user_data.phone,
            )
            session.add(teacher)
        
        await session.commit()
        await session.refresh(new_user)

        # Create access token - sub must be a string
        access_token = create_access_token(
            data={"sub": str(new_user.id), "role": new_user.role.value},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return TokenResponse(
            access_token=access_token,
            user=UserRead.model_validate(new_user)
        )

    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed"
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, session: SessionDep):
    """
    Authenticate user and return JWT token.
    """
    # Find user by email
    result = await session.execute(
        select(User).where(User.email == credentials.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Create access token - sub must be a string
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=access_token,
        user=UserRead.model_validate(user)
    )


@router.get("/me", response_model=UserRead)
async def get_current_user_info(current_user: CurrentUser):
    """
    Get current authenticated user information.
    """
    return UserRead.model_validate(current_user)


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(current_user: CurrentUser):
    """
    Refresh access token for authenticated user.
    Returns a new token with extended expiration time.
    """
    # Create new access token
    access_token = create_access_token(
        data={"sub": str(current_user.id), "role": current_user.role.value},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserRead.model_validate(current_user)
    )


@router.post("/change-password")
async def change_password(
    current_user: CurrentUser,
    session: SessionDep,
    old_password: str,
    new_password: str,
):
    """
    Change user password.
    """
    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )

    current_user.password_hash = hash_password(new_password)
    await session.commit()

    return {"message": "Password changed successfully"}



