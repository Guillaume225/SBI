"""
Configuration de la base de données (SQLite par défaut, SQL Server en option)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

connect_args = {}
if settings.DB_TYPE == "sqlite":
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    echo=settings.DEBUG,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    """Crée toutes les tables si elles n'existent pas encore."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dépendance FastAPI pour obtenir une session DB."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
