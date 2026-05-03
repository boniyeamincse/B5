from sqlalchemy.orm import Session
from ..models.models import Rule
from ..schemas.rule import RuleCreate, RuleUpdate
from ..services.sync import sync_service

def get_rules(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Rule).offset(skip).limit(limit).all()

def create_rule(db: Session, obj_in: RuleCreate):
    db_obj = Rule(
        name=obj_in.name,
        type=obj_in.type,
        pattern=obj_in.pattern,
        action=obj_in.action,
        enabled=obj_in.enabled
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Trigger sync to Redis
    all_rules = db.query(Rule).filter(Rule.enabled == True).all()
    rules_data = [{"id": r.id, "type": r.type, "pattern": r.pattern, "action": r.action} for r in all_rules]
    sync_service.sync_rules(rules_data)
    
    return db_obj

def update_rule(db: Session, db_obj: Rule, obj_in: RuleUpdate):
    update_data = obj_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Trigger sync to Redis
    all_rules = db.query(Rule).filter(Rule.enabled == True).all()
    rules_data = [{"id": r.id, "type": r.type, "pattern": r.pattern, "action": r.action} for r in all_rules]
    sync_service.sync_rules(rules_data)
    
    return db_obj

def remove_rule(db: Session, id: int):
    obj = db.query(Rule).get(id)
    db.delete(obj)
    db.commit()
    
    # Trigger sync to Redis
    all_rules = db.query(Rule).filter(Rule.enabled == True).all()
    rules_data = [{"id": r.id, "type": r.type, "pattern": r.pattern, "action": r.action} for r in all_rules]
    sync_service.sync_rules(rules_data)
    
    return obj
