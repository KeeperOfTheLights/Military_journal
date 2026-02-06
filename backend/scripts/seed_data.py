"""
Seed initial data for the Military Journal database.
Run this script once to create test groups, admin user, and fake students.
"""
import asyncio
import random
import sys
from datetime import date, timedelta
from pathlib import Path
from sqlalchemy import select
from faker import Faker

# Add project root to path
current_file = Path(__file__).resolve()
project_root = current_file.parents[1]
sys.path.append(str(project_root))

from src.database import async_session
from src.models.groups import Group
from src.models.subjects import Subject
from src.models.users import User, UserRole
from src.models.teachers import Teacher
from src.models.students import Student
from src.security import hash_password

fake = Faker('ru_RU')  # Use Russian locale for names

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

    created_groups = []
    async with async_session() as session:
        for group_data in groups_data:
            # Check if group already exists
            result = await session.execute(
                select(Group).where(Group.name == group_data["name"])
            )
            group = result.scalar_one_or_none()
            if not group:
                group = Group(**group_data)
                session.add(group)
                print(f"Created group: {group_data['name']}")
            else:
                print(f"Group already exists: {group_data['name']}")
                
            # If we just created it, we need to flush/refresh to get it fully loaded
            # If we fetched it, it's already bound.
            # To be safe for return list, we can just append the object.
            
            # Since we might have added it, we need to commit to persist IDs for the next step 
            # if we wanted to use IDs directly. But we return objects.
        
        await session.commit()
    
    # Re-fetch all groups to return valid objects for next steps
    async with async_session() as session:
        result = await session.execute(select(Group))
        created_groups = result.scalars().all()
        
    return created_groups

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
            password_hash=hash_password("password123"),
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

        print("Created admin user: admin@kaztbu.edu.kz / password123")

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

async def seed_students(groups):
    """Create fake students for each group."""
    STUDENTS_PER_GROUP = 15
    
    async with async_session() as session:
        # We need to make sure groups are attached to this session or just use IDs
        group_ids = [g.id for g in groups]

        for group_id in group_ids:
            # Check how many students already in this group
            result = await session.execute(
                select(Student).where(Student.group_id == group_id)
            )
            existing_count = len(result.scalars().all())
            
            to_create = STUDENTS_PER_GROUP - existing_count
            
            if to_create <= 0:
                print(f"Group {group_id} already has enough students.")
                continue
                
            print(f"Creating {to_create} students for group {group_id}...")
            
            for _ in range(to_create):
                # Generate fake user data
                gender = random.choice(['male', 'female'])
                if gender == 'male':
                    first_name = fake.first_name_male()
                    last_name = fake.last_name_male()
                    middle_name = fake.middle_name_male()
                else:
                    first_name = fake.first_name_female()
                    last_name = fake.last_name_female()
                    middle_name = fake.middle_name_female()
                
                # Unique email
                email = f"{Faker('en_US').user_name()}{random.randint(1000,9999)}@kaztbu.edu.kz".lower()
                
                # Check email collision (simplistic)
                # ... skipping for speed, relying on randomness
                
                # Create User
                user = User(
                    email=email,
                    password_hash=hash_password("password123"),
                    role=UserRole.STUDENT,
                )
                session.add(user)
                await session.flush() # Get ID
                
                # Create Student
                student = Student(
                    user_id=user.id,
                    group_id=group_id,
                    first_name=first_name,
                    last_name=last_name,
                    middle_name=middle_name,
                    phone=fake.phone_number(),
                    enrollment_date=date.today() - timedelta(days=random.randint(30, 300)),
                )
                session.add(student)
            
            await session.commit()
            print(f"Added students to group {group_id}")

async def main():
    print("Seeding database...")
    groups = await seed_groups()
    await seed_subjects()
    await seed_admin_user()
    await seed_students(groups)
    print("Seeding complete! Default admin: admin@kaztbu.edu.kz / password123")


if __name__ == "__main__":
    asyncio.run(main())
