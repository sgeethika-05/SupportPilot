from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings as app_settings
from app.api.routes import (
    auth, tickets, documents, rag, ai, drafts,
    audit, evaluations, health, users, dashboard
)
from app.api.routes import settings as settings_route

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=app_settings.APP_NAME,
    version="1.0.0",
    description="AI Support Desk Copilot â€” RAG-powered ticket management with human-in-the-loop approval",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# Mount all routers under /api
prefix = "/api"
app.include_router(auth.router, prefix=prefix)
app.include_router(tickets.router, prefix=prefix)
app.include_router(documents.router, prefix=prefix)
app.include_router(rag.router, prefix=prefix)
app.include_router(ai.router, prefix=prefix)
app.include_router(drafts.router, prefix=prefix)
app.include_router(audit.router, prefix=prefix)
app.include_router(evaluations.router, prefix=prefix)
app.include_router(health.router, prefix=prefix)
app.include_router(users.router, prefix=prefix)
app.include_router(dashboard.router, prefix=prefix)
app.include_router(settings_route.router, prefix=prefix)


@app.get("/")
def root():
    return {"app": app_settings.APP_NAME, "version": "1.0.0", "docs": "/docs"}
