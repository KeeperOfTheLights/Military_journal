from pydantic import BaseModel
from sqlalchemy.orm import Mapped, mapped_column

from backend.src.database import Base

class BookModel(Base):
    __tablename__ = "books"
    id : Mapped[int] = mapped_column(primary_key=True)
    title : Mapped[str]
    author : Mapped[str]

class Book(BaseModel):
    title: str
    author: str