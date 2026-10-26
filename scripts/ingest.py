"""Run from project root: python -m scripts.ingest. No API calls on dashboard requests."""
import argparse
import hashlib
import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from backend.app.config import DATA_DIR
from backend.app.data import Store, validate

BASE = 'https://data.elexon.co.uk/bmrs/api/v1/datasets/'
QUERIES = {
    'WINDFOR': {'publishDateTimeFrom': '2025-12-29T00:00:00Z', 'publishDateTimeTo': '2026-02-01T00:00:00Z'},
    'FUELHH': {'settlementDateFrom': '2026-01-02', 'settlementDateTo': '2026-02-01', 'fuelType': 'WIND'},
}


def fetch(url: str, timeout: float, attempts: int = 3) -> bytes:
    for attempt in range(attempts):
        try:
            with urlopen(Request(url, headers={'Accept': 'application/json', 'User-Agent': 'GridBricks-challenge/0.1'}), timeout=timeout) as response:
                return response.read()
        except HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == attempts-1:
                raise
            retry_after = exc.headers.get('Retry-After', '')
            delay = min(float(retry_after), 30) if retry_after.isdigit() else 2**attempt
        except (URLError, TimeoutError):
            if attempt == attempts-1:
                raise
            delay = 2**attempt
        time.sleep(delay)
    raise RuntimeError('No response')


def ingest(output: Path, timeout: float):
    if timeout <= 0:
        raise ValueError('Timeout must be positive')
    payloads, provenance = {}, []
    for dataset, params in QUERIES.items():
        url = BASE + dataset + '/stream?' + urlencode(params)
        content = fetch(url, timeout)
        rows = json.loads(content)
        records, duplicates = validate(rows, dataset)
        if not records:
            raise ValueError(f'{dataset} returned no rows; previous snapshot retained')
        filename = dataset.lower() + '.json'
        payloads[filename] = content
        provenance.append(dict(file=filename, sourceUrl=url, retrieved_at=datetime.now(timezone.utc).isoformat(),
                               sha256=hashlib.sha256(content).hexdigest(), bytes=len(content), rows=len(rows),
                               unique_records=len(records), exact_duplicates=duplicates,
                               first_target=min(r.start for r in records).isoformat(), last_target=max(r.start for r in records).isoformat(),
                               first_publication=min(r.published for r in records).isoformat(), last_publication=max(r.published for r in records).isoformat()))
    name = 'snapshots/' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    directory = output / name
    directory.mkdir(parents=True)
    for filename, content in payloads.items():
        (directory / filename).write_bytes(content)
    (directory / 'metadata.json').write_text(json.dumps(provenance, indent=2), encoding='utf-8')
    Store.load(directory)
    temporary = output / ('current-' + uuid.uuid4().hex + '.tmp')
    temporary.write_text(json.dumps({'snapshot': name}), encoding='utf-8')
    os.replace(temporary, output / 'current.json')
    print(json.dumps({'snapshot': str(directory), 'datasets': provenance}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DATA_DIR)
    parser.add_argument('--timeout', type=float, default=float(os.getenv('ELEXON_TIMEOUT_SECONDS', '45')))
    args = parser.parse_args()
    ingest(args.output, args.timeout)
