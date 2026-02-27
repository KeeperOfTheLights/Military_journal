from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.models.gamification import SymbolRenderType

from src.schemas.attachments import AttachmentRead

# --- Topographic Symbol Schemas ---

class TopographicSymbolBase(BaseModel):
    name: str
    description: Optional[str] = None
    render_type: SymbolRenderType = SymbolRenderType.FILE
    canvas_id: Optional[int] = None
    # attachment_ids are not in base, so they can't be set by default on create/update

class TopographicSymbolCreate(TopographicSymbolBase):
    @model_validator(mode='after')
    def validate_render_type_requirements(self):
        if self.render_type == SymbolRenderType.EDITOR and not self.canvas_id:
            raise ValueError("canvas_id is required when render_type is EDITOR")
        return self

class TopographicSymbolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    render_type: Optional[SymbolRenderType] = None
    canvas_id: Optional[int] = None

    @model_validator(mode='after')
    def validate_editor_requires_canvas(self):
        if self.render_type == SymbolRenderType.EDITOR and self.canvas_id is None:
            raise ValueError("canvas_id is required when render_type is EDITOR")
        return self

class TopographicSymbolRead(TopographicSymbolBase):
    id: int
    # file_path: Optional[str] = None # Removed
    # thumbnail_path: Optional[str] = None # Removed
    
    attachment: Optional[AttachmentRead] = None
    thumbnail_attachment: Optional[AttachmentRead] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Map Board Schemas ---

class MapBoardBase(BaseModel):
    name: str
    canvas_id: int

class MapBoardCreate(MapBoardBase):
    symbol_ids: Optional[List[int]] = []

class MapBoardUpdate(BaseModel):
    name: Optional[str] = None
    canvas_id: Optional[int] = None
    symbol_ids: Optional[List[int]] = None

class MapBoardRead(MapBoardBase):
    id: int
    symbols: List[TopographicSymbolRead] = []

    model_config = ConfigDict(from_attributes=True)
