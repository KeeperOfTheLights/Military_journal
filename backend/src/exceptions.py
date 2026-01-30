"""
Custom exceptions for the Military Journal API.
Provides standardized error handling with detailed error responses.
"""
from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException, status


class APIError(HTTPException):
    """
    Base API error with standardized error format.
    
    Error response format:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message",
            "details": [...] or {...} or null
        }
    }
    """
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": details,
                }
            },
            headers=headers,
        )


# ==================== Authentication Errors ====================

class AuthenticationError(APIError):
    """Base authentication error."""
    def __init__(
        self,
        code: str = "AUTHENTICATION_ERROR",
        message: str = "Authentication failed",
        details: Optional[Union[List, Dict]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=code,
            message=message,
            details=details,
            headers={"WWW-Authenticate": "Bearer"},
        )


class InvalidCredentialsError(AuthenticationError):
    """Invalid email or password."""
    def __init__(self):
        super().__init__(
            code="INVALID_CREDENTIALS",
            message="Неверный email или пароль",
        )


class InvalidTokenError(AuthenticationError):
    """Invalid or expired JWT token."""
    def __init__(self, reason: str = "Token is invalid or expired"):
        super().__init__(
            code="INVALID_TOKEN",
            message="Недействительный токен авторизации",
            details={"reason": reason},
        )


class TokenExpiredError(AuthenticationError):
    """JWT token has expired."""
    def __init__(self):
        super().__init__(
            code="TOKEN_EXPIRED",
            message="Токен авторизации истёк. Пожалуйста, войдите снова",
        )


class MissingTokenError(AuthenticationError):
    """No token provided."""
    def __init__(self):
        super().__init__(
            code="MISSING_TOKEN",
            message="Требуется авторизация",
        )


# ==================== Authorization Errors ====================

class AuthorizationError(APIError):
    """Base authorization/permission error."""
    def __init__(
        self,
        code: str = "AUTHORIZATION_ERROR",
        message: str = "Access denied",
        details: Optional[Union[List, Dict]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code=code,
            message=message,
            details=details,
        )


class InsufficientPermissionsError(AuthorizationError):
    """User doesn't have required permissions/roles."""
    def __init__(self, required_roles: Optional[List[str]] = None):
        details = None
        if required_roles:
            details = {"required_roles": required_roles}
        super().__init__(
            code="INSUFFICIENT_PERMISSIONS",
            message="У вас нет прав для выполнения этого действия",
            details=details,
        )


class AccountDeactivatedError(AuthorizationError):
    """User account is deactivated."""
    def __init__(self):
        super().__init__(
            code="ACCOUNT_DEACTIVATED",
            message="Ваш аккаунт деактивирован. Обратитесь к администратору",
        )


# ==================== Validation Errors ====================

class ValidationError(APIError):
    """Validation error with field-level details."""
    def __init__(
        self,
        message: str = "Ошибка валидации данных",
        errors: Optional[List[Dict[str, Any]]] = None,
    ):
        """
        Args:
            message: General error message
            errors: List of field errors in format:
                [
                    {
                        "field": "email",
                        "message": "Invalid email format",
                        "type": "value_error",
                        "input": "invalid-email"
                    }
                ]
        """
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=message,
            details=errors,
        )


# ==================== Resource Errors ====================

class NotFoundError(APIError):
    """Resource not found."""
    def __init__(
        self,
        resource: str = "Resource",
        resource_id: Optional[Union[int, str]] = None,
    ):
        details = {"resource": resource}
        if resource_id is not None:
            details["id"] = resource_id
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"{resource} не найден",
            details=details,
        )


class AlreadyExistsError(APIError):
    """Resource already exists (conflict)."""
    def __init__(
        self,
        resource: str = "Resource",
        field: Optional[str] = None,
        value: Optional[Any] = None,
    ):
        details = {"resource": resource}
        if field:
            details["field"] = field
        if value:
            details["value"] = value
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code="ALREADY_EXISTS",
            message=f"{resource} уже существует",
            details=details,
        )


class DependencyError(APIError):
    """Cannot delete/modify due to dependencies."""
    def __init__(
        self,
        resource: str,
        dependency: str,
        message: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="DEPENDENCY_ERROR",
            message=message or f"Невозможно удалить {resource}, так как есть связанные {dependency}",
            details={"resource": resource, "dependency": dependency},
        )


# ==================== File/Storage Errors ====================

class FileError(APIError):
    """Base file operation error."""
    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Dict] = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=code,
            message=message,
            details=details,
        )


class FileTooLargeError(FileError):
    """File exceeds maximum allowed size."""
    def __init__(self, max_size_mb: int, actual_size_mb: float):
        super().__init__(
            code="FILE_TOO_LARGE",
            message=f"Файл слишком большой. Максимальный размер: {max_size_mb} MB",
            details={
                "max_size_mb": max_size_mb,
                "actual_size_mb": round(actual_size_mb, 2),
            },
        )


class InvalidFileTypeError(FileError):
    """File type is not allowed."""
    def __init__(self, file_type: str, allowed_types: List[str]):
        super().__init__(
            code="INVALID_FILE_TYPE",
            message=f"Недопустимый тип файла: {file_type}",
            details={
                "file_type": file_type,
                "allowed_types": allowed_types,
            },
        )


class StorageError(FileError):
    """Storage operation failed."""
    def __init__(self, operation: str, message: str):
        super().__init__(
            code="STORAGE_ERROR",
            message=f"Ошибка хранилища при операции '{operation}': {message}",
            details={"operation": operation},
        )


# ==================== Business Logic Errors ====================

class BusinessLogicError(APIError):
    """General business logic error."""
    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Dict] = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=code,
            message=message,
            details=details,
        )


class RateLimitError(APIError):
    """Rate limit exceeded."""
    def __init__(self, retry_after: Optional[int] = None):
        headers = {}
        if retry_after:
            headers["Retry-After"] = str(retry_after)
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMIT_EXCEEDED",
            message="Слишком много запросов. Пожалуйста, подождите",
            details={"retry_after_seconds": retry_after} if retry_after else None,
            headers=headers if headers else None,
        )
