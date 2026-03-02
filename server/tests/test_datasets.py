"""Tests for dataset configuration loader."""

import tempfile
from pathlib import Path

import pytest

from server import datasets


def test_load_datasets_config_missing_file(monkeypatch: pytest.MonkeyPatch) -> None:
    """When config path points to missing file, return empty datasets."""
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "nonexistent.yaml"
        monkeypatch.setattr(
            "server.datasets.get_settings",
            lambda: type("S", (), {"datasets_config_path": str(path)})(),
        )
        # Force reload of config path
        assert path.exists() is False
        result = datasets.load_datasets_config()
    assert result == {"datasets": []}


def test_get_schema_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """get_schema returns schema when dataset_id exists in config."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write("""
datasets:
  - dataset_id: test_ds
    fields:
      - name: id
        type: string
        is_dimension: true
""")
        path = f.name
    try:
        monkeypatch.setattr(
            "server.datasets.get_settings",
            lambda: type("S", (), {"datasets_config_path": path})(),
        )
        schema = datasets.get_schema("test_ds")
        assert schema is not None
        assert schema["dataset_id"] == "test_ds"
        assert len(schema["fields"]) == 1
        assert schema["fields"][0]["name"] == "id"
    finally:
        Path(path).unlink()


def test_get_schema_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """get_schema returns None when dataset_id is not in config."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write("datasets: []")
        path = f.name
    try:
        monkeypatch.setattr(
            "server.datasets.get_settings",
            lambda: type("S", (), {"datasets_config_path": path})(),
        )
        assert datasets.get_schema("missing") is None
    finally:
        Path(path).unlink()
