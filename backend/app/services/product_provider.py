import uuid
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.product_identifier import ProductIdentifier
from app.models.brand import Brand
from app.models.product_category import ProductCategory
from app.schemas.product import (
    ProductSummaryResponse,
    ProductDetailResponse,
)
from app.engines.product_matching import _build_product_detail, _build_product_summary


class ProductProvider(ABC):
    """Pluggable Product Provider interface.
    Allows local catalog and future external barcode/catalog providers (Phase 4)
    to be swapped or chained seamlessly.
    """

    @abstractmethod
    async def find_by_identifier(
        self, db: AsyncSession, identifier_type: str, identifier_value: str
    ) -> Optional[ProductDetailResponse]:
        pass

    @abstractmethod
    async def search_products(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        brand: Optional[str] = None,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ProductSummaryResponse], int]:
        pass

    @abstractmethod
    async def get_product(
        self, db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[ProductDetailResponse]:
        pass


class LocalCatalogProvider(ProductProvider):
    """Local Database Product Catalog implementation."""

    async def find_by_identifier(
        self, db: AsyncSession, identifier_type: str, identifier_value: str
    ) -> Optional[ProductDetailResponse]:
        clean_val = identifier_value.strip()
        clean_type = identifier_type.strip().upper()

        # Check product_identifiers table
        base_query = (
            select(ProductIdentifier)
            .options(
                selectinload(ProductIdentifier.product).selectinload(Product.brand),
                selectinload(ProductIdentifier.product).selectinload(Product.category),
                selectinload(ProductIdentifier.product).selectinload(Product.identifiers),
                selectinload(ProductIdentifier.product).selectinload(Product.product_ingredients),
                selectinload(ProductIdentifier.product).selectinload(Product.allergen_statements),
                selectinload(ProductIdentifier.product).selectinload(Product.data_sources),
            )
        )

        if clean_type in ("ANY", "AUTO", "BARCODE", "ALL"):
            stmt = base_query.where(ProductIdentifier.identifier_value == clean_val)
            ident = (await db.execute(stmt)).scalars().first()
        else:
            stmt_exact = base_query.where(
                func.upper(ProductIdentifier.identifier_type) == clean_type,
                ProductIdentifier.identifier_value == clean_val,
            )
            ident = (await db.execute(stmt_exact)).scalars().first()
            if not ident:
                # Fallback to match identifier_value across any registered identifier type
                stmt_fallback = base_query.where(ProductIdentifier.identifier_value == clean_val)
                ident = (await db.execute(stmt_fallback)).scalars().first()

        if ident and ident.product and ident.product.is_active:
            return _build_product_detail(ident.product)

        # Fallback check on products.barcode or products.gtin directly
        stmt_prod = (
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.identifiers),
                selectinload(Product.product_ingredients),
                selectinload(Product.allergen_statements),
                selectinload(Product.data_sources),
            )
            .where(
                or_(Product.barcode == clean_val, Product.gtin == clean_val),
                Product.is_active == True,
            )
        )
        prod = (await db.execute(stmt_prod)).scalars().first()
        if prod:
            return _build_product_detail(prod)

        return None

    async def search_products(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        brand: Optional[str] = None,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ProductSummaryResponse], int]:
        stmt = (
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.product_ingredients),
            )
            .where(Product.is_active == True)
        )

        # Apply filters
        if search and search.strip():
            term = search.strip().lower()
            stmt = stmt.where(
                or_(
                    Product.normalized_name.ilike(f"%{term}%"),
                    Product.name.ilike(f"%{term}%"),
                    Product.barcode == term,
                    Product.gtin == term,
                )
            )

        if brand and brand.strip():
            b_term = brand.strip().lower()
            stmt = stmt.join(Product.brand).where(
                or_(Brand.name.ilike(f"%{b_term}%"), Brand.normalized_name.ilike(f"%{b_term}%"))
            )

        if category and category.strip():
            c_term = category.strip().lower()
            stmt = stmt.join(Product.category).where(
                ProductCategory.name.ilike(f"%{c_term}%")
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        # Pagination
        offset = max(0, (page - 1) * page_size)
        stmt = stmt.order_by(Product.name).offset(offset).limit(page_size)

        prods = (await db.execute(stmt)).scalars().all()
        return [_build_product_summary(p) for p in prods], total

    async def get_product(
        self, db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[ProductDetailResponse]:
        stmt = (
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.identifiers),
                selectinload(Product.product_ingredients),
                selectinload(Product.allergen_statements),
                selectinload(Product.data_sources),
            )
            .where(Product.id == product_id)
        )
        prod = (await db.execute(stmt)).scalars().first()
        if not prod:
            return None
        return _build_product_detail(prod)


# Default provider instance
local_product_provider = LocalCatalogProvider()
product_provider = local_product_provider
