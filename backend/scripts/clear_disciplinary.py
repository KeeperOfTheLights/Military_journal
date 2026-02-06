"""Clear disciplinary_records table to fix schema issues."""
import asyncio
from sqlalchemy import text
from backend.src.database import async_session


async def clear_disciplinary_table():
    """Clear all records from disciplinary_records table."""
    async with async_session() as session:
        try:
            # Delete all records
            await session.execute(text("DELETE FROM disciplinary_records"))
            await session.commit()
            print("✅ Successfully cleared disciplinary_records table")
        except Exception as e:
            print(f"❌ Error clearing table: {e}")
            await session.rollback()


if __name__ == "__main__":
    print("Clearing disciplinary_records table...")
    asyncio.run(clear_disciplinary_table())
