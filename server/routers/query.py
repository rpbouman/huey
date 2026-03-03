"""
Query endpoints: /query/tuples, /query/cells, /query/picklist (tech spec).
"""

from fastapi import APIRouter, HTTPException

from server import datasets
from server.models import (
    CellsResponse,
    PicklistResponse,
    QueryCellsRequest,
    QueryPicklistRequest,
    QueryTuplesRequest,
    TuplesResponse,
)

router = APIRouter(prefix="/query", tags=["query"])


def _get_date_from_range(date_range: dict) -> str | None:
    """Extract a single date for partition path (single day or range start)."""
    if not date_range:
        return None
    t = date_range.get("type")
    if t == "single":
        return date_range.get("date")
    if t == "range":
        return date_range.get("start")
    return None


@router.post("/tuples", response_model=TuplesResponse)
def post_query_tuples(body: QueryTuplesRequest) -> TuplesResponse:
    """
    POST /query/tuples: fetch row or column headers (tuples) for one axis.
    Basic implementation: validates request, returns empty result or stub.
    """
    dataset_id = body.dataset_id
    schema = datasets.get_schema(dataset_id)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")

    date_range = body.date_range
    date_str = _get_date_from_range(date_range)
    if not date_str:
        raise HTTPException(status_code=400, detail="Invalid date_range")

    query = body.query or {}
    paging = query.get("paging") or {}
    limit = paging.get("limit", 200)
    offset = paging.get("offset", 0)

    # Basic: return empty tuple set; real engine wiring in later iterations
    return TuplesResponse(
        total_count=0,
        items=[],
        paging={"limit": limit, "offset": offset, "returned": 0},
    )


@router.post("/cells", response_model=CellsResponse)
def post_query_cells(body: QueryCellsRequest) -> CellsResponse:
    """
    POST /query/cells: fetch cell values for a window of row/column tuples.
    Basic implementation: validates request, returns empty cells.
    """
    dataset_id = body.dataset_id
    schema = datasets.get_schema(dataset_id)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")

    date_range = body.date_range
    if not _get_date_from_range(date_range):
        raise HTTPException(status_code=400, detail="Invalid date_range")

    return CellsResponse(cells=[])


@router.post("/picklist", response_model=PicklistResponse)
def post_query_picklist(body: QueryPicklistRequest) -> PicklistResponse:
    """
    POST /query/picklist: fetch distinct values for a field (filter UI).
    Basic implementation: validates request, returns empty values.
    """
    dataset_id = body.dataset_id
    schema = datasets.get_schema(dataset_id)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")

    if not _get_date_from_range(body.date_range):
        raise HTTPException(status_code=400, detail="Invalid date_range")

    query = body.query or {}
    paging = query.get("paging") or {}
    limit = paging.get("limit", 100)
    offset = paging.get("offset", 0)

    return PicklistResponse(
        total_count=0,
        values=[],
        paging={"limit": limit, "offset": offset, "returned": 0},
    )
