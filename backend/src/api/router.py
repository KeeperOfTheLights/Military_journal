from fastapi import APIRouter

from src.api.auth import router as auth_router
from src.api.users import router as users_router
from src.api.groups import router as groups_router
from src.api.subjects import router as subjects_router
from src.api.students import router as students_router
from src.api.teachers import router as teachers_router
from src.api.schedule import router as schedule_router
from src.api.attendance import router as attendance_router
from src.api.grades import router as grades_router
from src.api.assignments import router as assignments_router
from src.api.disciplinary import router as disciplinary_router
from src.api.analytics import router as analytics_router
from src.api.attachments import router as attachments_router
from src.api.assessment_events import router as assessment_events_router
from src.api.canvas import router as canvas_router
from src.api.gamification import router as gamification_router

main_router = APIRouter()

# Include all routers with /api prefix
main_router.include_router(auth_router, prefix="/api")
main_router.include_router(users_router, prefix="/api")
main_router.include_router(groups_router, prefix="/api")
main_router.include_router(subjects_router, prefix="/api")
main_router.include_router(students_router, prefix="/api")
main_router.include_router(teachers_router, prefix="/api")
main_router.include_router(schedule_router, prefix="/api")
main_router.include_router(attendance_router, prefix="/api")
main_router.include_router(grades_router, prefix="/api")
main_router.include_router(assignments_router, prefix="/api")
main_router.include_router(disciplinary_router, prefix="/api")
main_router.include_router(analytics_router, prefix="/api")
main_router.include_router(attachments_router, prefix="/api")
main_router.include_router(assessment_events_router, prefix="/api")
main_router.include_router(canvas_router, prefix="/api")
main_router.include_router(gamification_router, prefix="/api")
