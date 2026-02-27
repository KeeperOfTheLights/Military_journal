from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from src.models.canvas import CanvasEngineType

class CanvasBase(BaseModel):
    title: str
    engine_type: CanvasEngineType = CanvasEngineType.KONVA

class CanvasCreate(CanvasBase):
    pass

class CanvasUpdate(BaseModel):
    title: Optional[str] = None
    engine_type: Optional[CanvasEngineType] = None

class CanvasRead(CanvasBase):
    id: int
    creator_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
from enum import Enum
from typing import List, Optional, Union, Dict, Any, Literal
from pydantic import BaseModel, Field

# --- Enums ---

class CanvasObjectType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    SHAPE = "shape"
    SYMBOL = "symbol"

class ShapeType(str, Enum):
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    POLYGON = "polygon"
    LINE = "line"

# --- Shared Properties ---

class CanvasObjectTransform(BaseModel):
    x: float
    y: float
    rotation: float = 0
    scaleX: float = 1
    scaleY: float = 1
    width: Optional[float] = None
    height: Optional[float] = None

class CanvasObjectStyle(BaseModel):
    items: Dict[str, Any] = Field(default_factory=dict)
    # Common ones can be typed if needed, but keeping flexible for now
    fill: Optional[str] = None
    stroke: Optional[str] = None
    strokeWidth: Optional[float] = None
    opacity: Optional[float] = 1.0

class CanvasObjectProperties(BaseModel):
    visible: bool = True
    locked: bool = False
    name: Optional[str] = None
    zIndex: int = 0

# --- Specific Fields ---

class TextField(BaseModel):
    text: str
    fontSize: int = 16
    fontFamily: str = "Arial"
    fontWeight: str = "normal"
    fontStyle: str = "normal"
    textDecoration: str = "none"
    textAlign: str = "left"
    color: str = "#000000"

class ImageField(BaseModel):
    image_id: int
    # Allow extra fields for crop etc in future

class ShapeField(BaseModel):
    shapeType: ShapeType
    # Points for polygon/line
    points: Optional[List[float]] = None
    
class SymbolField(BaseModel):
    symbol_id: int
    # Topographic specific properties could go here
    # e.g. modification flags

# --- Object Wrappers ---

class CanvasObjectBase(BaseModel):
    id: str
    type: CanvasObjectType
    transform: CanvasObjectTransform
    style: Optional[CanvasObjectStyle] = None
    properties: Optional[CanvasObjectProperties] = None

class CanvasTextObject(CanvasObjectBase):
    type: Literal[CanvasObjectType.TEXT]
    fields: TextField

class CanvasImageObject(CanvasObjectBase):
    type: Literal[CanvasObjectType.IMAGE]
    fields: ImageField

class CanvasShapeObject(CanvasObjectBase):
    type: Literal[CanvasObjectType.SHAPE]
    fields: ShapeField

class CanvasSymbolObject(CanvasObjectBase):
    type: Literal[CanvasObjectType.SYMBOL]
    fields: SymbolField

# Union of all object types
CanvasObject = Union[
    CanvasTextObject, 
    CanvasImageObject, 
    CanvasShapeObject, 
    CanvasSymbolObject
]

# --- Content Root ---

class CanvasContent(BaseModel):
    version: str = "1.0.0"
    canvasWidth: int = 800
    canvasHeight: int = 600
    backgroundColor: str = "#ffffff"
    objects: List[CanvasObject] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
