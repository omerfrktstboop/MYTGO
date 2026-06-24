from app.schemas.base import ORMModel


class VehicleCreate(ORMModel):
    plate_number: str
    brand: str
    model: str
    year: int | None = None


class VehicleRead(ORMModel):
    id: int
    owner_id: int
    plate_number: str
    brand: str
    model: str
    year: int | None = None
