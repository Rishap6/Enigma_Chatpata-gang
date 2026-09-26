import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.family_risk_service import family_risk_service
from app.schemas.risk import (
    RiskAnalysisResponse,
    MemberRiskResponse,
    ProductRiskResponse,
    FamilyRiskMatrixCell,
    RiskExplainabilitySchema,
)

router = APIRouter(prefix="/risk", tags=["Family Risk Engine"])


@router.post("/receipts/{receipt_id}/analyze", response_model=RiskAnalysisResponse)
async def analyze_receipt_risk(
    receipt_id: uuid.UUID,
    family_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Triggers personalized Family Risk Analysis for a grocery receipt.
    Reuses Phase 2 ingredient intelligence & Phase 3 product analysis.
    Evaluates every purchased product against every family member's configured requirements.
    """
    try:
        return await family_risk_service.analyze_receipt_risk(
            db=db,
            receipt_id=receipt_id,
            owner_user_id=current_user.id,
            family_id=family_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Risk analysis error: {str(e)}",
        )


@router.get("/analyses/{analysis_id}", response_model=RiskAnalysisResponse)
async def get_risk_analysis(
    analysis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves a specific completed family risk analysis by its ID."""
    try:
        return await family_risk_service.get_risk_analysis(
            db=db,
            analysis_id=analysis_id,
            owner_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/receipts/{receipt_id}", response_model=RiskAnalysisResponse)
async def get_latest_receipt_risk(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the latest family risk analysis for a grocery receipt."""
    try:
        res = await family_risk_service.get_latest_receipt_risk(
            db=db,
            receipt_id=receipt_id,
            owner_user_id=current_user.id,
        )
        if not res:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No risk analysis found for this receipt. Please trigger an analysis first.",
            )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/receipts/{receipt_id}/members/{member_id}", response_model=MemberRiskResponse)
async def get_receipt_member_risk(
    receipt_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns product risk findings specifically relevant to one family member."""
    try:
        return await family_risk_service.get_receipt_member_risk(
            db=db,
            receipt_id=receipt_id,
            member_id=member_id,
            owner_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/receipts/{receipt_id}/products/{product_id}", response_model=ProductRiskResponse)
async def get_receipt_product_risk(
    receipt_id: uuid.UUID,
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all family members affected by a specific purchased product."""
    try:
        return await family_risk_service.get_receipt_product_risk(
            db=db,
            receipt_id=receipt_id,
            product_id=product_id,
            owner_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/receipts/{receipt_id}/matrix", response_model=List[FamilyRiskMatrixCell])
async def get_receipt_matrix(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the Family × Product risk matrix grid for a receipt."""
    analysis = await family_risk_service.get_latest_receipt_risk(
        db=db,
        receipt_id=receipt_id,
        owner_user_id=current_user.id,
    )
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    return analysis.matrix or []


@router.get("/findings/{finding_id}/explanation", response_model=RiskExplainabilitySchema)
async def get_finding_explanation(
    finding_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the full Phase 7 explainability object for a specific finding.
    Includes derivation steps, structured evidence, uncertainty reasons, and verification guidance.
    """
    try:
        return await family_risk_service.get_finding_explanation(
            db=db,
            finding_id=finding_id,
            owner_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
