"""
Backend integration tests: full API flow with real app and config.

Exercises schema → query (tuples, cells, picklist) → export in sequence
using the default dataset config (no S3 required).
"""

import pytest
from fastapi.testclient import TestClient

from server.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_full_api_flow(client: TestClient) -> None:
    """
    Integration: GET schema → POST tuples, cells, picklist → POST export → GET export status.
    Uses dataset_id from default config (e.g. trades_v1).
    """
    dataset_id = "trades_v1"
    date_range = {"type": "single", "date": "2026-03-01"}

    # 1. Schema
    r_schema = client.get("/schema", params={"dataset_id": dataset_id})
    assert r_schema.status_code == 200
    schema = r_schema.json()
    assert schema["dataset_id"] == dataset_id
    assert "fields" in schema

    # 2. Tuples
    r_tuples = client.post(
        "/query/tuples",
        json={
            "dataset_id": dataset_id,
            "date_range": date_range,
            "query": {"axis": "rows", "fields": [{"field": "symbol"}], "paging": {"limit": 10, "offset": 0}},
        },
    )
    assert r_tuples.status_code == 200
    assert "items" in r_tuples.json() and "total_count" in r_tuples.json()

    # 3. Cells
    r_cells = client.post(
        "/query/cells",
        json={
            "dataset_id": dataset_id,
            "date_range": date_range,
            "query": {
                "rows": {"start_index": 0, "count": 5},
                "columns": {"start_index": 0, "count": 5},
                "axes": {"rows": [], "columns": [], "measures": []},
                "filters": [],
            },
        },
    )
    assert r_cells.status_code == 200
    assert "cells" in r_cells.json()

    # 4. Picklist
    r_picklist = client.post(
        "/query/picklist",
        json={
            "dataset_id": dataset_id,
            "date_range": date_range,
            "query": {"field": "symbol", "search": "", "filters": [], "paging": {"limit": 100, "offset": 0}},
        },
    )
    assert r_picklist.status_code == 200
    assert "values" in r_picklist.json() and "total_count" in r_picklist.json()

    # 5. Export
    r_export_post = client.post(
        "/export",
        json={
            "dataset_id": dataset_id,
            "date_range": date_range,
            "query": {"export_type": "pivot_results", "axes": {}, "filters": [], "max_rows": 1000, "format": "csv"},
        },
    )
    assert r_export_post.status_code == 200
    data = r_export_post.json()
    assert data["status"] == "pending"
    export_id = data["export_id"]

    # 6. Export status
    r_export_get = client.get(f"/export/{export_id}")
    assert r_export_get.status_code == 200
    assert r_export_get.json()["export_id"] == export_id
    assert r_export_get.json()["status"] == "pending"


def test_health_then_schema(client: TestClient) -> None:
    """Integration: health endpoints then schema (readiness before traffic)."""
    r_live = client.get("/health/liveness")
    assert r_live.status_code == 200
    r_ready = client.get("/health/readiness")
    assert r_ready.status_code == 200
    r_schema = client.get("/schema", params={"dataset_id": "trades_v1"})
    assert r_schema.status_code == 200
