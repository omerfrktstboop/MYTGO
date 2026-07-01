"""SQLAlchemy models for E-Cars domain entities.

Import all model modules so SQLAlchemy relationship strings can resolve
correctly as soon as app.models is imported.
"""

from app.models import appointment, chat, notification, premium, service_history, telegram_auth, user, valet, vehicle  # noqa: F401
