from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.chat import ChatMessage, Conversation
from app.models.user import User
from app.schemas.chat import ChatMessageRead, ConversationRead
from app.services.chat import list_conversations_for_user, list_messages

router = APIRouter(prefix="/conversations", tags=["chat"])


@router.get("", response_model=list[ConversationRead])
async def get_conversations(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Conversation]:
    return await list_conversations_for_user(db, current_user)


@router.get("/{conversation_id}/messages", response_model=list[ChatMessageRead])
async def get_messages(
    conversation_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ChatMessage]:
    return await list_messages(db, current_user, conversation_id)
