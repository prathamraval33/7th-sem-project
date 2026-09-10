import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

# Test-safe defaults so settings can initialize without a local .env file.
os.environ.setdefault("DATABASE_URL", "sqlite:///./phase4_test.db")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("SMTP_HOST", "localhost")
os.environ.setdefault("SMTP_USERNAME", "test")
os.environ.setdefault("SMTP_PASSWORD", "test")
os.environ.setdefault("SMTP_FROM_EMAIL", "noreply@example.com")
os.environ.setdefault("SEARCH_API_KEY", "test-search-key")

from app.db.base import Base
from app.db.session import SessionLocal, engine, get_db
from app.main import app


from app.models.college import College, CollegeStatus


@pytest.fixture()
def db_session() -> Generator:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    # Seed default active college for test flows
    default_college = College(
        id=1,
        name="Birla Vishvakarma Mahavidyalaya (BVM)",
        domain="bvmengineering.ac.in",
        status=CollegeStatus.ACTIVE,
    )
    session.add(default_college)
    session.commit()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
