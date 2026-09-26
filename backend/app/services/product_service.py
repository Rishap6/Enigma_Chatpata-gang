import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.product_ingredient import ProductIngredient
from app.models.product_data_source import ProductDataSource
from app.models.brand import Brand
from app.models.product_category import ProductCategory
from app.schemas.product import (
    ProductSummaryResponse,
    ProductDetailResponse,
    ProductIngredientResponse,
    ProductDataSourceResponse,
    BrandResponse,
    ProductCategoryResponse,
)
from app.services.product_provider import local_product_provider


class ProductService:
    @staticmethod
    async def list_products(
        db: AsyncSession,
        search: Optional[str] = None,
        brand: Optional[str] = None,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ProductSummaryResponse], int]:
        return await local_product_provider.search_products(
            db, search=search, brand=brand, category=category, page=page, page_size=page_size
        )

    @staticmethod
    async def get_product_by_id(
        db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[ProductDetailResponse]:
        return await local_product_provider.get_product(db, product_id)

    @staticmethod
    async def get_product_by_identifier(
        db: AsyncSession, identifier_type: str, identifier_value: str
    ) -> Optional[ProductDetailResponse]:
        return await local_product_provider.find_by_identifier(db, identifier_type, identifier_value)

    @staticmethod
    async def get_product_ingredients(
        db: AsyncSession, product_id: uuid.UUID
    ) -> List[ProductIngredientResponse]:
        stmt = (
            select(ProductIngredient)
            .where(ProductIngredient.product_id == product_id)
            .order_by(ProductIngredient.sequence)
        )
        items = (await db.execute(stmt)).scalars().all()
        return [ProductIngredientResponse.model_validate(pi) for pi in items]

    @staticmethod
    async def get_product_sources(
        db: AsyncSession, product_id: uuid.UUID
    ) -> List[ProductDataSourceResponse]:
        stmt = select(ProductDataSource).where(ProductDataSource.product_id == product_id)
        items = (await db.execute(stmt)).scalars().all()
        return [ProductDataSourceResponse.model_validate(ds) for ds in items]

    @staticmethod
    async def list_brands(db: AsyncSession) -> List[BrandResponse]:
        stmt = select(Brand).order_by(Brand.name)
        brands = (await db.execute(stmt)).scalars().all()
        return [BrandResponse.model_validate(b) for b in brands]

    @staticmethod
    async def list_categories(db: AsyncSession) -> List[ProductCategoryResponse]:
        stmt = select(ProductCategory).order_by(ProductCategory.name)
        cats = (await db.execute(stmt)).scalars().all()
        return [ProductCategoryResponse.model_validate(c) for c in cats]
