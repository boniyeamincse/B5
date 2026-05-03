from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...crud import crud_user
from ...schemas.user import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(sub=payload.get("sub"))
        if token_data.sub is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = crud_user.get_user_by_id(db, user_id=int(token_data.sub))
    if user is None:
        raise credentials_exc
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user
