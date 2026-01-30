import os
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.security import HTTPBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import ValidationError as PydanticValidationError

from backend.src.api.router import main_router
from backend.src.exceptions import APIError, RateLimitError
from backend.src.schemas.errors import ErrorResponse

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# OpenAPI tags metadata for better documentation
tags_metadata = [
    {
        "name": "Authentication",
        "description": "Операции аутентификации: регистрация, вход, смена пароля",
    },
    {
        "name": "Users",
        "description": "Управление пользователями (только для админов)",
    },
    {
        "name": "Groups",
        "description": "Управление учебными группами",
    },
    {
        "name": "Students",
        "description": "Управление курсантами",
    },
    {
        "name": "Teachers",
        "description": "Управление преподавателями",
    },
    {
        "name": "Subjects",
        "description": "Управление учебными дисциплинами",
    },
    {
        "name": "Schedule",
        "description": "Расписание занятий",
    },
    {
        "name": "Attendance",
        "description": "Учёт посещаемости",
    },
    {
        "name": "Grades",
        "description": "Оценки и успеваемость",
    },
    {
        "name": "Assignments",
        "description": "Задания и домашние работы",
    },
    {
        "name": "Disciplinary",
        "description": "Дисциплинарные записи",
    },
    {
        "name": "Analytics",
        "description": "Аналитика и отчёты",
    },
    {
        "name": "Attachments",
        "description": "Файловые вложения к занятиям и заданиям",
    },
]

# Create FastAPI app with enhanced OpenAPI documentation
app = FastAPI(
    title="Military Journal API",
    description="""
## Электронный журнал для Военной кафедры КазУТБ

### Возможности API:
- 🔐 **Аутентификация** - JWT токены, регистрация, авторизация
- 👥 **Управление пользователями** - курсанты, преподаватели, администраторы
- 📚 **Учебный процесс** - расписание, посещаемость, оценки
- 📎 **Файлы** - загрузка материалов к занятиям
- 📊 **Аналитика** - статистика успеваемости

### Аутентификация:
Все защищённые эндпоинты требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

### Формат ошибок:
Все ошибки возвращаются в стандартном формате:
```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Описание ошибки",
        "details": [...]
    }
}
```
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=tags_metadata,
    license_info={
        "name": "MIT",
    },
    contact={
        "name": "Military Journal Support",
        "email": "support@military-journal.kz",
    },
    responses={
        401: {"model": ErrorResponse, "description": "Ошибка аутентификации"},
        403: {"model": ErrorResponse, "description": "Недостаточно прав"},
        404: {"model": ErrorResponse, "description": "Ресурс не найден"},
        422: {"model": ErrorResponse, "description": "Ошибка валидации"},
        429: {"model": ErrorResponse, "description": "Превышен лимит запросов"},
    },
)

# Add rate limiter to app state
app.state.limiter = limiter


# ==================== Exception Handlers ====================

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle custom API errors with standardized format."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic validation errors with detailed field information.
    Converts FastAPI/Pydantic errors to our standardized format.
    """
    errors = []
    for error in exc.errors():
        # Extract field path
        loc = error.get("loc", [])
        # Skip 'body' prefix if present
        field_parts = [str(part) for part in loc if part != "body"]
        field = ".".join(field_parts) if field_parts else "unknown"
        
        errors.append({
            "field": field,
            "message": error.get("msg", "Validation error"),
            "type": error.get("type", "value_error"),
            "input": error.get("input"),
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Ошибка валидации данных",
                "details": errors,
            }
        },
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Handle rate limit exceeded errors."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Слишком много запросов. Пожалуйста, подождите",
                "details": {
                    "retry_after": exc.detail if hasattr(exc, 'detail') else None,
                },
            }
        },
        headers={"Retry-After": str(60)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions.
    In production, this hides internal details.
    """
    import traceback
    
    # Log the full error for debugging
    print(f"Unexpected error: {exc}")
    traceback.print_exc()
    
    # In development, show more details
    is_debug = os.getenv("DEBUG", "false").lower() == "true"
    
    if is_debug:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": str(exc),
                    "details": {
                        "type": type(exc).__name__,
                        "traceback": traceback.format_exc(),
                    },
                }
            },
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Внутренняя ошибка сервера. Пожалуйста, попробуйте позже",
                    "details": None,
                }
            },
        )

# CORS configuration
origins = [
    "http://localhost:3000",  # React default port
    "http://localhost:5173",  # Vite default port
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
    # Add your production domain here
    # "https://yourapp.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(main_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Military Journal API",
        "description": "Электронный журнал для Военной кафедры КазУТБ",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/debug/token")
async def debug_token(authorization: str = None):
    """Debug endpoint to test token decoding."""
    from backend.src.security import decode_access_token
    
    if not authorization:
        return {"error": "No authorization header"}
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return {"error": "Invalid authorization format", "received": authorization[:50]}
    
    token = parts[1]
    payload = decode_access_token(token)
    
    if payload is None:
        return {"error": "Failed to decode token", "token_preview": token[:50] + "..."}
    
    return {"success": True, "payload": payload}


@app.get("/database-info")
async def database_info():
    """Get information about the database being used."""
    database_url = os.getenv("DATABASE_URL", "")

    # Parse the database type from the URL scheme
    if database_url.startswith("postgresql") or database_url.startswith("postgres"):
        db_type = "PostgreSQL"
    elif database_url.startswith("sqlite"):
        db_type = "SQLite"
    elif database_url.startswith("mysql"):
        db_type = "MySQL"
    elif database_url.startswith("mssql") or database_url.startswith("sqlserver"):
        db_type = "Microsoft SQL Server"
    elif database_url.startswith("oracle"):
        db_type = "Oracle"
    else:
        db_type = "Unknown"

    return {
        "database_type": db_type,
    }
