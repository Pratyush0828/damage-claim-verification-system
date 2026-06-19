from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models import User

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expires}, settings.secret_key, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise unauthorized
    except JWTError as exc:
        raise unauthorized from exc

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise unauthorized
    return user

