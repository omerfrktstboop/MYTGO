from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.models.enums import ValetStatus
from app.schemas.base import ORMModel


class ValetTransferCreate(ORMModel):
    appointment_id: int | None = None
    pickup_address: str = Field(min_length=3, max_length=255)
    dropoff_address: str = Field(min_length=3, max_length=255)


class ValetTransferUpdate(ORMModel):
    valet_id: int | None = None
    status: ValetStatus | None = None


class ValetLocationPayload(ORMModel):
    latitude: Decimal
    longitude: Decimal


class ValetTransferRead(ORMModel):
    id: int
    appointment_id: int | None = None
    customer_id: int
    valet_id: int | None = None
    pickup_address: str
    dropoff_address: str
    status: ValetStatus
    current_latitude: Decimal | None = None
    current_longitude: Decimal | None = None
    last_location_at: datetime | None = None
