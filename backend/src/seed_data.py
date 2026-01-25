"""
Seed initial data for the Military Journal database.
Run this script once to create test groups and admin user.
"""
import asyncio
from datetime import date
from sqlalchemy import select

from backend.src.database import async_session
from backend.src.models.groups import Group
from backend.src.models.subjects import Subject
from backend.src.models.users import User, UserRole
from backend.src.models.teachers import Teacher
from backend.src.security import hash_password


async def seed_groups():
    """Create initial groups for testing."""
    groups_data = [
        {"name": "ВК-24-1", "course": 1, "year": 2024},
        {"name": "ВК-24-2", "course": 1, "year": 2024},
        {"name": "ВК-23-1", "course": 2, "year": 2023},
        {"name": "ВК-23-2", "course": 2, "year": 2023},
        {"name": "ВК-22-1", "course": 3, "year": 2022},
        {"name": "ВК-22-2", "course": 3, "year": 2022},
    ]

    async with async_session() as session:
        for group_data in groups_data:
            # Check if group already exists
            result = await session.execute(
                select(Group).where(Group.name == group_data["name"])
            )
            if not result.scalar_one_or_none():
                group = Group(**group_data)
                session.add(group)
                print(f"Created group: {group_data['name']}")
            else:
                print(f"Group already exists: {group_data['name']}")

        await session.commit()


async def seed_admin_user():
    """Create admin user for initial setup."""
    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where(User.email == "admin@kaztbu.edu.kz")
        )
        if result.scalar_one_or_none():
            print("Admin user already exists")
            return

        # Create admin user
        admin_user = User(
            email="admin@kaztbu.edu.kz",
            password_hash=hash_password("Admin123!"),
            role=UserRole.ADMIN,
        )
        session.add(admin_user)
        await session.flush()

        # Create admin profile as teacher
        admin_teacher = Teacher(
            user_id=admin_user.id,
            first_name="Администратор",
            last_name="Системы",
            position="Администратор",
            department="Военная кафедра",
        )
        session.add(admin_teacher)
        await session.commit()

        print("Created admin user: admin@kaztbu.edu.kz / Admin123!")


async def seed_subjects():
    """Create initial subjects for testing."""
    subjects_data = [
        {"name": "Тактическая подготовка", "code": "ТП-101", "credits": 4,
         "description": "Основы тактики ведения боевых действий"},
        {"name": "Огневая подготовка", "code": "ОП-102", "credits": 3,
         "description": "Изучение стрелкового оружия и навыки стрельбы"},
        {"name": "Строевая подготовка", "code": "СП-103", "credits": 2,
         "description": "Строевые приёмы и военный этикет"},
        {"name": "Топография", "code": "ТОП-104", "credits": 3,
         "description": "Чтение карт и ориентирование на местности"},
        {"name": "Военная история Казахстана", "code": "ВИК-105", "credits": 2,
         "description": "История военного дела в Казахстане"},
        {"name": "Основы военного управления", "code": "ОВУ-106", "credits": 3,
         "description": "Принципы командования и управления подразделениями"},
        {"name": "Инженерная подготовка", "code": "ИП-107", "credits": 2,
         "description": "Основы фортификации и инженерного обеспечения"},
        {"name": "Радиационная и химическая защита", "code": "РХБЗ-108", "credits": 2,
         "description": "Защита от оружия массового поражения"},
    ]

    async with async_session() as session:
        for subject_data in subjects_data:
            # Check if subject already exists
            result = await session.execute(
                select(Subject).where(Subject.name == subject_data["name"])
            )
            if not result.scalar_one_or_none():
                subject = Subject(**subject_data)
                session.add(subject)
                print(f"Created subject: {subject_data['name']}")
            else:
                print(f"Subject already exists: {subject_data['name']}")

        await session.commit()


async def main():
    print("Seeding database...")
    await seed_groups()
    await seed_subjects()
    await seed_admin_user()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())

