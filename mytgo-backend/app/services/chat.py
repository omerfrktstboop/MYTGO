from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatMessage, Conversation
from app.models.enums import UserRole
from app.models.user import User


async def get_or_create_conversation(
    db: AsyncSession,
    *,
    appointment_id: int | None,
    customer_id: int,
    mechanic_id: int,
) -> Conversation:
    query = select(Conversation).where(
        Conversation.appointment_id == appointment_id,
        Conversation.customer_id == customer_id,
        Conversation.mechanic_id == mechanic_id,
    )
    result = await db.execute(query)
    conversation = result.scalar_one_or_none()
    if conversation is not None:
        return conversation

    conversation = Conversation(
        appointment_id=appointment_id,
        customer_id=customer_id,
        mechanic_id=mechanic_id,
    )
    db.add(conversation)
    await db.flush()
    return conversation


async def list_conversations_for_user(db: AsyncSession, user: User) -> list[Conversation]:
    query = select(Conversation).order_by(Conversation.updated_at.desc())
    if user.role == UserRole.CUSTOMER:
        query = query.where(Conversation.customer_id == user.id)
    elif user.role == UserRole.MECHANIC:
        query = query.where(Conversation.mechanic_id == user.id)
    elif user.role == UserRole.VALET:
        return []
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_authorized_conversation(
    db: AsyncSession,
    user: User,
    conversation_id: int,
) -> Conversation:
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    allowed = (
        user.role == UserRole.ADMIN
        or conversation.customer_id == user.id
        or conversation.mechanic_id == user.id
    )
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat access denied")
    return conversation


async def list_messages(
    db: AsyncSession,
    user: User,
    conversation_id: int,
) -> list[ChatMessage]:
    await get_authorized_conversation(db, user, conversation_id)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return list(result.scalars().all())


async def create_message(
    db: AsyncSession,
    *,
    user: User,
    conversation_id: int,
    content: str,
) -> ChatMessage:
    await get_authorized_conversation(db, user, conversation_id)
    message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=user.id,
        content=content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message
