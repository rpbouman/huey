"""Tests for S3 connectivity and sample partition read."""

from pathlib import Path

import duckdb

from server import s3


def test_build_partition_path() -> None:
    """Partition path follows tech spec: s3://bucket/dataset_id/date=YYYY-MM-DD/."""
    path = s3.build_partition_path("my-bucket", "trades_v1", "2026-03-01")
    assert path == "s3://my-bucket/trades_v1/date=2026-03-01/"


def test_sample_partition_read_local(tmp_path: Path) -> None:
    """sample_partition_read with path_override reads local parquet."""
    parquet_file = tmp_path / "part-0.parquet"
    conn = duckdb.connect(":memory:")
    conn.execute("CREATE TABLE t AS SELECT 1 AS a, 2 AS b")
    conn.execute(f"COPY t TO '{parquet_file}' (FORMAT PARQUET)")
    conn.close()

    count = s3.sample_partition_read(
        "b", "d", "2026-01-01",
        path_override=str(parquet_file),
    )
    assert count == 1


def test_sample_partition_read_if_configured_no_bucket() -> None:
    """When s3_bucket is not set, returns None (default config)."""
    # Default config has s3_bucket=None
    result = s3.sample_partition_read_if_configured("ds", "2026-01-01")
    assert result is None
