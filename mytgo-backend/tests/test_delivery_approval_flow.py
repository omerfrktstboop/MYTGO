import os
from pathlib import Path
from uuid import uuid4

os.environ["MYTGO_DATABASE_URL"] = "sqlite+aiosqlite:///./test_mytgo.db"
os.environ["MYTGO_JWT_SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

TEST_DB = Path("test_mytgo.db")


def setup_module():
    if TEST_DB.exists():
        TEST_DB.unlink()


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register(client: TestClient, email: str, role: str) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": email.split("@")[0],
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_appointment(client: TestClient) -> tuple[dict, dict, dict]:
    suffix = uuid4().hex[:8]
    customer = register(client, f"delivery-customer-{suffix}@mytgo.local", "customer")
    mechanic = register(client, f"delivery-mechanic-{suffix}@mytgo.local", "mechanic")

    vehicle_response = client.post(
        "/api/v1/vehicles",
        headers=auth_headers(customer["access_token"]),
        json={"plate_number": f"34T{suffix[:6].upper()}", "brand": "Fiat", "model": "Egea"},
    )
    assert vehicle_response.status_code == 201, vehicle_response.text

    appointment_response = client.post(
        "/api/v1/appointments",
        headers=auth_headers(customer["access_token"]),
        json={
            "vehicle_id": vehicle_response.json()["id"],
            "service_type": "repair",
            "service_address": "MYTGO Sanayi",
        },
    )
    assert appointment_response.status_code == 201, appointment_response.text
    return customer, mechanic, appointment_response.json()


def test_mechanic_records_photo_handover_and_customer_digital_approval():
    with TestClient(app) as client:
        customer, mechanic, appointment = create_appointment(client)

        handover_response = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(mechanic["access_token"]),
            json={
                "pickup_photo_urls": ["https://cdn.mytgo.local/pickup/front.jpg"],
                "return_photo_urls": ["https://cdn.mytgo.local/return/front.jpg"],
                "damage_notes": "Sağ ön çamurlukta çizik var.",
                "quote_amount_cents": 250000,
                "quote_notes": "Kaporta mini onarım",
            },
        )
        assert handover_response.status_code == 200, handover_response.text
        handover = handover_response.json()
        assert handover["pickup_photo_urls"] == ["https://cdn.mytgo.local/pickup/front.jpg"]
        assert handover["return_photo_urls"] == ["https://cdn.mytgo.local/return/front.jpg"]
        assert handover["damage_notes"] == "Sağ ön çamurlukta çizik var."
        assert handover["status"] == "quote_sent"

        approval_response = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(customer["access_token"]),
            json={"status": "approved", "digital_approval_name": "Teslim Müşteri"},
        )
        assert approval_response.status_code == 200, approval_response.text
        approval = approval_response.json()
        assert approval["status"] == "approved"
        assert approval["digital_approval_name"] == "Teslim Müşteri"
        assert approval["digital_approved_at"] is not None


def test_extra_cost_requires_customer_approval_before_completion():
    with TestClient(app) as client:
        customer, mechanic, appointment = create_appointment(client)

        extra_cost_response = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(mechanic["access_token"]),
            json={
                "extra_cost_amount_cents": 90000,
                "extra_cost_notes": "Rot başı değişimi gerekli",
            },
        )
        assert extra_cost_response.status_code == 200, extra_cost_response.text
        extra_cost = extra_cost_response.json()
        assert extra_cost["extra_cost_status"] == "pending"
        assert extra_cost["extra_cost_amount_cents"] == 90000

        blocked_completion = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(mechanic["access_token"]),
            json={"status": "completed"},
        )
        assert blocked_completion.status_code == 400, blocked_completion.text

        approved_extra_cost = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(customer["access_token"]),
            json={"extra_cost_status": "approved"},
        )
        assert approved_extra_cost.status_code == 200, approved_extra_cost.text
        assert approved_extra_cost.json()["extra_cost_status"] == "approved"

        completed = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(mechanic["access_token"]),
            json={"status": "completed"},
        )
        assert completed.status_code == 200, completed.text
        assert completed.json()["status"] == "completed"
