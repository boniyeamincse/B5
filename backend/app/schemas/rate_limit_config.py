from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RateLimitConfigBase(BaseModel):
    identifier: str
    identifier_type: str  # "ip" | "route" | "role"
    requests: int
    window_seconds: int
    enabled: Optional[bool] = True
    policy_id: Optional[int] = None


class RateLimitConfigCreate(RateLimitConfigBase):
    pass


class RateLimitConfigUpdate(BaseModel):
    requests: Optional[int] = None
    window_seconds: Optional[int] = None
    enabled: Optional[bool] = None
    policy_id: Optional[int] = None


class RateLimitConfigResponse(RateLimitConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EndpointConfigBase(BaseModel):
    path_prefix: str
    allowed_methods: str          # comma-separated, e.g. "GET,POST"
    allowed_content_types: Optional[str] = None
    require_auth: Optional[bool] = True
    strict_mode: Optional[bool] = False
    enabled: Optional[bool] = True
    policy_id: Optional[int] = None


class EndpointConfigCreate(EndpointConfigBase):
    pass


class EndpointConfigUpdate(BaseModel):
    allowed_methods: Optional[str] = None
    allowed_content_types: Optional[str] = None
    require_auth: Optional[bool] = None
    strict_mode: Optional[bool] = None
    enabled: Optional[bool] = None
    policy_id: Optional[int] = None


class EndpointConfigResponse(EndpointConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
