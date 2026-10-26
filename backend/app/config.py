import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv('GRIDBRICKS_DATA_DIR', str(PROJECT_ROOT / 'data' / 'raw')))
CORS_ORIGINS = os.getenv('GRIDBRICKS_CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
DEFAULT_CUTOFF = os.getenv('GRIDBRICKS_DEFAULT_CUTOFF', '09:00')
ALIGNMENT = 'Hourly forecast point versus mean of both half-hour actuals; forecast averaging period is unconfirmed.'
