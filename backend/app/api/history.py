import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family import Family
from app.services.historical_grocery_service import historical_grocery_service
from app.schemas.history import (
    HistoricalSummaryResponse,
    RecurringProductsResponse,
    RecurringIngredientsResponse,
    MemberHistoryResponse,
    RecurringFindingsResponse,
    PeriodComparisonResponse,
    MonthlyFamilyReportResponse,
    HistoricalCoverageResponse,
    FamilyHistoryOverviewResponse,
)

router = APIRouter(prefix="/history", tags=["Historical Grocery Intelligence"])


async def verify_family_access(db: AsyncSession, family_id: uuid.UUID, user_id: uuid.UUID) -> Family:
    """Verifies that the family exists and belongs to the authenticated user."""
    stmt = select(Family).where(Family.id == family_id, Family.owner_user_id == user_id)
    fam = (await db.execute(stmt)).scalars().first()
    if not fam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found or unauthorized access",
        )
    return fam


@router.get("/family/{family_id}", response_model=FamilyHistoryOverviewResponse)
async def get_family_history_overview(
    family_id: uuid.UUID,
    period: Optional[str] = Query("all", description="Preset period: '7d', '30d', '90d', 'current_month', 'previous_month', 'custom', or 'all'"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full historical grocery overview including summary, coverage,
    recurring patterns, top products, and timeline.
    """
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_history_overview(
            db=db,
            family_id=family_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/summary", response_model=HistoricalSummaryResponse)
async def get_family_history_summary(
    family_id: uuid.UUID,
    period: Optional[str] = Query("all"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves executive summary metrics of grocery purchase history."""
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_summary(
            db=db,
            family_id=family_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/products", response_model=RecurringProductsResponse)
async def get_family_recurring_products(
    family_id: uuid.UUID,
    period: Optional[str] = Query("all"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves all products purchased historically with recurrence statistics,
    price trends, and affected family members.
    """
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_recurring_products(
            db=db,
            family_id=family_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/ingredients", response_model=RecurringIngredientsResponse)
async def get_family_recurring_ingredients(
    family_id: uuid.UUID,
    period: Optional[str] = Query("all"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregates directly observed label ingredients and relationship-derived
    ingredients across all purchased products.
    """
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_recurring_ingredients(
            db=db,
            family_id=family_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/members", response_model=MemberHistoryResponse)
async def get_family_member_history(
    family_id: uuid.UUID,
    period: Optional[str] = Query("all"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves member-specific purchase trend impact and recurring requirements."""
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_member_impact(
            db=db,
            family_id=family_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/trends", response_model=RecurringFindingsResponse)
@router.get("/family/{family_id}/recurring-findings", response_model=RecurringFindingsResponse)
async def get_family_recurring_trends(
    family_id: uuid.UUID,
    period: Optional[str] = Query("all"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Executes deterministic rule engine to surface top recurring grocery safety patterns."""
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_recurring_patterns(
            db=db,
            family_id=family_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/comparison", response_model=PeriodComparisonResponse)
async def get_family_period_comparison(
    family_id: uuid.UUID,
    period: Optional[str] = Query("current_month", description="'current_month', '30d', or '7d'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compares current period purchase findings against the previous equivalent period."""
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_period_comparison(
            db=db,
            family_id=family_id,
            period=period,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/report", response_model=MonthlyFamilyReportResponse)
async def get_family_monthly_report(
    family_id: uuid.UUID,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates structured monthly family grocery report."""
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_monthly_report(
            db=db,
            family_id=family_id,
            year=year,
            month=month,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/family/{family_id}/coverage", response_model=HistoricalCoverageResponse)
async def get_family_historical_coverage(
    family_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exposes data quality and catalog matching coverage across grocery receipts."""
    await verify_family_access(db, family_id, current_user.id)
    try:
        return await historical_grocery_service.get_coverage(
            db=db,
            family_id=family_id,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/family/{family_id}/refresh")
async def refresh_family_history(
    family_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Forces synchronization and index recomputation of all family purchase history."""
    await verify_family_access(db, family_id, current_user.id)
    try:
        synced_count = await historical_grocery_service.sync_family_history(
            db=db,
            family_id=family_id,
        )
        return {
            "status": "success",
            "message": f"Successfully synchronized {synced_count} receipt history record(s).",
            "receipts_synced": synced_count,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
