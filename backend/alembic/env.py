from logging.config import fileConfig
import os
import sys
from pathlib import Path
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

# Add project root to sys.path
# This file is in backend/alembic/env.py. 
# We want the backend root directory.
current_file = Path(__file__).resolve()
project_root = current_file.parents[1] # backend/alembic -> backend
sys.path.append(str(project_root))

# Load environment variables
load_dotenv(project_root / ".env")

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get DATABASE_URL
database_url = os.getenv("DATABASE_URL")
if not database_url:
    # Fallback to config 
    database_url = config.get_main_option("sqlalchemy.url")

if database_url:
    # Alembic MUST use sync driver
    if "postgresql+asyncpg" in database_url:
        database_url = database_url.replace("postgresql+asyncpg", "postgresql+psycopg2")
    # Handle SQLite async driver for Alembic/sync
    if "sqlite+aiosqlite" in database_url:
        database_url = database_url.replace("sqlite+aiosqlite", "sqlite")
        
    config.set_main_option("sqlalchemy.url", database_url)

# Import Base and all models for autogenerate support
try:
    from src.database import Base
    from src.models import (
        User,
        Group,
        Subject,
        Student,
        Teacher,
        Schedule,
        Attendance,
        Grade,
        Assignment,
        DisciplinaryRecord,
    )
    target_metadata = Base.metadata
except ImportError as e:
    print(f"Error importing models: {e}")
    target_metadata = None

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
