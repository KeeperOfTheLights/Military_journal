"""
Reset database and seed with initial data.
Useful for development to get a clean state.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add project root to path to allow imports
current_file = Path(__file__).resolve()
project_root = current_file.parents[1]
sys.path.append(str(project_root))

from src.database import engine, Base
from scripts.seed_data import main as seed_main

async def reset_database():
    """Drop all tables and recreate them."""
    print("Resetting database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset complete.")

async def main():
    # Confirm before proceeding
    print("WARNING: This will DELETE ALL DATA in the database.")
    response = input("Are you sure you want to continue? (y/N): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        return

    await reset_database()
    print("\nStarting seeding...")
    await seed_main()
    print("\nReset and seed complete!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
