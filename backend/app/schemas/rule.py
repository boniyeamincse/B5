from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RuleBase(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    pattern: Optional[str] = None
    action: Optional[str] = "block"
    enabled: Optional[bool] = True

class RuleCreate(RuleBase):
    name: str
    type: str
    pattern: str

class RuleUpdate(RuleBase):
    pass

class RuleInDBBase(RuleBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Rule(RuleInDBBase):
    pass
