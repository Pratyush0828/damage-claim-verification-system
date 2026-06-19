from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import analysis, auth, claims, evidence
from app.config import settings
from app.database.base import Base, SessionLocal, engine
from app.services.seed import seed_evidence_requirements


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_evidence_requirements(db)
    yield


app = FastAPI(
    title=settings.app_name,
    description="Multi-modal insurance damage claim verification API",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(claims.router, prefix=settings.api_v1_prefix)
app.include_router(analysis.router, prefix=settings.api_v1_prefix)
app.include_router(evidence.router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["System"])
def health() -> dict[str, str]:
    return {"status": "healthy", "service": settings.app_name}
