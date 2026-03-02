"""
Analytical engine integration: DuckDB in-process.

Provides a thin wrapper to execute SQL (e.g. over parquet). S3 connectivity
and partition paths are added in a later issue.
"""

from typing import Any

import duckdb


def execute_sql(sql: str, parameters: tuple[Any, ...] | None = None) -> list[list[Any]]:
    """
    Execute a SQL query using an in-process DuckDB connection.
    Returns rows as list of lists. Use for read-only queries.
    """
    conn = duckdb.connect(":memory:")
    try:
        if parameters:
            result = conn.execute(sql, parameters).fetchall()
        else:
            result = conn.execute(sql).fetchall()
        return [list(row) for row in result]
    finally:
        conn.close()


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return a new in-memory DuckDB connection for callers that need a connection."""
    return duckdb.connect(":memory:")
