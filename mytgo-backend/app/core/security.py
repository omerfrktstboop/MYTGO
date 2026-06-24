from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import secrets
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings
from app.models.enums import UserRole

HASH_NAME = "sha256"
HASH_ITERATIONS = 260_000
SALT_BYTES = 16


def hash_password(password: str) -> str:
    salt = secrets.token_hex(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        HASH_NAME,
        password.encode("utf-8"),
        salt.encode("utf-8"),
        HASH_ITERATIONS,
    ).hex()
    return f"pbkdf2_{HASH_NAME}${HASH_ITERATIONS}${salt}${digest}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        algorithm, iterations, salt, expected = hashed_password.split("$", 3)
        hash_name = algorithm.removeprefix("pbkdf2_")
        digest = hashlib.pbkdf2_hmac(
            hash_name,
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations),
        ).hex()
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, expected)


def create_access_token(
    *,
    subject: str,
    role: UserRole,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role.value,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc
