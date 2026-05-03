from fastapi import APIRouter
from .endpoints import auth, rules

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(rules.router, prefix="/rules", tags=["rules"])
