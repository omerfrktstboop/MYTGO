import os
from pathlib import Path

os.environ["MYTGO_DATABASE_URL"] = "sqlite+aiosqlite:///./test_premium_fleet.db"
os.environ["MYTGO_JWT_SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

TEST_DB = Path("test_premium_fleet.db")


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


def test_premium_subscription_prioritizes_customer_appointments():
    with TestClient(app) as client:
        customer = register(client, "premium-customer@mytgo.local", "customer")
        mechanic = register(client, "premium-mechanic@mytgo.local", "mechanic")

        plans_response = client.get(
            "/api/v1/premium/plans",
            headers=auth_headers(customer["access_token"]),
        )
        assert plans_response.status_code == 200, plans_response.text
        plans = plans_response.json()
        assert plans[0]["code"] == "express"
        assert plans[0]["monthly_price_cents"] == 249900
        assert "Öncelikli hızlı servis" in plans[0]["benefits"]

        subscription_response = client.post(
            "/api/v1/premium/subscriptions",
            headers=auth_headers(customer["access_token"]),
            json={"plan_code": "express", "billing_cycle": "monthly"},
        )
        assert subscription_response.status_code == 201, subscription_response.text
        subscription = subscription_response.json()
        assert subscription["status"] == "active"
        assert subscription["plan_code"] == "express"
        assert subscription["monthly_price_cents"] == 249900

        vehicle_response = client.post(
            "/api/v1/vehicles",
            headers=auth_headers(customer["access_token"]),
            json={
                "plate_number": "34PRM34",
                "brand": "Tesla",
                "model": "Model Y",
                "year": 2024,
            },
        )
        assert vehicle_response.status_code == 201, vehicle_response.text

        appointment_response = client.post(
            "/api/v1/appointments",
            headers=auth_headers(customer["access_token"]),
            json={
                "vehicle_id": vehicle_response.json()["id"],
                "service_type": "repair",
                "service_address": "MYTGO Premium Kapı",
                "notes": "Premium hızlı servis",
            },
        )
        assert appointment_response.status_code == 201, appointment_response.text
        appointment = appointment_response.json()
        assert appointment["mechanic_id"] == mechanic["user"]["id"]
        assert appointment["is_premium"] is True
        assert appointment["priority_score"] == 100
        assert appointment["premium_plan_code"] == "express"


def test_admin_fleet_summary_reports_enterprise_revenue_and_vehicle_counts():
    with TestClient(app) as client:
        admin = register(client, "premium-admin@mytgo.local", "admin")
        customer = register(client, "fleet-manager@mytgo.local", "customer")

        vehicle_response = client.post(
            "/api/v1/vehicles",
            headers=auth_headers(customer["access_token"]),
            json={
                "plate_number": "34FLT34",
                "brand": "Ford",
                "model": "Transit",
                "year": 2022,
            },
        )
        assert vehicle_response.status_code == 201, vehicle_response.text

        fleet_response = client.post(
            "/api/v1/premium/fleet-accounts",
            headers=auth_headers(admin["access_token"]),
            json={
                "company_name": "MYTGO Lojistik",
                "manager_user_id": customer["user"]["id"],
                "vehicle_ids": [vehicle_response.json()["id"]],
                "monthly_price_cents": 1299900,
                "included_services": 8,
            },
        )
        assert fleet_response.status_code == 201, fleet_response.text
        fleet = fleet_response.json()
        assert fleet["company_name"] == "MYTGO Lojistik"
        assert fleet["vehicle_count"] == 1

        summary_response = client.get(
            "/api/v1/premium/fleet-summary",
            headers=auth_headers(admin["access_token"]),
        )
        assert summary_response.status_code == 200, summary_response.text
        summary = summary_response.json()
        assert summary["fleet_count"] == 1
        assert summary["fleet_vehicle_count"] == 1
        assert summary["monthly_recurring_revenue_cents"] == 1299900
        assert summary["accounts"][0]["included_services"] == 8

        forbidden_response = client.get(
            "/api/v1/premium/fleet-summary",
            headers=auth_headers(customer["access_token"]),
        )
        assert forbidden_response.status_code == 403