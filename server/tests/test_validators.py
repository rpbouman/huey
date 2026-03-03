"""Unit tests for request validators (date-range guardrails)."""

import pytest

from server.validators import validate_date_range


def test_validate_date_range_single_ok() -> None:
    """Single date YYYY-MM-DD returns (date, None)."""
    date_str, err = validate_date_range({"type": "single", "date": "2026-03-01"})
    assert date_str == "2026-03-01"
    assert err is None


def test_validate_date_range_single_invalid_date() -> None:
    """Single date with bad format returns error."""
    _, err = validate_date_range({"type": "single", "date": "03-01-2026"})
    assert err == "Invalid date (use YYYY-MM-DD)"
    _, err2 = validate_date_range({"type": "single", "date": ""})
    assert err2 == "Invalid date (use YYYY-MM-DD)"
    _, err3 = validate_date_range({"type": "single"})
    assert err3 == "Invalid date (use YYYY-MM-DD)"


def test_validate_date_range_range_ok() -> None:
    """Range with start <= end returns (start, None)."""
    date_str, err = validate_date_range({
        "type": "range",
        "start": "2026-01-01",
        "end": "2026-03-01",
    })
    assert date_str == "2026-01-01"
    assert err is None
    date_str2, err2 = validate_date_range({
        "type": "range",
        "start": "2026-03-01",
        "end": "2026-03-01",
    })
    assert date_str2 == "2026-03-01"
    assert err2 is None


def test_validate_date_range_range_start_after_end() -> None:
    """Range with start > end returns error."""
    _, err = validate_date_range({
        "type": "range",
        "start": "2026-03-01",
        "end": "2026-01-01",
    })
    assert err == "Date range start must be <= end"


def test_validate_date_range_range_invalid_start_or_end() -> None:
    """Range with invalid start or end returns error."""
    _, err = validate_date_range({"type": "range", "start": "2026-01-01", "end": "bad"})
    assert err == "Invalid range end (use YYYY-MM-DD)"
    _, err2 = validate_date_range({"type": "range", "start": "bad", "end": "2026-01-01"})
    assert err2 == "Invalid range start (use YYYY-MM-DD)"
    _, err3 = validate_date_range({"type": "range", "end": "2026-01-01"})
    assert err3 == "Invalid range start (use YYYY-MM-DD)"


def test_validate_date_range_invalid_type() -> None:
    """Unknown type returns error."""
    _, err = validate_date_range({"type": "weekly", "date": "2026-03-01"})
    assert err == "Invalid date_range type (use single or range)"


def test_validate_date_range_empty_or_not_dict() -> None:
    """Missing or non-dict date_range returns error."""
    _, err = validate_date_range({})
    assert err == "Invalid date_range"
    _, err2 = validate_date_range(None)
    assert err2 == "Invalid date_range"
    _, err3 = validate_date_range([])
    assert err3 == "Invalid date_range"
