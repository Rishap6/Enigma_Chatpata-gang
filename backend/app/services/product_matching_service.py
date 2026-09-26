from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.product import ProductMatchResponse
from app.engines.product_matching import match_product


class ProductMatchingService:
    @staticmethod
    async def match_product(
        db: AsyncSession,
        name: str,
        brand: Optional[str] = None,
        barcode: Optional[str] = None,
    ) -> ProductMatchResponse:
        """Matches a product query against the database using barcode, GTIN, brand, and fuzzy signals."""
        return await match_product(db, name=name, brand=brand, barcode=barcode)
