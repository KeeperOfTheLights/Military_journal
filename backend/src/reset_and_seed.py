"""
Reset database and seed with comprehensive test data.
WARNING: This will delete ALL existing data!
"""
import asyncio
import random
from datetime import date, datetime, timedelta
from sqlalchemy import delete, select, text

from backend.src.database import async_session, engine
from backend.src.models.users import User, UserRole
from backend.src.models.groups import Group
from backend.src.models.subjects import Subject
from backend.src.models.students import Student
from backend.src.models.teachers import Teacher
from backend.src.models.schedule import Schedule
from backend.src.models.attendance import Attendance, AttendanceStatus
from backend.src.models.grades import Grade, GradeType
from backend.src.models.disciplinary import DisciplinaryRecord, ViolationType, SeverityLevel
from backend.src.security import hash_password


# Test data
GROUPS = [
    {"name": "ВК-24-1", "course": 1, "year": 2024},
    {"name": "ВК-24-2", "course": 1, "year": 2024},
    {"name": "ВК-23-1", "course": 2, "year": 2023},
    {"name": "ВК-23-2", "course": 2, "year": 2023},
    {"name": "ВК-22-1", "course": 3, "year": 2022},
]

SUBJECTS = [
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
]

TEACHERS = [
    {"first_name": "Серик", "last_name": "Алиев", "middle_name": "Болатович",
     "email": "aliev@kaztbu.edu.kz", "military_rank": "Полковник", "position": "Начальник кафедры"},
    {"first_name": "Бауыржан", "last_name": "Касымов", "middle_name": "Нурланович",
     "email": "kasymov@kaztbu.edu.kz", "military_rank": "Подполковник", "position": "Старший преподаватель"},
    {"first_name": "Асхат", "last_name": "Жумабеков", "middle_name": "Ерланович",
     "email": "zhumabekov@kaztbu.edu.kz", "military_rank": "Майор", "position": "Преподаватель"},
]

STUDENTS_DATA = [
    # Group 1 (ВК-24-1)
    {"first_name": "Алихан", "last_name": "Сериков", "middle_name": "Болатович"},
    {"first_name": "Данияр", "last_name": "Нурланов", "middle_name": "Асанович"},
    {"first_name": "Ерболат", "last_name": "Кайратов", "middle_name": "Маратович"},
    {"first_name": "Жандос", "last_name": "Султанов", "middle_name": "Ерланович"},
    {"first_name": "Ильяс", "last_name": "Бекмуратов", "middle_name": "Серикович"},
    # Group 2 (ВК-24-2)
    {"first_name": "Куаныш", "last_name": "Токтаров", "middle_name": "Нурланович"},
    {"first_name": "Марат", "last_name": "Айдосов", "middle_name": "Кайратович"},
    {"first_name": "Нурлан", "last_name": "Ержанов", "middle_name": "Болатович"},
    {"first_name": "Олжас", "last_name": "Сатпаев", "middle_name": "Асанович"},
    {"first_name": "Рустем", "last_name": "Калиев", "middle_name": "Маратович"},
    # Group 3 (ВК-23-1)
    {"first_name": "Сабыр", "last_name": "Тулегенов", "middle_name": "Ерланович"},
    {"first_name": "Тимур", "last_name": "Амиров", "middle_name": "Серикович"},
    {"first_name": "Улан", "last_name": "Бейсенов", "middle_name": "Нурланович"},
    {"first_name": "Фархат", "last_name": "Дуйсенов", "middle_name": "Кайратович"},
    {"first_name": "Хасан", "last_name": "Жаксыбеков", "middle_name": "Болатович"},
    # Group 4 (ВК-23-2)
    {"first_name": "Шерхан", "last_name": "Молдабеков", "middle_name": "Асанович"},
    {"first_name": "Арман", "last_name": "Кенжебаев", "middle_name": "Маратович"},
    {"first_name": "Бакытжан", "last_name": "Оразов", "middle_name": "Ерланович"},
    {"first_name": "Газиз", "last_name": "Садыков", "middle_name": "Серикович"},
    {"first_name": "Дархан", "last_name": "Ускенбаев", "middle_name": "Нурланович"},
    # Group 5 (ВК-22-1)
    {"first_name": "Ержан", "last_name": "Каримов", "middle_name": "Кайратович"},
    {"first_name": "Жаркын", "last_name": "Мухтаров", "middle_name": "Болатович"},
    {"first_name": "Искандер", "last_name": "Рахимов", "middle_name": "Асанович"},
    {"first_name": "Канат", "last_name": "Темиров", "middle_name": "Маратович"},
    {"first_name": "Лесбек", "last_name": "Шарипов", "middle_name": "Ерланович"},
]

DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
ROOMS = ["101", "102", "201", "202", "301", "Спортзал", "Стрельбище"]


async def clear_all_data():
    """Delete all data from all tables."""
    print("Clearing all data...")
    async with async_session() as session:
        # Delete in order to respect foreign keys
        await session.execute(delete(DisciplinaryRecord))
        await session.execute(delete(Attendance))
        await session.execute(delete(Grade))
        await session.execute(delete(Schedule))
        await session.execute(delete(Student))
        await session.execute(delete(Teacher))
        await session.execute(delete(Subject))
        await session.execute(delete(Group))
        await session.execute(delete(User))
        await session.commit()
    print("All data cleared!")


async def seed_groups():
    """Create test groups."""
    print("Creating groups...")
    async with async_session() as session:
        groups = []
        for g in GROUPS:
            group = Group(**g)
            session.add(group)
            groups.append(group)
        await session.commit()
        for g in groups:
            await session.refresh(g)
        print(f"Created {len(groups)} groups")
        return groups


async def seed_subjects():
    """Create test subjects."""
    print("Creating subjects...")
    async with async_session() as session:
        subjects = []
        for s in SUBJECTS:
            subject = Subject(**s)
            session.add(subject)
            subjects.append(subject)
        await session.commit()
        for s in subjects:
            await session.refresh(s)
        print(f"Created {len(subjects)} subjects")
        return subjects


async def seed_admin():
    """Create admin user."""
    print("Creating admin user...")
    async with async_session() as session:
        admin = User(
            email="admin@kaztbu.edu.kz",
            password_hash=hash_password("Admin123!"),
            role=UserRole.ADMIN,
        )
        session.add(admin)
        await session.flush()
        
        admin_profile = Teacher(
            user_id=admin.id,
            first_name="Администратор",
            last_name="Системы",
            position="Системный администратор",
            department="Военная кафедра",
        )
        session.add(admin_profile)
        await session.commit()
        await session.refresh(admin)
        print(f"Created admin: admin@kaztbu.edu.kz / Admin123!")
        return admin


async def seed_teachers():
    """Create test teachers."""
    print("Creating teachers...")
    async with async_session() as session:
        teachers = []
        for t in TEACHERS:
            user = User(
                email=t["email"],
                password_hash=hash_password("Teacher123!"),
                role=UserRole.TEACHER,
            )
            session.add(user)
            await session.flush()
            
            teacher = Teacher(
                user_id=user.id,
                first_name=t["first_name"],
                last_name=t["last_name"],
                middle_name=t["middle_name"],
                military_rank=t["military_rank"],
                position=t["position"],
                department="Военная кафедра",
            )
            session.add(teacher)
            teachers.append(teacher)
        
        await session.commit()
        for t in teachers:
            await session.refresh(t)
        print(f"Created {len(teachers)} teachers (password: Teacher123!)")
        return teachers


