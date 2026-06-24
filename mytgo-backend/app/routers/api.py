from fastapi import APIRouter

from app.routers import appointments, auth, chat, users, valet, vehicles

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(vehicles.router)
api_router.include_router(appointments.router)
api_router.include_router(valet.router)
api_router.include_router(chat.router)
