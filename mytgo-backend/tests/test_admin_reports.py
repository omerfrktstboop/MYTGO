import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

os.environ["E-Cars_DATABASE_URL"] = "sqlite+aiosqlite:///./test_admin_reports.db"
os.environ["E-Cars_JWT_SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from sqlalchemy import delete  # noqa: E402

from app.models.appointment import Appointment  # noqa: E402
from app.models.enums import AppointmentStatus, ServiceType, UserRole, ValetStatus  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.valet import ValetTransfer  # noqa: E402
from app.models.vehicle import Vehicle  # noqa: E402

TEST_DB = Path("test_admin_reports.db")


def setup_module():
    if TEST_DB.exists():
        TEST_DB.unlink()


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(subject=str(user.id), role=user.role)
    return {"Authorization": f"Bearer {token}"}


async def seed_report_data() -> dict[str, User]:
    async with AsyncSessionLocal() as db:
        await db.execute(delete(ValetTransfer))
        await db.execute(delete(Appointment))
        await db.execute(delete(Vehicle))
        await db.execute(delete(User))
        await db.commit()

        password = hash_password("Password123!")
        admin = User(email="admin-report@mytgo.local", full_name="Admin", role=UserRole.ADMIN, hashed_password=password)
        customer = User(email="customer-report@mytgo.local", full_name="Customer", role=UserRole.CUSTOMER, hashed_password=password)
        mechanic = User(email="mechanic-report@mytgo.local", full_name="Mechanic", role=UserRole.MECHANIC, hashed_password=password)
        valet = User(email="valet-report@mytgo.local", full_name="Valet", role=UserRole.VALET, hashed_password=password)
        inactive_valet = User(email="inactive-valet-report@mytgo.local", full_name="Inactive", role=UserRole.VALET, hashed_password=password, is_active=False)
        db.add_all([admin, customer, mechanic, valet, inactive_valet])
        await db.flush()

        vehicle = Vehicle(owner_id=customer.id, plate_number="34RPR34", brand="Toyota", model="Corolla", year=2020)
        db.add(vehicle)
        await db.flush()

        in_range = datetime(2026, 6, 10, 9, 0, tzinfo=timezone.utc)
        out_of_range = datetime(2026, 5, 25, 9, 0, tzinfo=timezone.utc)
        appointments = [
            Appointment(customer_id=customer.id, vehicle_id=vehicle.id, mechanic_id=None, service_type=ServiceType.REPAIR, status=AppointmentStatus.PENDING, quote_amount_cents=None, created_at=in_range, updated_at=in_range),
            Appointment(customer_id=customer.id, vehicle_id=vehicle.id, mechanic_id=mechanic.id, service_type=ServiceType.REPAIR, status=AppointmentStatus.QUOTE_SENT, quote_amount_cents=420000, created_at=in_range, updated_at=in_range),
            Appointment(customer_id=customer.id, vehicle_id=vehicle.id, mechanic_id=mechanic.id, service_type=ServiceType.CLEANING, status=AppointmentStatus.APPROVED, quote_amount_cents=500000, created_at=in_range, updated_at=in_range),
            Appointment(customer_id=customer.id, vehicle_id=vehicle.id, mechanic_id=mechanic.id, service_type=ServiceType.REPAIR, status=AppointmentStatus.IN_PROGRESS, quote_amount_cents=100000, created_at=in_range, updated_at=in_range),
            Appointment(customer_id=customer.id, vehicle_id=vehicle.id, mechanic_id=mechanic.id, service_type=ServiceType.INSPECTION, status=AppointmentStatus.COMPLETED, quote_amount_cents=1240000, created_at=in_range, updated_at=in_range),
            Appointment(customer_id=customer.id, vehicle_id=vehicle.id, mechanic_id=mechanic.id, service_type=ServiceType.REPAIR, status=AppointmentStatus.CANCELLED, quote_amount_cents=999999, created_at=in_range, updated_at=in_range),
            Appointment(customer_id=customer.id, vehicle_id=vehicle.id, mechanic_id=mechanic.id, service_type=ServiceType.REPAIR, status=AppointmentStatus.COMPLETED, quote_amount_cents=777777, created_at=out_of_range, updated_at=out_of_range),
        ]
        db.add_all(appointments)

        valet_transfers = [
            ValetTransfer(customer_id=customer.id, valet_id=None, pickup_address="A", dropoff_address="B", status=ValetStatus.REQUESTED, created_at=in_range, updated_at=in_range),
            ValetTransfer(customer_id=customer.id, valet_id=valet.id, pickup_address="A", dropoff_address="B", status=ValetStatus.ASSIGNED, created_at=in_range, updated_at=in_range),
            ValetTransfer(customer_id=customer.id, valet_id=valet.id, pickup_address="A", dropoff_address="B", status=ValetStatus.DELIVERED, created_at=in_range, updated_at=in_range),
            ValetTransfer(customer_id=customer.id, valet_id=valet.id, pickup_address="A", dropoff_address="B", status=ValetStatus.CANCELLED, created_at=in_range, updated_at=in_range),
            ValetTransfer(customer_id=customer.id, valet_id=valet.id, pickup_address="A", dropoff_address="B", status=ValetStatus.DELIVERED, created_at=out_of_range, updated_at=out_of_range),
        ]
        db.add_all(valet_transfers)
        await db.commit()
        return {"admin": admin, "customer": customer}


def test_admin_reports_overview_requires_admin_role():
    with TestClient(app) as client:
        users = asyncio.run(seed_report_data())

        unauthenticated = client.get("/api/v1/admin/reports/overview")
        assert unauthenticated.status_code == 401

        forbidden = client.get(
            "/api/v1/admin/reports/overview",
            headers=auth_headers(users["customer"]),
        )
        assert forbidden.status_code == 403


def test_admin_reports_overview_returns_contract_aggregates_for_range():
    with TestClient(app) as client:
        users = asyncio.run(seed_report_data())

        response = client.get(
            "/api/v1/admin/reports/overview?from=2026-06-01&to=2026-07-01&timezone=Europe/Istanbul",
            headers=auth_headers(users["admin"]),
        )

        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["range"] == {
            "from": "2026-06-01T00:00:00+03:00",
            "to": "2026-07-01T00:00:00+03:00",
            "timezone": "Europe/Istanbul",
        }
        assert payload["summary"] == {"total_appointments": 6, "total_valet_requests": 4}
        assert payload["completed_jobs"] == {"appointments": 1, "valet_deliveries": 1, "total": 2}
        assert payload["revenue"]["approved_quote_amount_cents"] == 1840000
        assert payload["revenue"]["completed_amount_cents"] == 1240000
        assert payload["revenue"]["pending_quote_amount_cents"] == 420000
        assert payload["revenue"]["average_completed_amount_cents"] == 1240000
        assert payload["revenue"]["formatted"]["completed_amount"] == "₺12.400"
        assert payload["operations"]["active_appointments"] == 4
        assert payload["operations"]["active_valet_transfers"] == 2
        assert payload["operations"]["unassigned_appointments"] == 1
        assert payload["operations"]["unassigned_valet_transfers"] == 1
        assert payload["operations"]["appointment_cancellation_rate"] == 16.7
        assert payload["operations"]["valet_cancellation_rate"] == 25.0
        assert payload["operations"]["active_users_by_role"] == [
            {"role": "customer", "label": "Müşteri", "count": 1},
            {"role": "mechanic", "label": "Usta", "count": 1},
            {"role": "valet", "label": "Vale", "count": 1},
            {"role": "admin", "label": "Admin", "count": 1},
        ]
        appointment_distribution = {
            item["status"]: item for item in payload["status_distribution"]["appointments"]
        }
        assert appointment_distribution["completed"] == {
            "status": "completed",
            "label": "Tamamlandı",
            "group": "completed",
            "count": 1,
            "percentage": 16.7,
        }
        valet_distribution = {
            item["status"]: item for item in payload["status_distribution"]["valet_requests"]
        }
        assert valet_distribution["picking_up"]["count"] == 0
        assert valet_distribution["cancelled"]["percentage"] == 25.0


def test_admin_reports_overview_validates_range_and_zero_status_toggle():
    with TestClient(app) as client:
        users = asyncio.run(seed_report_data())

        invalid = client.get(
            "/api/v1/admin/reports/overview?from=2026-07-01&to=2026-06-01",
            headers=auth_headers(users["admin"]),
        )
        assert invalid.status_code == 422
        assert invalid.json()["detail"] == "Invalid report range"

        empty = client.get(
            "/api/v1/admin/reports/overview?from=2026-08-01&to=2026-09-01&include_zero_statuses=false",
            headers=auth_headers(users["admin"]),
        )
        assert empty.status_code == 200, empty.text
        payload = empty.json()
        assert payload["summary"] == {"total_appointments": 0, "total_valet_requests": 0}
        assert payload["status_distribution"] == {"appointments": [], "valet_requests": []}
        assert payload["revenue"]["approved_quote_amount_cents"] == 0
