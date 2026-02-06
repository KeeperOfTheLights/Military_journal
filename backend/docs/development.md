# Development Guide

## Environment Setup

This project uses `uv` for dependency management.

1.  **Create a virtual environment:**
    ```bash
    uv venv
    ```

2.  **Sync dependencies:**
    ```bash
    uv sync
    ```

3.  **Install additional dependencies (if needed):**
    ```bash
    uv add <package_name>
    ```

4.  **Activate the virtual environment (optional but recommended):**
    *   Windows: `.venv\Scripts\activate`
    *   Linux/macOS: `source .venv/bin/activate`

## Running the Application

To run the development server with hot reloads:

```bash
uv run uvicorn src.main:app --reload
```

## Database Management

### Migrations

*   **Initialize/Upgrade Database:**
    ```bash
    uv run alembic upgrade head
    ```

*   **Create New Migration:**
    ```bash
    uv run alembic revision --autogenerate -m "message"
    ```

### Reseting & Seeding Data

To **RESET THE DATABASE** (drop all tables) and populate it with fake test data:

```bash
uv run python scripts/reset_and_seed.py
```

This will create:
*   Admin user: `admin@kaztbu.edu.kz` / `password123`
*   Test groups (e.g., ВК-24-1)
*   Subjects
*   Fake students for each group

To only run seeding without resetting:
```bash
uv run python scripts/seed_data.py
```

## Configuration

1.  Copy `.env.example` to `.env`.
2.  Configure your environment variables in `.env`.
3.  See `database.md` for detailed database setup.
