from dotenv import load_dotenv
from fastapi import FastAPI
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.db.database import Base, engine
from app.models import (
    OutreachMessage,
    Prospect,
)  # noqa: F401
from app.api.routes import collectors

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Music Hunter AI",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(api_router)

app.include_router(
    collectors.router,
    prefix="/api/v1",
)
@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Music Hunter AI API fonctionne",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
    }