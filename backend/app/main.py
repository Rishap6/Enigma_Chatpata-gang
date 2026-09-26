from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # ensure all models are registered

# Import API routers
from app.api.auth import router as auth_router
from app.api.families import router as families_router
from app.api.members import router as members_router
from app.api.allergies import router as allergies_router
from app.api.dietary_rules import router as dietary_rules_router
from app.api.ingredient_exclusions import router as ingredient_exclusions_router
from app.api.preferences import router as preferences_router
from app.api.emergency_contacts import router as emergency_contacts_router
from app.api.notifications import router as notifications_router
from app.api.seed import router as seed_router
from app.api.ingredients import router as ingredients_router
from app.api.products import router as products_router
from app.api.receipts import router as receipts_router
from app.api.risk import router as risk_router
from app.api.history import router as history_router
from app.api.scan import router as scan_router
from app.api.alternatives import router as alternatives_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize tables on startup if not already created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade API for Family Management and Food Safety Requirements (Phase 1).",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint confirming API status and service name."""
    return {
        "status": "ok",
        "service": "family-food-intelligence",
        "version": settings.VERSION,
    }


# Include all routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(families_router, prefix=settings.API_V1_STR)
app.include_router(members_router, prefix=settings.API_V1_STR)
app.include_router(allergies_router, prefix=settings.API_V1_STR)
app.include_router(dietary_rules_router, prefix=settings.API_V1_STR)
app.include_router(ingredient_exclusions_router, prefix=settings.API_V1_STR)
app.include_router(preferences_router, prefix=settings.API_V1_STR)
app.include_router(emergency_contacts_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(seed_router, prefix=settings.API_V1_STR)
app.include_router(ingredients_router, prefix=settings.API_V1_STR)
app.include_router(products_router, prefix=settings.API_V1_STR)
app.include_router(receipts_router, prefix=settings.API_V1_STR)
app.include_router(risk_router, prefix=settings.API_V1_STR)
app.include_router(history_router, prefix=settings.API_V1_STR)
app.include_router(scan_router, prefix=settings.API_V1_STR)
app.include_router(alternatives_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
