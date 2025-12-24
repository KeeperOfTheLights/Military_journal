import uvicorn
from fastapi import APIRouter
from sqlalchemy import select

from backend.src.api.dependencies import SessionDep
from backend.src.database import Base, engine
from backend.src.models.books import BookModel, Book
from backend.src.schemas.books import BookAddSchema, UserAgeSchema

router = APIRouter()

users = []

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
