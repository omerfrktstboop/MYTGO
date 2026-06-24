from pydantic import Field

from app.models.enums import UserRole
from app.schemas.base import ORMModel


class UserBase(ORMModel):
    email: str = Field(min_length=3, max_length=255)
    phone: str | None = None
    full_name: str
    role: UserRole


class UserRead(UserBase):
    id: int
    is_active: bool


class UserCreate(ORMModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    role: UserRole = UserRole.CUSTOMER


class LoginRequest(ORMModel):
    email: str = Field(min_length=3, max_length=255)
    password: str


class TokenResponse(ORMModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
