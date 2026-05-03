from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....models.models import Rule, AuditLog
from ..deps import get_current_user

router = APIRouter()


@router.get("/overview", response_model=dict)
def analytics_overview(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> Any:
    """
    Dashboard stats: total rules, enabled rules, blocked vs allowed counts,
    and a per-type rule breakdown — sourced from PostgreSQL.
    """
    total_rules: int = db.query(func.count(Rule.id)).scalar() or 0
    active_rules: int = (
        db.query(func.count(Rule.id)).filter(Rule.enabled == True).scalar() or 0
    )

    # Count rules by action
    action_counts = (
        db.query(Rule.action, func.count(Rule.id))
        .group_by(Rule.action)
        .all()
    )
    action_map = {row[0]: row[1] for row in action_counts}

    # Count rules by type
    type_counts = (
        db.query(Rule.type, func.count(Rule.id))
        .group_by(Rule.type)
        .all()
    )
    type_map = {row[0]: row[1] for row in type_counts}

    return {
        "total_rules": total_rules,
        "active_rules": active_rules,
        "rules_by_action": action_map,
        "rules_by_type": type_map,
        # These will be replaced by real ES aggregates in a future task
        "blocked_last_24h": 0,
        "allowed_last_24h": 0,
        "system_health": "ok",
    }


@router.get("/events", response_model=List[dict])
def analytics_events(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    resource_type: Optional[str] = Query(default=None),
    _current_user=Depends(get_current_user),
) -> Any:
    """
    Recent security events / audit-log entries from PostgreSQL.
    Supports pagination and optional resource_type filter.
    """
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if resource_type:
        q = q.filter(AuditLog.resource_type == resource_type)
    rows = q.offset(offset).limit(limit).all()

    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "action": r.action,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "details": r.details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
