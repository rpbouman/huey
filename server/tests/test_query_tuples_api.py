"""Tests for POST /query/tuples API."""

import pytest
from fastapi.testclient import TestClient

from server.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_query_tuples_ok(client: TestClient) -> None:
    """POST /query/tuples with valid envelope returns 200 and tuple response shape."""
    body = {
        "dataset_id": "trades_v1",
        "date_range": {"type": "single", "date": "2026-03-01"},
        "query": {"axis": "rows", "fields": [{"field": "symbol"}], "paging": {"limit": 10, "offset": 0}},
    }
    r = client.post("/query/tuples", json=body)
    assert r.status_code == 200
    data = r.json()
    assert "total_count" in data
    assert "items" in data
    assert "paging" in data
    assert data["paging"]["returned"] == 0


def test_query_tuples_dataset_not_found(client: TestClient) -> None:
    """POST /query/tuples with unknown dataset_id returns 404."""
    body = {
        "dataset_id": "nonexistent",
        "date_range": {"type": "single", "date": "2026-03-01"},
        "query": {},
    }
    r = client.post("/query/tuples", json=body)
    assert r.status_code == 404


def test_query_tuples_bad_date_range(client: TestClient) -> None:
    """POST /query/tuples with invalid date_range returns 400."""
    body = {
        "dataset_id": "trades_v1",
        "date_range": {},
        "query": {},
    }
    r = client.post("/query/tuples", json=body)
    assert r.status_code == 400
