from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from src.models.users import User
    from src.models.gamification import MapBoard, TopographicSymbol


class CanvasEngineType(str, PyEnum):
    """Engine type for the canvas editor."""
    KONVA = "konva"
    FABRIC = "fabric"



class Canvas(Base):
    """
    Canvas model for the canvas editor.
    Stores rich content as a string (JSON or other format).
    """
    __tablename__ = "canvases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Rich content stored as string
    engine_type: Mapped[CanvasEngineType] = mapped_column(Enum(CanvasEngineType), default=CanvasEngineType.KONVA)
    
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    creator: Mapped["User"] = relationship()
    map_board: Mapped[Optional["MapBoard"]] = relationship(back_populates="canvas", uselist=False)
    topographic_symbols: Mapped[list["TopographicSymbol"]] = relationship(back_populates="canvas")

    def __repr__(self):
        return f"<Canvas(id={self.id}, title='{self.title}', engine='{self.engine_type}')>"
