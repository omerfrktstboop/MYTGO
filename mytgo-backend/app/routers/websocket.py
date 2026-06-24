from decimal import Decimal

import structlog
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.chat import ChatMessageRead
from app.schemas.valet import ValetTransferRead
from app.services.chat import create_message, get_authorized_conversation
from app.services.realtime import realtime_manager
from app.services.users import get_user_by_id
from app.services.valet import get_authorized_transfer, update_transfer_location

router = APIRouter(tags=["websockets"])
logger = structlog.get_logger(__name__)


async def authenticate_socket(token: str, db: AsyncSession) -> User | None:
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None
    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        return None
    return user


@router.websocket("/ws/valet/{transfer_id}")
async def valet_tracking_socket(
    websocket: WebSocket,
    transfer_id: int,
    token: str = Query(...),
) -> None:
    channel = f"valet:{transfer_id}"
    async with AsyncSessionLocal() as db:
        user = await authenticate_socket(token, db)
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        try:
            await get_authorized_transfer(db, user, transfer_id)
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await realtime_manager.connect(channel, websocket)
    logger.info(
        "websocket_valet_connected",
        user_id=user.id,
        role=user.role.value,
        transfer_id=transfer_id,
    )

    try:
        while True:
            payload = await websocket.receive_json()
            if user.role != UserRole.VALET:
                continue

            latitude = Decimal(str(payload.get("latitude")))
            longitude = Decimal(str(payload.get("longitude")))
            async with AsyncSessionLocal() as db:
                transfer = await update_transfer_location(
                    db,
                    transfer_id=transfer_id,
                    latitude=latitude,
                    longitude=longitude,
                )
            await realtime_manager.broadcast_json(
                channel,
                {
                    "type": "valet_location",
                    "transfer": ValetTransferRead.model_validate(transfer).model_dump(
                        mode="json"
                    ),
                },
            )
    except (WebSocketDisconnect, RuntimeError, ValueError):
        realtime_manager.disconnect(channel, websocket)
        logger.info(
            "websocket_valet_disconnected",
            user_id=user.id,
            role=user.role.value,
            transfer_id=transfer_id,
        )


@router.websocket("/ws/chat/{conversation_id}")
async def chat_socket(
    websocket: WebSocket,
    conversation_id: int,
    token: str = Query(...),
) -> None:
    channel = f"chat:{conversation_id}"
    async with AsyncSessionLocal() as db:
        user = await authenticate_socket(token, db)
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        try:
            await get_authorized_conversation(db, user, conversation_id)
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await realtime_manager.connect(channel, websocket)
    logger.info(
        "websocket_chat_connected",
        user_id=user.id,
        role=user.role.value,
        conversation_id=conversation_id,
    )

    try:
        while True:
            payload = await websocket.receive_json()
            content = str(payload.get("content", "")).strip()
            if not content:
                continue

            async with AsyncSessionLocal() as db:
                message = await create_message(
                    db,
                    user=user,
                    conversation_id=conversation_id,
                    content=content,
                )
            await realtime_manager.broadcast_json(
                channel,
                {
                    "type": "chat_message",
                    "message": ChatMessageRead.model_validate(message).model_dump(mode="json"),
                },
            )
    except (WebSocketDisconnect, RuntimeError):
        realtime_manager.disconnect(channel, websocket)
        logger.info(
            "websocket_chat_disconnected",
            user_id=user.id,
            role=user.role.value,
            conversation_id=conversation_id,
        )
