"""
Request/response models for QueryService API (tech spec).
"""

from typing import Any, Optional

from pydantic import BaseModel


# --- Date range (envelope) ---
class DateRangeSingle(BaseModel):
    type: str = "single"
    date: str


class DateRangeRange(BaseModel):
    type: str = "range"
    start: str
    end: str


# --- Common envelope ---
class ClientContext(BaseModel):
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    huey_version: Optional[str] = None


class QueryTuplesRequest(BaseModel):
    """POST /query/tuples body (envelope)."""

    dataset_id: str
    date_range: dict[str, Any]  # single: {type, date} | range: {type, start, end}
    query: dict[str, Any]  # axis, fields, filters, paging
    client_context: Optional[ClientContext] = None


# --- Tuples query (inside query field) ---
class TupleFieldSpec(BaseModel):
    field: str
    derivation: Optional[str] = None
    sort: Optional[str] = None
    include_totals: Optional[bool] = None


class TupleFilter(BaseModel):
    field: str
    operator: str
    values: list[Any]


class PagingSpec(BaseModel):
    limit: int = 100
    offset: int = 0


# --- Tuples response ---
class TupleItem(BaseModel):
    values: list[Any]
    grouping_id: Optional[int] = None


class TuplesResponse(BaseModel):
    total_count: int
    items: list[TupleItem]
    paging: dict[str, int]  # limit, offset, returned


# --- Cells (POST /query/cells) ---
class QueryCellsRequest(BaseModel):
    """POST /query/cells body (envelope)."""

    dataset_id: str
    date_range: dict[str, Any]
    query: dict[str, Any]  # rows, columns, axes, filters
    client_context: Optional[ClientContext] = None


class CellsResponse(BaseModel):
    cells: list[dict[str, Any]]  # [{row_index, column_index, values: {alias: value}}]


# --- Picklist (POST /query/picklist) ---
class QueryPicklistRequest(BaseModel):
    """POST /query/picklist body (envelope)."""

    dataset_id: str
    date_range: dict[str, Any]
    query: dict[str, Any]  # field, search, filters, paging
    client_context: Optional[ClientContext] = None


class PicklistResponse(BaseModel):
    total_count: int
    values: list[dict[str, str]]  # [{value, label}]
    paging: dict[str, int]  # limit, offset, returned


# --- Export (POST /export, GET /export/{id}) ---
class ExportRequest(BaseModel):
    """POST /export body (envelope)."""

    dataset_id: str
    date_range: dict[str, Any]
    query: dict[str, Any]  # export_type, axes, filters, max_rows, format
    client_context: Optional[ClientContext] = None


class ExportResponse(BaseModel):
    export_id: str
    status: str  # pending | complete | failed


class ExportStatusResponse(BaseModel):
    export_id: str
    status: str
    download_url: Optional[str] = None
