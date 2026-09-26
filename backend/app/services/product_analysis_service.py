import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.product import ProductAnalysisResponse
from app.engines.product_analysis import analyze_product


class ProductAnalysisService:
    @staticmethod
    async def analyze_product(
        db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[ProductAnalysisResponse]:
        """Performs full end-to-end product intelligence analysis connecting to Phase 2."""
        return await analyze_product(db, product_id)
