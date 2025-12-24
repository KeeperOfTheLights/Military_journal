from pydantic import BaseModel,  Field, EmailStr

class BookAddSchema(BaseModel):
    title: str
    author: str

class BookSchemaAlchemy(BookAddSchema):
    id : int

class UserSchema(BaseModel):
    email: EmailStr
    bio: str | None = Field(max_length=200)

    #model_config = ConfigDict(extra='forbid') # extra fields are not allowed

class UserAgeSchema(UserSchema):
    age : int = Field(ge=0, le=130)
