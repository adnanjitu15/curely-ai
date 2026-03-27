"""
SQLite Database Connection Manager
Uses SQLAlchemy for ORM-based access to the chat history database.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Store SQLite DB file in a persistent location within the app
DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATABASE_DIR, exist_ok=True)

DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'curely.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all database tables on startup."""
    from app.db.models import ChatSession, ChatMessage  # noqa: F401
    Base.metadata.create_all(bind=engine)
