"""
database.py — SQLAlchemy database session and engine setup.
Supports Supabase PostgreSQL + PostGIS with graceful fallback to SQLite for local development.
"""
import json
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config import settings

Base = declarative_base()

# Determine database engine
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    # Fix postgresql:// dialect for SQLAlchemy
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """Context manager for scripts and background ingestion tasks."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Create all tables in local database if they do not exist."""
    try:
        from backend.app.models import (
            station, air_quality, weather, traffic, industrial_zone, forecast, scenario
        )
        Base.metadata.create_all(bind=engine)
        print("[Database] Schema initialized successfully.")
    except Exception as e:
        print(f"[Database] Schema init warning: {e}")
