import os
import sys
import uuid
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from pgvector.sqlalchemy import Vector
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --------------------------------------------------------------------------
# SQLite dialect fixes for PostgreSQL-specific types
# --------------------------------------------------------------------------
@compiles(Vector, "sqlite")
def compile_vector_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"

# Patch UUID type processors so SQLite stores/retrieves plain strings
_orig_result = PG_UUID.result_processor
def _uuid_result_proc(self, dialect, coltype):
    if dialect.name == "sqlite":
        def process(value):
            return str(value) if value is not None else None
        return process
    return _orig_result(self, dialect, coltype)
PG_UUID.result_processor = _uuid_result_proc

_orig_bind = PG_UUID.bind_processor
def _uuid_bind_proc(self, dialect):
    if dialect.name == "sqlite":
        def process(value):
            return str(value) if value is not None else None
        return process
    return _orig_bind(self, dialect)
PG_UUID.bind_processor = _uuid_bind_proc

# --------------------------------------------------------------------------
# App imports (after dialect patches)
# --------------------------------------------------------------------------
from app.db.session import Base, get_db
import app.models  # noqa: F401
from app.models.user import User
from app.core.security import get_password_hash, create_access_token
from app.main import app

# --------------------------------------------------------------------------
# Test database
# --------------------------------------------------------------------------
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"
engine_test = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture
def db():
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --------------------------------------------------------------------------
# User fixtures
# --------------------------------------------------------------------------
@pytest.fixture
def agent_user(db):
    user = db.query(User).filter(User.email == "test_agent@supportpilot.demo").first()
    if not user:
        user = User(
            id=uuid.uuid4(), email="test_agent@supportpilot.demo",
            name="Test Agent", hashed_password=get_password_hash("pass1234"),
            role="agent", is_active=True,
        )
        db.add(user); db.commit(); db.refresh(user)
    return user


@pytest.fixture
def admin_user(db):
    user = db.query(User).filter(User.email == "test_admin@supportpilot.demo").first()
    if not user:
        user = User(
            id=uuid.uuid4(), email="test_admin@supportpilot.demo",
            name="Test Admin", hashed_password=get_password_hash("pass1234"),
            role="admin", is_active=True,
        )
        db.add(user); db.commit(); db.refresh(user)
    return user


@pytest.fixture
def agent_token(agent_user):
    return create_access_token(data={"sub": str(agent_user.id)})

@pytest.fixture
def admin_token(admin_user):
    return create_access_token(data={"sub": str(admin_user.id)})

@pytest.fixture
def agent_headers(agent_token):
    return {"Authorization": f"Bearer {agent_token}"}

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --------------------------------------------------------------------------
# Gemini mock Ã¢â‚¬â€ patches at the call sites (where functions are imported INTO)
# --------------------------------------------------------------------------
MOCK_EMBEDDING = [0.1] * 768
MOCK_CLASSIFY  = {"category": "technical", "urgency": "high", "confidence": 0.95, "escalate": False, "reasoning": "Technical"}
MOCK_DRAFT     = {"content": "--- DRAFT - NOT SENT ---\nBased on [Source 1] your issue can be resolved.", "requires_escalation": False, "confidence": "high", "sources_used": []}
MOCK_COPILOT   = {"answer": "Based on [Source 1], here is the answer.", "requires_escalation": False, "confidence": "high"}

PATCH_TARGETS = [
    # Where functions are actually called from (import target matters for mock)
    ("app.services.embedding_service.get_embedding",        MOCK_EMBEDDING),
    ("app.services.gemini_service.generate_embedding",      MOCK_EMBEDDING),
    ("app.services.gemini_service.generate_text",           "Mocked AI [Source 1]"),
    ("app.services.gemini_service.classify_ticket",         MOCK_CLASSIFY),
    ("app.services.gemini_service.generate_draft",          MOCK_DRAFT),
    ("app.services.gemini_service.answer_copilot",          MOCK_COPILOT),
    # Route-level imports (where `from x import y` creates local bindings)
    ("app.api.routes.tickets.classify_ticket",              MOCK_CLASSIFY),
    ("app.api.routes.drafts.semantic_search",               {"results": [], "query": "q", "total_found": 0, "search_time_ms": 0.1}),
    ("app.api.routes.drafts.generate_draft",                MOCK_DRAFT),
    ("app.api.routes.ai.answer_copilot",                    MOCK_COPILOT),
    ("app.api.routes.ai.classify_ticket",                   MOCK_CLASSIFY),
    ("app.api.routes.ai.semantic_search",                   {"results": [], "query": "q", "total_results": 0}),
    ("app.services.evaluation_service.answer_copilot",      MOCK_COPILOT),
    ("app.services.evaluation_service.semantic_search",     {"results": [], "query": "q", "total_results": 0}),
    ("app.services.ingestion_service.get_embedding",        MOCK_EMBEDDING),
    ("app.services.rag_service.get_embedding",             MOCK_EMBEDDING),
    ("app.api.routes.rag.semantic_search",                 {"results": [], "query": "q", "total_found": 0, "search_time_ms": 1.0}),
]


@pytest.fixture(autouse=True)
def mock_gemini():
    patches, mocks = [], {}
    for target, retval in PATCH_TARGETS:
        try:
            p = patch(target, return_value=retval)
            m = p.start()
            patches.append(p)
            mocks[target.split(".")[-1]] = m
        except (AttributeError, ModuleNotFoundError):
            pass
    yield mocks
    for p in patches:
        try: p.stop()
        except Exception: pass