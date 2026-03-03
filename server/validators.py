"""
Request validators (date-range guardrails, etc.).
"""

import re

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_date_range(date_range: dict) -> tuple[str | None, str | None]:
    """
    Validate date_range envelope. Returns (date_str, error_message).
    date_str is the single date or range start for partition path; error_message is set if invalid.
    """
    if not date_range or not isinstance(date_range, dict):
        return None, "Invalid date_range"
    t = date_range.get("type")
    if t == "single":
        d = date_range.get("date")
        if not d or not _DATE_RE.match(str(d)):
            return None, "Invalid date (use YYYY-MM-DD)"
        return str(d), None
    if t == "range":
        start = date_range.get("start")
        end = date_range.get("end")
        if not start or not _DATE_RE.match(str(start)):
            return None, "Invalid range start (use YYYY-MM-DD)"
        if not end or not _DATE_RE.match(str(end)):
            return None, "Invalid range end (use YYYY-MM-DD)"
        if str(start) > str(end):
            return None, "Date range start must be <= end"
        return str(start), None
    return None, "Invalid date_range type (use single or range)"
