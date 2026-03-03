"""Tests for POST /export and GET /export/{id}."""

import pytest
from fastapi.testclient import TestClient

from server.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_post_export_ok(client: TestClient) -> None:
    """POST /export with valid envelope returns 200 and export_id."""
    body = {
        "dataset_id": "trades_v1",
        "date_range": {"type": "single", "date": "2026-03-01"},
        "query": {"export_type": "pivot_results", "axes": {}, "filters": [], "max_rows": 1000, "format": "csv"},
    }
    r = client.post("/export", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "pending"
    assert "export_id" in data and data["export_id"].startswith("exp-")


def test_get_export_status(client: TestClient) -> None:
    """GET /export/{id} after POST returns status."""
    body = {"dataset_id": "trades_v1", "date_range": {"type": "single", "date": "2026-03-01"}, "query": {}}
    post_r = client.post("/export", json=body)
    export_id = post_r.json()["export_id"]
    r = client.get(f"/export/{export_id}")
    assert r.status_code == 200
    assert r.json()["export_id"] == export_id
    assert r.json()["status"] == "pending"


def test_get_export_not_found(client: TestClient) -> None:
    """GET /export/{id} for unknown id returns 404."""
    r = client.get("/export/exp-nonexistent")
    assert r.status_code == 404


def test_post_export_bad_date_range(client: TestClient) -> None:
    """POST /export with invalid date_range returns 400."""
    body = {"dataset_id": "trades_v1", "date_range": {"type": "range", "start": "2026-03-01", "end": "2026-01-01"}, "query": {}}
    r = client.post("/export", json=body)
    assert r.status_code == 400
