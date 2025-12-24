from fastapi import FastAPI
from backend.src.api.router import main_router
app = FastAPI(title="Military Journal")
app.include_router(main_router)