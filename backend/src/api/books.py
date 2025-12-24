import uvicorn
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.src.api.dependencies import SessionDep
from backend.src.database import Base, engine, get_db
from backend.src.models.books import BookModel, Book
from backend.src.schemas.books import BookAddSchema, UserAgeSchema

router = APIRouter()

users = []

@router.get("/db-check")
async def db_check(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    print(engine.url)
    return {"database": "connected", "result": result.scalar()}

@router.post("/setup_database")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    return {"success": True}


@router.post("/booksAlchemy")
async def books_alchemy(data: BookAddSchema, session : SessionDep):
    new_book = BookModel(title=data.title, author=data.author)
    session.add(new_book)
    await session.commit()
    return {"success": True}

@router.get("/booksAlchemy")
async def get_books_alchemy(session : SessionDep):
    query = select(BookModel)
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/users")
def create_user(user: UserAgeSchema):
    users.append(user)
    return {"ok" : True, "message" : "User created"}

@router.get("/users")
def get_users() -> list[UserAgeSchema]:
    return users
