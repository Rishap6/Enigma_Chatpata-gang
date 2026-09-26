import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.alternative_service import alternative_service
from app.schemas.alternative import ProductAlternativesResponse

router = APIRouter(prefix="/products", tags=["Product Alternatives & Allergy Substitutions"])


@router.get(
    "/{product_id}/alternatives",
    response_model=ProductAlternativesResponse,
    summary="Get safe allergy/lactose-free alternatives for a product",
)
async def get_product_alternatives(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Returns curated and dynamically matched safe product alternatives for users with
    Lactose Intolerance, Peanut Allergy, Gluten sensitivity, or dietary restrictions.
    """
    return await alternative_service.get_alternatives_for_product(db, product_id)
