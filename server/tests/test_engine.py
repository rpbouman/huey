"""Tests for DuckDB engine integration."""

from server import engine


def test_execute_sql_simple() -> None:
    """execute_sql runs a simple query and returns rows."""
    rows = engine.execute_sql("SELECT 1 AS x")
    assert rows == [[1]]


def test_execute_sql_with_params() -> None:
    """execute_sql accepts parameters."""
    rows = engine.execute_sql("SELECT ?::int AS v", (42,))
    assert rows == [[42]]


def test_get_connection() -> None:
    """get_connection returns a DuckDB connection that can run queries."""
    conn = engine.get_connection()
    try:
        r = conn.execute("SELECT 2").fetchone()
        assert r == (2,)
    finally:
        conn.close()
