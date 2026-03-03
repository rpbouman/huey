"""
Export endpoint: POST /export, GET /export/{id} (MVP).
"""

import uuid

from fastapi import APIRouter, HTTPException

from server import datasets
from server.models import ExportRequest, ExportResponse, ExportStatusResponse
from server.validators import validate_date_range

router = APIRouter(prefix="/export", tags=["export"])

# In-memory export job store (MVP; no background worker)
_exports: dict[str, dict] = {}


@router.post("", response_model=ExportResponse)
def post_export(body: ExportRequest) -> ExportResponse:
    """
    POST /export: submit export job. MVP returns pending; no background processing.
    """
    dataset_id = body.dataset_id
    if datasets.get_schema(dataset_id) is None:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")
    _, err = validate_date_range(body.date_range or {})
    if err:
        raise HTTPException(status_code=400, detail=err)

    export_id = "exp-" + str(uuid.uuid4())[:8]
    _exports[export_id] = {"status": "pending", "dataset_id": dataset_id}
    return ExportResponse(export_id=export_id, status="pending")


@router.get("/{export_id}", response_model=ExportStatusResponse)
def get_export_status(export_id: str) -> ExportStatusResponse:
    """GET /export/{id}: return export job status (and download_url when complete)."""
    if export_id not in _exports:
        raise HTTPException(status_code=404, detail="Export not found")
    job = _exports[export_id]
    return ExportStatusResponse(
        export_id=export_id,
        status=job.get("status", "pending"),
        download_url=job.get("download_url"),
    )
