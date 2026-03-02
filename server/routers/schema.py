"""
Schema endpoint: GET /schema per tech spec.
"""

from fastapi import APIRouter, HTTPException

from server import datasets

router = APIRouter(tags=["schema"])


@router.get("/schema")
def get_schema(dataset_id: str) -> dict:
    """
    Fetch schema metadata for a dataset.
    GET /schema?dataset_id=trades_v1
    """
    schema = datasets.get_schema(dataset_id)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")
    return schema
