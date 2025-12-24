import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL" # fallback
)

engine = create_async_engine(
    DATABASE_URL,
    echo=True, #  set False in production
)

async_session = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

async def get_db():
    async with async_session() as session:
        yield session

class Base(DeclarativeBase):
    pass

