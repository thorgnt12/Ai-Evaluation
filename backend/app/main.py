import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from .config import UPLOAD_DIR
from .routers import (
    auth, exams, questions, submissions,
    grading, review, analytics, reports,
    student_portal, seed_demo
)

# Auto-create all SQLAlchemy database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartGrade / EvalAI API",
    description="AI-Assisted Assessment and Grading Web Platform with Full Teacher Authority",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory for static inspection
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Register Routers
app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(questions.router)
app.include_router(questions.lens_router)
app.include_router(submissions.router)
app.include_router(grading.router)
app.include_router(review.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(student_portal.router)
app.include_router(seed_demo.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "SmartGrade / EvalAI Assessment Platform",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.on_event("startup")
def on_startup():
    from .database import SessionLocal
    from .models.exam import Exam
    from .routers.seed_demo import seed_all_demo_data
    db = SessionLocal()
    try:
        if db.query(Exam).count() == 0:
            seed_all_demo_data(db)
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
