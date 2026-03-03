"""Unit tests for QueryService config."""

import pytest

from server.config import Settings, get_settings


def test_get_settings_returns_settings() -> None:
    """get_settings returns a Settings instance."""
    s = get_settings()
    assert isinstance(s, Settings)
    assert s.host == "0.0.0.0"
    assert s.port == 8000
    assert s.log_level == "INFO"


def test_get_settings_cached() -> None:
    """get_settings is cached (same instance)."""
    assert get_settings() is get_settings()


def test_settings_defaults() -> None:
    """Settings have expected defaults for optional fields."""
    s = get_settings()
    assert hasattr(s, "datasets_config_path")
    assert hasattr(s, "s3_bucket")
    assert hasattr(s, "s3_region")
