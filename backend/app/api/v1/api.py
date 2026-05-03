from fastapi import APIRouter
from .endpoints import auth, rules, analytics, policies, rate_limits

api_router = APIRouter()
api_router.include_router(auth.router,        prefix="/auth",       tags=["auth"])
api_router.include_router(rules.router,       prefix="/rules",      tags=["rules"])
api_router.include_router(analytics.router,   prefix="/analytics",  tags=["analytics"])
api_router.include_router(policies.router,    prefix="/policies",   tags=["policies"])
api_router.include_router(rate_limits.router, prefix="/ratelimits", tags=["rate-limits"])
