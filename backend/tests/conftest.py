import os

import pytest

from app import create_app
from app.extensions import db

TEST_DATABASE_URI = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://wc26:wc26@localhost:5433/wc26_test",
)


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv("WC26_SKIP_DB_BOOTSTRAP", "1")
    app = create_app("development")
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": TEST_DATABASE_URI,
    })
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()
