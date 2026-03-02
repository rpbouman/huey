"""
Dataset configuration loader.

Loads dataset and schema metadata from a YAML config file (e.g. dataset_id, fields).
"""

from pathlib import Path
from typing import Any, Optional

import yaml

from server.config import get_settings


def _default_config_path() -> Path:
    """Default path to datasets config (next to this file)."""
    return Path(__file__).resolve().parent / "datasets_config" / "datasets.yaml"


def load_datasets_config() -> dict[str, Any]:
    """
    Load the datasets config from YAML.
    Returns a dict with key 'datasets': list of { dataset_id, fields }.
    """
    settings = get_settings()
    path = settings.datasets_config_path
    if path is None or path == "":
        path = _default_config_path()
    else:
        path = Path(path)

    if not path.exists():
        return {"datasets": []}

    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if not data or not isinstance(data, dict):
        return {"datasets": []}
    if "datasets" not in data or not isinstance(data["datasets"], list):
        return {"datasets": []}
    return data


def get_schema(dataset_id: str) -> Optional[dict[str, Any]]:
    """
    Return schema for a dataset: { dataset_id, fields }.
    Returns None if dataset_id is not found.
    """
    config = load_datasets_config()
    for ds in config.get("datasets", []):
        if isinstance(ds, dict) and ds.get("dataset_id") == dataset_id:
            return {
                "dataset_id": dataset_id,
                "fields": ds.get("fields", []),
            }
    return None
