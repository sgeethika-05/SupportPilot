from fastapi import APIRouter
from app.api.routes import (
    auth,
    tickets,
    documents,
    rag,
    ai,
    drafts,
    audit,
    evaluations,
    health,
    settings,
    users,
    dashboard,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(tickets.router)
api_router.include_router(documents.router)
api_router.include_router(rag.router)
api_router.include_router(ai.router)
api_router.include_router(drafts.router)
api_router.include_router(audit.router)
api_router.include_router(evaluations.router)
api_router.include_router(health.router)
api_router.include_router(settings.router)
api_router.include_router(users.router)
api_router.include_router(dashboard.router)
