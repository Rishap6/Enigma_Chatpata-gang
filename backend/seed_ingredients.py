"""
Standalone script to seed the Ingredient Intelligence Knowledge Base.
Idempotent and safe to run multiple times.
Usage:
    python seed_ingredients.py
"""
import asyncio
import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, AsyncSessionLocal, Base
from app.data.seed_data import seed_ingredient_knowledge
import app.models  # ensure models are registered


async def main():
    print("Connecting to database...")
    async with engine.begin() as conn:
        # Create all tables if they don't exist yet
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_ingredient_knowledge(session)

    print("Ingredient knowledge base seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
