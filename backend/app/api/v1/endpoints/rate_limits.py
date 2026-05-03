from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....models.models import RateLimitConfig
from ....schemas.rate_limit_config import (
    RateLimitConfigCreate,
    RateLimitConfigResponse,
)
from ..deps import get_current_user

router = APIRouter()


@router.get("", response_model=List[RateLimitConfigResponse])
def list_rate_limits(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> Any:
    """List all rate-limit configurations."""
    return db.query(RateLimitConfig).order_by(RateLimitConfig.id).all()


@router.post("", response_model=RateLimitConfigResponse, status_code=status.HTTP_201_CREATED)
def create_rate_limit(
    payload: RateLimitConfigCreate,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> Any:
    """Create a new rate-limit configuration."""
    obj = RateLimitConfig(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
