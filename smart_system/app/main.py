from tokenize import String
from typing import List, Annotated

import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

app = FastAPI(title="Military Journal")
engine = create_async_engine('sqlite+aiosqlite:///books.db', echo=True)

new_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with new_session() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_db)]

class Base(DeclarativeBase): pass

class BookModel(Base):
    __tablename__ = "books"
    id : Mapped[int] = mapped_column(primary_key=True)
    title : Mapped[str]
    author : Mapped[str]

@app.post("/setup_database")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    return {"success": True}

class BookAddSchema(BaseModel):
    title: str
    author: str

class BookSchemaAlchemy(BookAddSchema):
    id : int

@app.post("/booksAlchemy")
async def books_alchemy(data: BookAddSchema, session : SessionDep):
    new_book = BookModel(title=data.title, author=data.author)
    session.add(new_book)
    await session.commit()
    return {"success": True}

books = [
    {
        "book_id" : 1,
        "title": "Mathematics",
        "author": "Me",
    },
    {
        "book_id" : 2,
        "title": "Science",
        "author": "ME",
    }
]

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)

@app.get("/book/{id}")
def get_book(id: int):
    for book in books:
        if book["book_id"] == id:
            return book
    else:
        raise HTTPException(status_code=404, detail="Book not found")

@app.get("/", summary="My summary", tags=["Main endpoints"])
def root():
    return {"message": "API is running"}

class Book(BaseModel):
    title: str
    author: str

data = {
    "email" : "abc@mail.ru",
    "bio" : None,
    "age" : 12,
    "gender" : "male",
    "birthday" : None,
}

class UserSchema(BaseModel):
    email: EmailStr
    bio: str | None = Field(max_length=200)

    #model_config = ConfigDict(extra='forbid') # extra fields are not allowed

class UserAgeSchema(UserSchema):
    age : int = Field(ge=0, le=130)

print(repr(UserAgeSchema(**data)))

users = []
@app.post("/users")
def create_user(user: UserAgeSchema):
    users.append(user)
    return {"ok" : True, "message" : "User created"}

@app.get("/users")
def get_users() -> list[UserAgeSchema]:
    return users

@app.post("/book/{id}")
def create_book(book: Book):
    books.append({
        "book_id" : len(books) + 1,
        "title" : book.title,
        "author" : book.author
    })
    return {"success": True, "book": book}