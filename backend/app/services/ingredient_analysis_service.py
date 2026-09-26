from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.ingredient import (
    NormalizationResponse,
    UnifiedIngredientAnalysisResponse,
)
from app.engines.ingredient_normalization import normalize_ingredient
from app.engines.ingredient_analysis import analyze_ingredient


class IngredientAnalysisService:
    @staticmethod
    async def normalize(db: AsyncSession, text: str) -> NormalizationResponse:
        return await normalize_ingredient(db, text)

    @staticmethod
    async def analyze(db: AsyncSession, text: str) -> UnifiedIngredientAnalysisResponse:
        return await analyze_ingredient(db, text)
