import asyncio
from app.core.database import engine, Base
import app.models  # ensure models are loaded


async def run_migrations():
    print(f"Connecting to database using engine...")
    async with engine.begin() as conn:
        print("Creating all Phase 1 database tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("All tables successfully initialized!")


if __name__ == "__main__":
    asyncio.run(run_migrations())
