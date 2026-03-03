"""Tests for POST /query/cells API."""

import pytest
from fastapi.testclient import TestClient

from server.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_query_cells_ok(client: TestClient) -> None:
    """POST /query/cells with valid envelope returns 200 and cells array."""
    body = {
        "dataset_id": "trades_v1",
        "date_range": {"type": "single", "date": "2026-03-01"},
        "query": {
            "rows": {"start_index": 0, "count": 10},
            "columns": {"start_index": 0, "count": 5},
            "axes": {"rows": [{"field": "symbol"}], "columns": [{"field": "region"}], "measures": [{"field": "volume", "aggregation": "sum", "alias": "sum_volume"}]},
            "filters": [],
        },
    }
    r = client.post("/query/cells", json=body)
    assert r.status_code == 200
    assert r.json() == {"cells": []}


def test_query_cells_dataset_not_found(client: TestClient) -> None:
    """POST /query/cells with unknown dataset_id returns 404."""
    body = {"dataset_id": "nonexistent", "date_range": {"type": "single", "date": "2026-03-01"}, "query": {}}
    r = client.post("/query/cells", json=body)
    assert r.status_code == 404