async def seed_students(groups):
    """Create test students."""
    print("Creating students...")
    async with async_session() as session:
        students = []
        students_per_group = len(STUDENTS_DATA) // len(groups)
        
        for i, s in enumerate(STUDENTS_DATA):
            group_idx = i // students_per_group
            if group_idx >= len(groups):
                group_idx = len(groups) - 1
            
            email = f"{s['last_name'].lower()}{i+1}@student.kaztbu.edu.kz"
            
            user = User(
                email=email,
                password_hash=hash_password("Student123!"),
                role=UserRole.STUDENT,
            )
            session.add(user)
            await session.flush()
            
            student = Student(
                user_id=user.id,
                group_id=groups[group_idx].id,
                first_name=s["first_name"],
                last_name=s["last_name"],
                middle_name=s["middle_name"],
                phone=f"+7 (7{random.randint(00,99):02d}) {random.randint(100,999)}-{random.randint(10,99)}-{random.randint(10,99)}",
                enrollment_date=date(groups[group_idx].year, 9, 1),
                rank=random.choice(["Курсант", "Курсант", "Курсант", "Сержант"]),
            )
            session.add(student)
            students.append(student)
        
        await session.commit()
        for s in students:
            await session.refresh(s)
        print(f"Created {len(students)} students (password: Student123!)")
        
        # Also create a demo student for easy testing
        demo_user = User(
            email="student@kaztbu.edu.kz",
            password_hash=hash_password("Student123!"),
            role=UserRole.STUDENT,
        )
        session.add(demo_user)
        await session.flush()
        
        demo_student = Student(
            user_id=demo_user.id,
            group_id=groups[0].id,
            first_name="Демо",
            last_name="Студент",
            middle_name="Тестович",
            phone="+7 (777) 123-45-67",
            enrollment_date=date(2024, 9, 1),
            rank="Курсант",
        )
        session.add(demo_student)
        await session.commit()
        await session.refresh(demo_student)
        students.append(demo_student)
        print(f"Created demo student: student@kaztbu.edu.kz / Student123!")
        
        return students


async def seed_schedule(groups, subjects, teachers):
    """Create test schedule."""
    print("Creating schedule...")
    from datetime import time as dt_time
    from backend.src.models.schedule import DayOfWeek
    
    async with async_session() as session:
        schedules = []
        times = [
            (dt_time(8, 30), dt_time(10, 0)),
            (dt_time(10, 10), dt_time(11, 40)),
            (dt_time(12, 0), dt_time(13, 30)),
            (dt_time(14, 0), dt_time(15, 30)),
        ]
        
        day_mapping = {
            "monday": DayOfWeek.MONDAY,
            "tuesday": DayOfWeek.TUESDAY,
            "wednesday": DayOfWeek.WEDNESDAY,
            "thursday": DayOfWeek.THURSDAY,
            "friday": DayOfWeek.FRIDAY,
            "saturday": DayOfWeek.SATURDAY,
        }
        
        for group in groups:
            for day in DAYS_OF_WEEK[:5]:  # Mon-Fri
                num_classes = random.randint(2, 4)
                used_times = random.sample(range(len(times)), num_classes)
                
                for time_idx in used_times:
                    subject = random.choice(subjects)
                    teacher = random.choice(teachers)
                    start_time, end_time = times[time_idx]
                    
                    schedule = Schedule(
                        group_id=group.id,
                        subject_id=subject.id,
                        teacher_id=teacher.id,
                        day_of_week=day_mapping[day],
                        start_time=start_time,
                        end_time=end_time,
                        room=random.choice(ROOMS),
                        semester=1,
                        academic_year="2024-2025",
                    )
                    session.add(schedule)
                    schedules.append(schedule)
        
        await session.commit()
        for s in schedules:
            await session.refresh(s)
        print(f"Created {len(schedules)} schedule entries")
        return schedules


async def seed_attendance(students, schedules):
    """Create test attendance records."""
    print("Creating attendance records...")
    async with async_session() as session:
        attendance_records = []
        
        if not schedules:
            print("No schedules found, skipping attendance")
            return []
        
        # Generate attendance for the last 30 days
        today = date.today()
        for days_ago in range(30, 0, -1):
            record_date = today - timedelta(days=days_ago)
            if record_date.weekday() >= 5:  # Skip weekends
                continue
            
            for student in students:
                # 85% present, 10% absent, 5% late
                rand = random.random()
                if rand < 0.85:
                    status = AttendanceStatus.PRESENT
                elif rand < 0.95:
                    status = AttendanceStatus.ABSENT
                else:
                    status = AttendanceStatus.LATE
                
                attendance = Attendance(
                    student_id=student.id,
                    schedule_id=random.choice(schedules).id,
                    date=record_date,
                    status=status,
                    reason="Болезнь" if status == AttendanceStatus.ABSENT and random.random() < 0.3 else None,
                )
                session.add(attendance)
                attendance_records.append(attendance)
        
        await session.commit()
        print(f"Created {len(attendance_records)} attendance records")
        return attendance_records


