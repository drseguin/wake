"""
Version Manager

@fileoverview Reads build version and timestamp from version.json, which is
written by start.sh at deploy time. Keeps build metadata separate from
application configuration.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

import json
from pathlib import Path


_VERSION_FILE = Path(__file__).parent.parent / "version.json"
_cache = None


def get_version_info() -> dict:
    """
    Return build version info from version.json.

    @returns Dictionary with 'version' and 'build_timestamp' keys.
    """
    global _cache
    if _cache is None:
        _cache = _load()
    return _cache


def reload():
    """Force reload from disk (useful after start.sh updates the file)."""
    global _cache
    _cache = _load()


def _load() -> dict:
    try:
        with open(_VERSION_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "version": data.get("version", "dev"),
            "build_timestamp": data.get("build_timestamp", None),
        }
    except Exception:
        return {"version": "dev", "build_timestamp": None}
