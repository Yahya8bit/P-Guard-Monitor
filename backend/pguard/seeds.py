"""Read-only access to the log-derived JSON seeds shared with the frontend
mock (frontend/src/services/data/). PG-001 is the only robot with real data
here; everything else is synthetic (see management/commands/seed_data.py)."""
import json
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / 'frontend' / 'src' / 'services' / 'data'
REAL_ROBOT_ID = 'PG-001'


@lru_cache
def info_seed() -> dict:
    return json.loads((DATA_DIR / 'info_seed.json').read_text())


@lru_cache
def gps_seed() -> dict:
    return json.loads((DATA_DIR / 'gps_seed.json').read_text())


@lru_cache
def kpi_seed() -> dict:
    return json.loads((DATA_DIR / 'kpi_seed.json').read_text())
