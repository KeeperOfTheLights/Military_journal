from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, Enum, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING

from src.database import Base

if TYPE_CHECKING:
    from src.models.canvas import Canvas


class SymbolRenderType(str, PyEnum):
    """Render type for topographic symbols."""
    FILE = "file"
    EDITOR = "editor"



# Association table for MapBoard and TopographicSymbol
map_board_symbols = Table(
    "map_board_symbols",
    Base.metadata,
    Column("map_board_id", Integer, ForeignKey("map_boards.id"), primary_key=True),
    Column("symbol_id", Integer, ForeignKey("topographic_symbols.id"), primary_key=True),
)


class TopographicSymbol(Base):
    """
    Topographic symbol model.
    Can be a simple file upload or a canvas editor design.
    """
    __tablename__ = "topographic_symbols"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    render_type: Mapped[SymbolRenderType] = mapped_column(Enum(SymbolRenderType), default=SymbolRenderType.FILE)
    
    # If created via editor
    canvas_id: Mapped[Optional[int]] = mapped_column(ForeignKey("canvases.id"), nullable=True)
    
    # If created via file upload
    # If created via file upload
    attachment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("attachments.id"), nullable=True)
    thumbnail_attachment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("attachments.id"), nullable=True)
    
    # Relationships
    canvas: Mapped[Optional["Canvas"]] = relationship(back_populates="topographic_symbols")
    map_boards: Mapped[List["MapBoard"]] = relationship(secondary=map_board_symbols, back_populates="symbols")
    
    attachment: Mapped[Optional["Attachment"]] = relationship(foreign_keys=[attachment_id])
    thumbnail_attachment: Mapped[Optional["Attachment"]] = relationship(foreign_keys=[thumbnail_attachment_id])
    
    def __repr__(self):
        return f"<TopographicSymbol(id={self.id}, name='{self.name}', type='{self.render_type}')>"


class MapBoard(Base):
    """
    Map Board model.
    Represents a game board or map which is essentially a canvas.
    """
    __tablename__ = "map_boards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    
    canvas_id: Mapped[int] = mapped_column(ForeignKey("canvases.id"))
    
    # Relationships
    canvas: Mapped["Canvas"] = relationship(back_populates="map_board")
    symbols: Mapped[List["TopographicSymbol"]] = relationship(secondary=map_board_symbols, back_populates="map_boards")

    def __repr__(self):
        return f"<MapBoard(id={self.id}, name='{self.name}')>"
