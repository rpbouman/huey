"""Tests for POST /query/picklist API."""

import pytest
from fastapi.testclient import TestClient

from server.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_query_picklist_ok(client: TestClient) -> None:
    """POST /query/picklist with valid envelope returns 200 and picklist shape."""
    body = {
        "dataset_id": "trades_v1",
        "date_range": {"type": "single", "date": "2026-03-01"},
        "query": {"field": "symbol", "search": "AA*", "filters": [], "paging": {"limit": 100, "offset": 0}},
    }
    r = client.post("/query/picklist", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["total_count"] == 0
    assert data["values"] == []
    assert data["paging"]["returned"] == 0


def test_query_picklist_dataset_not_found(client: TestClient) -> None:
    """POST /query/picklist with unknown dataset_id returns 404."""
    body = {"dataset_id": "nonexistent", "date_range": {"type": "single", "date": "2026-03-01"}, "query": {}}
    r = client.post("/query/picklist", json=body)
    assert r.status_code == 404
