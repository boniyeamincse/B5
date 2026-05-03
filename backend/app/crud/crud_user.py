from sqlalchemy.orm import Session
from ..models.models import User
from ..schemas.user import UserCreate
from ..core.security import get_password_hash

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, obj_in: UserCreate):
    db_obj = User(
        username=obj_in.username,
        hashed_password=get_password_hash(obj_in.password),
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
