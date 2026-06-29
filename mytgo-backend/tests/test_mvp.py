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


def teardown_module():
    pass


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


def test_mytgo_mvp_http_and_websocket_flow():
    with TestClient(app) as client:
        customer = register(client, "customer-test@mytgo.local", "customer")
        mechanic = register(client, "mechanic-test@mytgo.local", "mechanic")
        valet = register(client, "valet-test@mytgo.local", "valet")
        admin = register(client, "admin-test@mytgo.local", "admin")

        vehicle_response = client.post(
            "/api/v1/vehicles",
            headers=auth_headers(customer["access_token"]),
            json={
                "plate_number": "34MYTGO34",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
            },
        )
        assert vehicle_response.status_code == 201, vehicle_response.text
        vehicle = vehicle_response.json()

        appointment_response = client.post(
            "/api/v1/appointments",
            headers=auth_headers(customer["access_token"]),
            json={
                "vehicle_id": vehicle["id"],
                "service_type": "repair",
                "service_address": "MYTGO Sanayi",
                "notes": "Brake check",
            },
        )
        assert appointment_response.status_code == 201, appointment_response.text
        appointment = appointment_response.json()
        assert appointment["mechanic_id"] == mechanic["user"]["id"]

        mechanic_notifications_response = client.get(
            "/api/v1/notifications",
            headers=auth_headers(mechanic["access_token"]),
        )
        assert mechanic_notifications_response.status_code == 200, mechanic_notifications_response.text
        mechanic_notifications = mechanic_notifications_response.json()
        assert mechanic_notifications[0]["event_type"] == "appointment.created"
        assert mechanic_notifications[0]["entity_type"] == "appointment"
        assert mechanic_notifications[0]["entity_id"] == appointment["id"]

        admin_notifications_response = client.get(
            "/api/v1/notifications",
            headers=auth_headers(admin["access_token"]),
        )
        assert admin_notifications_response.status_code == 200, admin_notifications_response.text
        assert admin_notifications_response.json()[0]["event_type"] == "appointment.created"

        quote_response = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(mechanic["access_token"]),
            json={"quote_amount_cents": 185000, "quote_notes": "Balata + işçilik"},
        )
        assert quote_response.status_code == 200, quote_response.text
        quote = quote_response.json()
        assert quote["status"] == "quote_sent"
        assert quote["quote_amount_cents"] == 185000
        assert quote["quote_notes"] == "Balata + işçilik"

        customer_notifications_response = client.get(
            "/api/v1/notifications",
            headers=auth_headers(customer["access_token"]),
        )
        assert customer_notifications_response.status_code == 200, customer_notifications_response.text
        customer_notifications = customer_notifications_response.json()
        assert customer_notifications[0]["event_type"] == "appointment.quote_sent"
        assert customer_notifications[1]["event_type"] == "appointment.status_changed"
        assert customer_notifications[0]["read_at"] is None

        unread_count_response = client.get(
            "/api/v1/notifications/unread-count",
            headers=auth_headers(customer["access_token"]),
        )
        assert unread_count_response.status_code == 200, unread_count_response.text
        assert unread_count_response.json()["unread_count"] == 2

        read_response = client.patch(
            f"/api/v1/notifications/{customer_notifications[0]['id']}/read",
            headers=auth_headers(customer["access_token"]),
        )
        assert read_response.status_code == 200, read_response.text
        assert read_response.json()["read_at"] is not None

        approved_response = client.patch(
            f"/api/v1/appointments/{appointment['id']}",
            headers=auth_headers(customer["access_token"]),
            json={"status": "approved"},
        )
        assert approved_response.status_code == 200, approved_response.text
        assert approved_response.json()["status"] == "approved"

        updated_mechanic_notifications = client.get(
            "/api/v1/notifications",
            headers=auth_headers(mechanic["access_token"]),
        ).json()
        assert updated_mechanic_notifications[0]["event_type"] == "appointment.status_changed"

        conversations_response = client.get(
            "/api/v1/conversations",
            headers=auth_headers(customer["access_token"]),
        )
        assert conversations_response.status_code == 200, conversations_response.text
        conversation = conversations_response.json()[0]

        with client.websocket_connect(
            f"/ws/chat/{conversation['id']}?token={customer['access_token']}"
        ) as customer_ws:
            with client.websocket_connect(
                f"/ws/chat/{conversation['id']}?token={mechanic['access_token']}"
            ) as mechanic_ws:
                customer_ws.send_json({"content": "Merhaba usta"})
                received = mechanic_ws.receive_json()
                assert received["type"] == "chat_message"
                assert received["message"]["content"] == "Merhaba usta"

        valet_response = client.post(
            "/api/v1/valet-requests",
            headers=auth_headers(customer["access_token"]),
            json={
                "appointment_id": appointment["id"],
                "pickup_address": "Customer Home",
                "dropoff_address": "MYTGO Sanayi",
            },
        )
        assert valet_response.status_code == 201, valet_response.text
        transfer = valet_response.json()
        assert transfer["valet_id"] == valet["user"]["id"]

        valet_notifications = client.get(
            "/api/v1/notifications",
            headers=auth_headers(valet["access_token"]),
        ).json()
        assert valet_notifications[0]["event_type"] == "valet.created"

        with client.websocket_connect(
            f"/ws/valet/{transfer['id']}?token={customer['access_token']}"
        ) as customer_ws:
            with client.websocket_connect(
                f"/ws/valet/{transfer['id']}?token={valet['access_token']}"
            ) as valet_ws:
                valet_ws.send_json({"latitude": 41.015137, "longitude": 28.97953})
                received = customer_ws.receive_json()
                assert received["type"] == "valet_location"
                assert received["transfer"]["current_latitude"] == "41.0151370"

        customer_notifications_after_valet = client.get(
            "/api/v1/notifications",
            headers=auth_headers(customer["access_token"]),
        ).json()
        assert customer_notifications_after_valet[0]["event_type"] == "valet.status_changed"
