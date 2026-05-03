from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....crud import crud_rule
from ....schemas import rule as rule_schema

router = APIRouter()

@router.get("/", response_model=List[rule_schema.Rule])
def read_rules(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve rules.
    """
    rules = crud_rule.get_rules(db, skip=skip, limit=limit)
    return rules

@router.post("/", response_model=rule_schema.Rule)
def create_rule(
    *,
    db: Session = Depends(get_db),
    rule_in: rule_schema.RuleCreate,
) -> Any:
    """
    Create new rule.
    """
    rule = crud_rule.create_rule(db=db, obj_in=rule_in)
    return rule

@router.patch("/{id}", response_model=rule_schema.Rule)
def update_rule(
    *,
    db: Session = Depends(get_db),
    id: int,
    rule_in: rule_schema.RuleUpdate,
) -> Any:
    """
    Update a rule.
    """
    rule = db.query(crud_rule.Rule).get(id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule = crud_rule.update_rule(db=db, db_obj=rule, obj_in=rule_in)
    return rule

@router.delete("/{id}", response_model=rule_schema.Rule)
def delete_rule(
    *,
    db: Session = Depends(get_db),
    id: int,
) -> Any:
    """
    Delete a rule.
    """
    rule = db.query(crud_rule.Rule).get(id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule = crud_rule.remove_rule(db=db, id=id)
    return rule
