from app.schemas.base import ORMModel


class ChatSendPayload(ORMModel):
    content: str


class ConversationRead(ORMModel):
    id: int
    appointment_id: int | None = None
    customer_id: int
    mechanic_id: int


class ChatMessageRead(ORMModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    is_read: bool
