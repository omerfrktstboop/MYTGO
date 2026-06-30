from fastapi import APIRouter

from app.routers import admin_reports, appointments, auth, chat, notifications, premium, service_history, telegram, users, valet, vehicles

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(admin_reports.router)
api_router.include_router(users.router)
api_router.include_router(vehicles.router)
api_router.include_router(service_history.router)
api_router.include_router(notifications.router)
api_router.include_router(premium.router)
api_router.include_router(appointments.router)
api_router.include_router(valet.router)
api_router.include_router(chat.router)
api_router.include_router(telegram.router)
