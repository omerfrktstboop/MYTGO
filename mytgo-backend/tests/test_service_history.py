import os
from pathlib import Path

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


def create_vehicle(client: TestClient, token: str, plate: str = "34SRV001") -> dict:
    response = client.post(
        "/api/v1/vehicles",
        headers=auth_headers(token),
        json={
            "plate_number": plate,
            "brand": "Toyota",
            "model": "Corolla",
            "year": 2020,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_history_entry(
    client: TestClient,
    token: str,
    vehicle_id: int,
    *,
    service_date: str,
    operation_type: str = "maintenance",
    odometer_km: int | None = 45000,
    service_provider: str | None = "MYTGO Sanayi",
    description: str | None = "Yağ ve filtre bakımı yapıldı.",
    cost_amount_cents: int | None = 325000,
    cost_currency: str | None = "TRY",
) -> dict:
    payload = {
        "service_date": service_date,
        "operation_type": operation_type,
        "odometer_km": odometer_km,
        "service_provider": service_provider,
        "description": description,
        "cost_amount_cents": cost_amount_cents,
        "cost_currency": cost_currency,
    }
    response = client.post(
        f"/api/v1/vehicles/{vehicle_id}/service-history",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_customer_lists_service_history_for_vehicle_with_mapped_fields_and_desc_order():
    with TestClient(app) as client:
        customer = register(client, "service-list-customer@mytgo.local", "customer")
        vehicle = create_vehicle(client, customer["access_token"], "34SRV101")

        older = create_history_entry(
            client,
            customer["access_token"],
            vehicle["id"],
            service_date="2026-06-18T09:00:00Z",
            operation_type="repair",
            odometer_km=44000,
            service_provider="Bosch Car Service",
            description="Fren balata değişimi yapıldı.",
            cost_amount_cents=185000,
        )
        newer = create_history_entry(
            client,
            customer["access_token"],
            vehicle["id"],
            service_date="2026-06-20T09:00:00Z",
            operation_type="maintenance",
            odometer_km=45200,
            service_provider="MYTGO Sanayi",
            description="Yağ, filtre ve genel kontrol yapıldı.",
            cost_amount_cents=325000,
        )

        response = client.get(
            f"/api/v1/vehicles/{vehicle['id']}/service-history",
            headers=auth_headers(customer["access_token"]),
        )

        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["vehicle"] == vehicle
        assert payload["total"] == 2
        assert payload["limit"] == 20
        assert payload["offset"] == 0
        assert [item["id"] for item in payload["items"]] == [newer["id"], older["id"]]

        first = payload["items"][0]
        assert first["vehicle_id"] == vehicle["id"]
        assert first["service_date"] == "2026-06-20T09:00:00Z"
        assert first["operation_type"] == "maintenance"
        assert first["odometer_km"] == 45200
        assert first["service_provider"] == "MYTGO Sanayi"
        assert first["description"] == "Yağ, filtre ve genel kontrol yapıldı."
        assert first["cost_amount_cents"] == 325000
        assert first["cost_currency"] == "TRY"
        assert first["created_by_id"] == customer["user"]["id"]
        assert first["updated_by_id"] is None
        assert first["created_at"] is not None
        assert first["updated_at"] is not None


def test_recent_service_history_returns_latest_five_with_id_tiebreaker():
    with TestClient(app) as client:
        customer = register(client, "service-recent-customer@mytgo.local", "customer")
        vehicle = create_vehicle(client, customer["access_token"], "34SRV102")
        created = []
        for index in range(6):
            created.append(
                create_history_entry(
                    client,
                    customer["access_token"],
                    vehicle["id"],
                    service_date="2026-06-20T09:00:00Z" if index >= 4 else f"2026-06-1{index}T09:00:00Z",
                    operation_type="inspection",
                    odometer_km=40000 + index,
                )
            )

        response = client.get(
            f"/api/v1/vehicles/{vehicle['id']}/service-history/recent",
            headers=auth_headers(customer["access_token"]),
        )

        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["limit"] == 5
        assert payload["offset"] == 0
        assert payload["total"] == 6
        assert len(payload["items"]) == 5
        assert [item["id"] for item in payload["items"]][:2] == [created[5]["id"], created[4]["id"]]
        assert created[0]["id"] not in [item["id"] for item in payload["items"]]


def test_empty_service_history_returns_vehicle_and_empty_items():
    with TestClient(app) as client:
        customer = register(client, "service-empty-customer@mytgo.local", "customer")
        vehicle = create_vehicle(client, customer["access_token"], "34SRV103")

        response = client.get(
            f"/api/v1/vehicles/{vehicle['id']}/service-history",
            headers=auth_headers(customer["access_token"]),
        )

        assert response.status_code == 200, response.text
        assert response.json() == {
            "vehicle": vehicle,
            "items": [],
            "total": 0,
            "limit": 20,
            "offset": 0,
        }


def test_unknown_vehicle_returns_404_for_customer():
    with TestClient(app) as client:
        customer = register(client, "service-missing-customer@mytgo.local", "customer")

        response = client.get(
            "/api/v1/vehicles/999999/service-history",
            headers=auth_headers(customer["access_token"]),
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Vehicle not found"


def test_valet_cannot_access_service_history():
    with TestClient(app) as client:
        customer = register(client, "service-owner-customer@mytgo.local", "customer")
        valet = register(client, "service-valet@mytgo.local", "valet")
        vehicle = create_vehicle(client, customer["access_token"], "34SRV104")

        response = client.get(
            f"/api/v1/vehicles/{vehicle['id']}/service-history",
            headers=auth_headers(valet["access_token"]),
        )

        assert response.status_code == 403
        assert response.json()["detail"] == "Service history access denied"


def test_service_history_requires_authentication():
    with TestClient(app) as client:
        response = client.get("/api/v1/vehicles/1/service-history")

        assert response.status_code == 401
        assert response.json()["detail"] == "Authentication required"
