"""Tests for GET /schema API."""

import pytest
from fastapi.testclient import TestClient

from server.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_schema_found(client: TestClient) -> None:
    """GET /schema?dataset_id=trades_v1 returns 200 and schema (from default config)."""
    r = client.get("/schema", params={"dataset_id": "trades_v1"})
    assert r.status_code == 200
    data = r.json()
    assert data["dataset_id"] == "trades_v1"
    assert "fields" in data
    assert any(f["name"] == "symbol" for f in data["fields"])


def test_schema_not_found(client: TestClient) -> None:
    """GET /schema?dataset_id=nonexistent returns 404."""
    r = client.get("/schema", params={"dataset_id": "nonexistent"})
    assert r.status_code == 404
