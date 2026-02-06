# Database Configuration

This project supports both SQLite (recommended for development) and PostgreSQL (recommended for production).

## Configuration

### Development (SQLite)

For local development, use SQLite (requires no server setup).
Set your `DATABASE_URL` in `.env` to:

```ini
DATABASE_URL=sqlite+aiosqlite:///./military_journal.db
```

### Production (PostgreSQL)

For production, use PostgreSQL.
Set your `DATABASE_URL` in `.env` to:

```ini
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
```

## Migrations (Alembic)

We use **Alembic** for database migrations.

### Initial Setup

If you are setting up the project for the first time or after pulling changes:

1.  **Apply existing migrations:**
    ```bash
    uv run alembic upgrade head
    ```

### Creating Migrations

When you modify models in `src/models/`, you must create a new migration.

1.  **Generate a migration script:**
    ```bash
    uv run alembic revision --autogenerate -m "description of changes"
    ```
    *   Check the generated file in `alembic/versions/` to verify the changes.

2.  **Apply the migration:**
    ```bash
    uv run alembic upgrade head
    ```

### Common Commands

*   **Upgrade to the latest version:**
    ```bash
    uv run alembic upgrade head
    ```
*   **Downgrade by one version:**
    ```bash
    uv run alembic downgrade -1
    ```
*   **Show current revision:**
    ```bash
    uv run alembic current
    ```
*   **Show history:**
    ```bash
    uv run alembic history
    ```
