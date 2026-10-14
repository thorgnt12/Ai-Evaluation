import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Document subdirectories
EXAM_DOCS_DIR = UPLOAD_DIR / "exam_docs"
SUBMISSIONS_DIR = UPLOAD_DIR / "submissions"
REPORTS_DIR = UPLOAD_DIR / "reports"

EXAM_DOCS_DIR.mkdir(parents=True, exist_ok=True)
SUBMISSIONS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'smartgrade.db'}")
SECRET_KEY = os.getenv("SECRET_KEY", "smartgrade-super-secret-jwt-key-2026-evalai")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# OCR Quality Settings
OCR_CONFIDENCE_THRESHOLD = 0.0  # Set to 0.0 to never block submissions (bypass gate)

# Tesseract executable default for Windows
TESSERACT_CMD = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

# Trusted Academic & Educational Domains for Web Fact Verification (Scenario B)
TRUSTED_DOMAINS = [
    "edu",
    "gov",
    "ac.uk",
    "wikipedia.org",
    "britannica.com",
    "geeksforgeeks.org",
    "w3schools.com",
    "nature.com",
    "sciencedirect.com",
    "ieee.org",
    "ncbi.nlm.nih.gov",
    "khanacademy.org"
]
