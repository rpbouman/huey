"""
S3 connectivity and partition path handling.

Builds partition paths per tech spec and provides a sample partition read
using DuckDB with the httpfs extension.
"""

from typing import Optional

import duckdb

from server.config import get_settings


def build_partition_path(
    bucket: str,
    dataset_id: str,
    date_str: str,
) -> str:
    """
    Build S3 path for a partition per tech spec:
    s3://<bucket>/<dataset_id>/date=<YYYY-MM-DD>/
    """
    return f"s3://{bucket}/{dataset_id}/date={date_str}/"


def sample_partition_read(
    bucket: str,
    dataset_id: str,
    date_str: str,
    *,
    region: Optional[str] = None,
    path_override: Optional[str] = None,
) -> int:
    """
    Run a sample read over a partition: COUNT(*) from parquet at the partition path.
    Uses DuckDB with httpfs for S3; AWS credentials from env (e.g. AWS_ACCESS_KEY_ID).
    Returns row count. Raises on connection/read errors.
    If path_override is set (e.g. local path for tests), use it instead of S3 path.
    """
    if path_override is not None:
        pattern = path_override
    else:
        path = build_partition_path(bucket, dataset_id, date_str)
        pattern = f"{path}*.parquet"

    conn = duckdb.connect(":memory:")
    try:
        if path_override is None:
            conn.execute("INSTALL httpfs; LOAD httpfs;")
            if region:
                conn.execute(f"SET s3_region='{region}';")
        rows = conn.execute(
            "SELECT count(*) FROM read_parquet(?)", [pattern]
        ).fetchone()
        return int(rows[0]) if rows else 0
    finally:
        conn.close()


def sample_partition_read_if_configured(
    dataset_id: str,
    date_str: str,
) -> Optional[int]:
    """
    Run sample_partition_read if S3 is configured (bucket set).
    Returns count or None if bucket not configured.
    """
    settings = get_settings()
    if not settings.s3_bucket:
        return None
    return sample_partition_read(
        settings.s3_bucket,
        dataset_id,
        date_str,
        region=settings.s3_region,
    )
