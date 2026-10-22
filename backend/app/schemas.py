from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class City(BaseModel):
    slug: str
    name: str
    timezone: str


class Session(BaseModel):
    id: str
    starts_at: datetime
    seats_left: int


class Event(BaseModel):
    id: str
    title: str
    category: str | None = None
    description: str = ""
    city: City
    place: str | None = None
    address: str | None = None
    image: str | None = None
    min_age: int = 0
    sessions: list[Session]
    source: str  # "kudago" | "mock"
    url: str | None = None


class ParticipantIn(BaseModel):
    name: str = Field(max_length=80)
    age: int


class OrderIn(BaseModel):
    session_id: str
    email: EmailStr
    participants: list[ParticipantIn]


class OrderLine(BaseModel):
    name: str
    age: int
    ticket: str
    price: int


class Order(BaseModel):
    id: str
    event_id: str
    event_title: str
    session_id: str
    starts_at: datetime
    email: str
    lines: list[OrderLine]
    total: int
    created_at: datetime
