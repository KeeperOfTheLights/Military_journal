"""
Error response schemas for OpenAPI documentation.
These schemas define the structure of error responses for auto-generated frontend clients.
"""
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Single validation error detail."""
    field: str = Field(..., description="Field name that caused the error")
    message: str = Field(..., description="Error message for this field")
    type: str = Field(..., description="Error type (e.g., 'value_error', 'type_error')")
    input: Optional[Any] = Field(None, description="The invalid input value")

    class Config:
        json_schema_extra = {
            "example": {
                "field": "email",
                "message": "Некорректный формат email",
                "type": "value_error",
                "input": "invalid-email"
            }
        }


class ErrorBody(BaseModel):
    """Error body structure."""
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message in Russian")
    details: Optional[Union[List[ErrorDetail], Dict[str, Any]]] = Field(
        None,
        description="Additional error details (validation errors, context, etc.)"
    )


class ErrorResponse(BaseModel):
    """
    Standard error response format.
    All API errors follow this structure for consistent error handling.
    """
    error: ErrorBody

    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Ошибка валидации данных",
                    "details": [
                        {
                            "field": "email",
                            "message": "Некорректный формат email",
                            "type": "value_error",
                            "input": "invalid-email"
                        }
                    ]
                }
            }
        }


# Pre-defined error responses for OpenAPI documentation
class ValidationErrorResponse(ErrorResponse):
    """422 Validation Error response."""
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Ошибка валидации данных",
                    "details": [
                        {
                            "field": "password",
                            "message": "Пароль должен содержать минимум 8 символов",
                            "type": "value_error",
                            "input": "123"
                        }
                    ]
                }
            }
        }


class AuthenticationErrorResponse(ErrorResponse):
    """401 Authentication Error response."""
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Неверный email или пароль",
                    "details": None
                }
            }
        }


class AuthorizationErrorResponse(ErrorResponse):
    """403 Authorization Error response."""
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "INSUFFICIENT_PERMISSIONS",
                    "message": "У вас нет прав для выполнения этого действия",
                    "details": {
                        "required_roles": ["admin", "teacher"]
                    }
                }
            }
        }


class NotFoundErrorResponse(ErrorResponse):
    """404 Not Found Error response."""
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Студент не найден",
                    "details": {
                        "resource": "Student",
                        "id": 123
                    }
                }
            }
        }


class ConflictErrorResponse(ErrorResponse):
    """409 Conflict Error response."""
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "ALREADY_EXISTS",
                    "message": "Пользователь уже существует",
                    "details": {
                        "resource": "User",
                        "field": "email",
                        "value": "user@example.com"
                    }
                }
            }
        }


class RateLimitErrorResponse(ErrorResponse):
    """429 Rate Limit Error response."""
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Слишком много запросов. Пожалуйста, подождите",
                    "details": {
                        "retry_after_seconds": 60
                    }
                }
            }
        }


class FileErrorResponse(ErrorResponse):
    """400 File Error response."""
    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": "Файл слишком большой. Максимальный размер: 10 MB",
                    "details": {
                        "max_size_mb": 10,
                        "actual_size_mb": 15.5
                    }
                }
            }
        }


# Common error responses for OpenAPI documentation
COMMON_ERROR_RESPONSES = {
    401: {
        "model": AuthenticationErrorResponse,
        "description": "Authentication failed - invalid or missing token"
    },
    403: {
        "model": AuthorizationErrorResponse,
        "description": "Authorization failed - insufficient permissions"
    },
    404: {
        "model": NotFoundErrorResponse,
        "description": "Resource not found"
    },
    422: {
        "model": ValidationErrorResponse,
        "description": "Validation error - invalid input data"
    },
    429: {
        "model": RateLimitErrorResponse,
        "description": "Rate limit exceeded"
    },
}