async def seed_grades(students, subjects):
    """Create test grades."""
    print("Creating grades...")
    async with async_session() as session:
        grades = []
        grade_types = [GradeType.HOMEWORK, GradeType.CLASSWORK, GradeType.TEST, GradeType.EXAM]
        
        today = date.today()
        for student in students:
            for subject in subjects:
                # Create 3-6 grades per student per subject
                num_grades = random.randint(3, 6)
                for i in range(num_grades):
                    grade_type = random.choice(grade_types)
                    
                    # Generate realistic grade distribution
                    if random.random() < 0.2:
                        score = float(random.randint(50, 65))  # Poor
                    elif random.random() < 0.5:
                        score = float(random.randint(66, 79))  # Average
                    else:
                        score = float(random.randint(80, 100))  # Good
                    
                    grade = Grade(
                        student_id=student.id,
                        subject_id=subject.id,
                        grade_type=grade_type,
                        score=score,
                        max_score=100.0,
                        date=today - timedelta(days=random.randint(1, 60)),
                        semester=1,
                        academic_year="2024-2025",
                        comment=random.choice([None, None, "Отлично!", "Можно лучше", "Хорошая работа"]),
                    )
                    session.add(grade)
                    grades.append(grade)
        
        await session.commit()
        print(f"Created {len(grades)} grade records")
        return grades


async def seed_disciplinary(students, teachers):
    """Create test disciplinary records."""
    print("Creating disciplinary records...")
    async with async_session() as session:
        records = []
        violations = [
            ("Опоздание на занятие", ViolationType.LATE, SeverityLevel.MINOR),
            ("Нарушение формы одежды", ViolationType.UNIFORM, SeverityLevel.MINOR),
            ("Отсутствие без уважительной причины", ViolationType.ABSENCE, SeverityLevel.MODERATE),
            ("Неуважительное отношение к преподавателю", ViolationType.DISRESPECT, SeverityLevel.MAJOR),
            ("Нарушение дисциплины на занятии", ViolationType.BEHAVIOR, SeverityLevel.MINOR),
        ]
        
        today = date.today()
        # Create 5-10 disciplinary records
        num_records = random.randint(5, 10)
        selected_students = random.sample(students, min(num_records, len(students)))
        
        for student in selected_students:
            violation = random.choice(violations)
            teacher = random.choice(teachers)
            is_resolved = random.random() < 0.4
            
            record = DisciplinaryRecord(
                student_id=student.id,
                reported_by_id=teacher.id,
                date=today - timedelta(days=random.randint(1, 30)),
                violation_type=violation[1],
                severity=violation[2],
                description=violation[0],
                is_resolved=is_resolved,
                resolution_notes="Проведена беседа" if is_resolved else None,
                resolved_date=today if is_resolved else None,
            )
            session.add(record)
            records.append(record)
        
        await session.commit()
        print(f"Created {len(records)} disciplinary records")
        return records


async def main():
    print("=" * 50)
    print("RESETTING AND SEEDING DATABASE")
    print("=" * 50)
    
    await clear_all_data()
    
    groups = await seed_groups()
    subjects = await seed_subjects()
    admin = await seed_admin()
    teachers = await seed_teachers()
    students = await seed_students(groups)
    schedules = await seed_schedule(groups, subjects, teachers)
    await seed_attendance(students, schedules)
    await seed_grades(students, subjects)
    await seed_disciplinary(students, teachers)
    
    print("=" * 50)
    print("DATABASE SEEDING COMPLETE!")
    print("=" * 50)
    print("\nТестовые аккаунты:")
    print("-" * 50)
    print("Администратор: admin@kaztbu.edu.kz / Admin123!")
    print("Преподаватель: aliev@kaztbu.edu.kz / Teacher123!")
    print("Студент:       student@kaztbu.edu.kz / Student123!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())

