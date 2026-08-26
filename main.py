"""
Root proxy entrypoint for Sybrai FastAPI Backend.
Allows running:
    uvicorn main:app --reload --port 8000
from either the root directory or inside /backend.
"""

import sys
import os

# Add backend to Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.main import app  # noqa: F401
