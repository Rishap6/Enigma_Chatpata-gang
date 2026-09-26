import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.product import Product
from sqlalchemy import select


@pytest.mark.asyncio
async def test_get_product_alternatives():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with AsyncSessionLocal() as session:
            # Find Snickers in database
            snickers = (await session.execute(select(Product).where(Product.gtin == "8906002482481"))).scalars().first()

        if snickers:
            response = await ac.get(f"/api/products/{snickers.id}/alternatives")
            assert response.status_code == 200
            data = response.json()
            assert "alternatives" in data
            assert data["total_alternatives"] > 0
            assert "Milk" in data["flagged_allergens"] or "Milk / Lactose" in data["flagged_allergens"] or "Peanut" in data["flagged_allergens"]

            # Check for lactose-free or peanut-free substitute
            alt_names = [a["alternative_name"] for a in data["alternatives"]]
            assert any("Dark Chocolate" in name or "Yoga Bar" in name or "5 Star" in name for name in alt_names)
