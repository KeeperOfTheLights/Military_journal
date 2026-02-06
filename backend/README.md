# Military Journal Backend

Backend API for the Military Journal application, built with FastAPI, SQLAlchemy, and PostgreSQL/SQLite.

## Documentation

*   [Development Guide](docs/development.md): Setup and running instructions.
*   [Database Guide](docs/database.md): Database configuration and migrations.

## Quick Start

1.  Setup environment: `uv sync`
2.  Configure env: `cp .env.example .env`
3.  Run migrations: `uv run alembic upgrade head`
4.  Start server: `uv run uvicorn src.main:app --reload`
