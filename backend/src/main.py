import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.src.api.router import main_router

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="Military Journal API",
    description="Electronic journal system for Military Department of KazUTB",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
