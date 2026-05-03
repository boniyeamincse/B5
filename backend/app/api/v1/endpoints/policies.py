from typing import Any
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....models.models import Rule
from ....services.sync import sync_service
from ..deps import get_current_user

router = APIRouter()


@router.post("/sync", status_code=202)
def sync_policies(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> Any:
    """
    Manually trigger a sync of all active rules from PostgreSQL to Redis
    so the Lua proxy picks them up without a container restart.
    Runs in a FastAPI background task and returns immediately (202 Accepted).
    """
    rules = db.query(Rule).filter(Rule.enabled == True).all()
    rules_data = [
        {
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "pattern": r.pattern,
            "action": r.action,
        }
        for r in rules
    ]

    background_tasks.add_task(sync_service.sync_rules, rules_data)

    return {
        "status": "accepted",
        "message": f"Syncing {len(rules_data)} active rule(s) to proxy in background.",
    }
