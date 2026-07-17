"""SQLAlchemy 2.0 declarative base shared by every model in app/models/."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
