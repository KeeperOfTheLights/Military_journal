from datetime import datetime
from enum import Enum
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

from src.models.canvas import CanvasEngineType

class CanvasBase(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    engine_type: CanvasEngineType = CanvasEngineType.KONVA

class CanvasCreate(CanvasBase):
    pass

class CanvasUpdate(BaseModel):
    title: Optional[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]] = None
    engine_type: Optional[CanvasEngineType] = None

class CanvasRead(CanvasBase):
    id: int
    creator_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(extra="forbid")

    x: float
    y: float
    rotation: float = 0
    scaleX: float = Field(default=1, gt=0)
    scaleY: float = Field(default=1, gt=0)
    width: Optional[float] = Field(default=None, ge=0)
    height: Optional[float] = Field(default=None, ge=0)

class CanvasObjectStyle(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fill: Optional[str] = None
    stroke: Optional[str] = None
    strokeWidth: Optional[float] = Field(default=None, ge=0)
    opacity: Optional[float] = Field(default=1.0, ge=0, le=1)

    @field_validator("fill", "stroke")
    @classmethod
    def validate_color(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        color = value.strip()
        if color.startswith("#"):
            hex_len = len(color)
            if hex_len not in (4, 7, 9):
                raise ValueError("Invalid hex color format")
            return color
        if color.lower().startswith("rgb(") or color.lower().startswith("rgba("):
            return color
        raise ValueError("Color must be hex or rgb/rgba")

class CanvasObjectProperties(BaseModel):
    model_config = ConfigDict(extra="forbid")

    visible: bool = True
    locked: bool = False
    name: Optional[Annotated[str, StringConstraints(max_length=100)]] = None
    zIndex: int = 0

# --- Specific Fields ---

class TextField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: Annotated[str, StringConstraints(min_length=1, max_length=5000)]
    fontSize: int = Field(default=16, ge=8, le=200)
    fontFamily: Annotated[str, StringConstraints(max_length=100)] = "Arial"
    fontWeight: Annotated[str, StringConstraints(max_length=20)] = "normal"
    fontStyle: Annotated[str, StringConstraints(max_length=20)] = "normal"
    textDecoration: Annotated[str, StringConstraints(max_length=50)] = "none"
    textAlign: Literal["left", "center", "right", "justify"] = "left"
    color: str = "#000000"
    lineHeight: float = Field(default=1.2, ge=0.5)
    letterSpacing: float = 0

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        color = value.strip()
        if color.startswith("#") and len(color) in (4, 7, 9):
            return color
        if color.lower().startswith("rgb(") or color.lower().startswith("rgba("):
            return color
        raise ValueError("Color must be hex or rgb/rgba")

class ImageField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_id: int = Field(gt=0)
    # Allow extra fields for crop etc in future

class ShapeField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shapeType: ShapeType
    # Points for polygon/line
    points: Optional[List[float]] = None

    @model_validator(mode="after")
    def validate_points(self) -> "ShapeField":
        if self.shapeType in (ShapeType.POLYGON, ShapeType.LINE):
            if not self.points:
                raise ValueError("points are required for polygon and line shapes")
            if len(self.points) < 4 or len(self.points) % 2 != 0:
                raise ValueError("points must contain pairs of x,y coordinates")
        return self
    
class SymbolField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol_id: int = Field(gt=0)
    # Topographic specific properties could go here
    # e.g. modification flags

# --- Object Wrappers ---

class CanvasObjectBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    type: CanvasObjectType
    transform: CanvasObjectTransform
    style: Optional[CanvasObjectStyle] = None
    properties: Optional[CanvasObjectProperties] = None

class CanvasTextObject(CanvasObjectBase):
    type: Literal["text"]
    fields: TextField

class CanvasImageObject(CanvasObjectBase):
    type: Literal["image"]
    fields: ImageField

class CanvasShapeObject(CanvasObjectBase):
    type: Literal["shape"]
    fields: ShapeField

class CanvasSymbolObject(CanvasObjectBase):
    type: Literal["symbol"]
    fields: SymbolField

# Union of all object types
CanvasObject = Annotated[
    Union[
    CanvasTextObject, 
    CanvasImageObject, 
    CanvasShapeObject, 
    CanvasSymbolObject
    ],
    Field(discriminator="type"),
]


class CanvasBoardTransform(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: float = 0
    y: float = 0
    width: float = Field(default=800, gt=0)
    height: float = Field(default=600, gt=0)


class CanvasBoardFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    backgroundColor: str = "#ffffff"

    @field_validator("backgroundColor")
    @classmethod
    def validate_background_color(cls, value: str) -> str:
        color = value.strip()
        if color.startswith("#") and len(color) in (4, 7, 9):
            return color
        if color.lower().startswith("rgb(") or color.lower().startswith("rgba("):
            return color
        raise ValueError("backgroundColor must be hex or rgb/rgba")


class CanvasBoardObject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Literal["board"] = "board"
    type: Literal["board"] = "board"
    transform: CanvasBoardTransform = Field(default_factory=CanvasBoardTransform)
    fields: CanvasBoardFields = Field(default_factory=CanvasBoardFields)

# --- Content Root ---

class CanvasContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Annotated[str, StringConstraints(pattern=r"^\d+\.\d+(?:\.\d+)?$")] = "1.0.0"
    board: CanvasBoardObject = Field(default_factory=CanvasBoardObject)
    objects: List[CanvasObject] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
