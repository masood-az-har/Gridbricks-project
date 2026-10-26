"""Validate and load immutable snapshots once, outside request handling."""
import hashlib
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


class DataError(ValueError):
    pass


def instant(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, AttributeError) as exc:
        raise DataError(f'Invalid timestamp: {value!r}') from exc
    if parsed.utcoffset() is None:
        raise DataError('Timestamps must include a timezone')
    return parsed.astimezone(timezone.utc)


@dataclass(frozen=True)
class Record:
    start: datetime
    published: datetime
    generation: float | None


def validate(rows: list, dataset: str) -> tuple[list[Record], int]:
    if not isinstance(rows, list):
        raise DataError(f'{dataset}: expected a JSON array')
    unique = {}
    duplicates = 0
    for row in rows:
        if not isinstance(row, dict) or row.get('dataset') != dataset:
            raise DataError(f'{dataset}: unexpected dataset or record shape')
        if dataset == 'FUELHH' and row.get('fuelType') != 'WIND':
            raise DataError('FUELHH snapshot must contain WIND only')
        try:
            start, published = instant(row['startTime']), instant(row['publishTime'])
            value = row['generation']
        except KeyError as exc:
            raise DataError(f'Missing field: {exc}') from exc
        if value is not None and (isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or value < 0):
            raise DataError(f'{dataset}: invalid generation {value!r}')
        minutes = (0,) if dataset == 'WINDFOR' else (0, 30)
        if start.minute not in minutes or start.second or start.microsecond:
            raise DataError(f'{dataset}: unexpected target resolution at {start}')
        if dataset == 'FUELHH':
            # Scope is January/February 2026, when London equals UTC.
            if row.get('settlementDate') != start.date().isoformat() or row.get('settlementPeriod') != start.hour * 2 + start.minute // 30 + 1:
                raise DataError('Actual settlement fields disagree with startTime')
        record = Record(start, published, value)
        key = (start, published)
        if key in unique:
            if unique[key] != record:
                raise DataError(f'{dataset}: conflicting duplicate at {key}')
            duplicates += 1
        unique[key] = record
    return sorted(unique.values(), key=lambda r: (r.start, r.published)), duplicates


class Store:
    def __init__(self, forecasts: list[Record], actuals: list[Record], provenance=None, duplicates=None):
        self.forecasts = {}
        self.actuals = {}
        for record in forecasts:
            self.forecasts.setdefault(record.start, []).append(record)
        for values in self.forecasts.values():
            values.sort(key=lambda r: r.published)
        # Retrospective actuals: most recent publication, never an older non-null fallback.
        for record in actuals:
            if record.start not in self.actuals or record.published > self.actuals[record.start].published:
                self.actuals[record.start] = record
        self.provenance = provenance or []
        self.duplicates = duplicates or {}
        self.forecast_count = len(forecasts)
        self.actual_count = len(actuals)

    @classmethod
    def load(cls, directory: Path):
        # New ingestions use an atomic pointer, keeping the two data files consistent.
        pointer = directory / 'current.json'
        if pointer.exists():
            name = json.loads(pointer.read_text(encoding='utf-8-sig'))['snapshot']
            resolved = (directory / name).resolve()
            if not resolved.is_relative_to(directory.resolve()):
                raise DataError('Invalid snapshot path')
            directory = resolved
        provenance = json.loads((directory / 'metadata.json').read_text(encoding='utf-8-sig'))
        if not isinstance(provenance, list):
            raise DataError('Metadata must be a list')
        records, duplicates = {}, {}
        for filename, dataset in [('windfor.json', 'WINDFOR'), ('fuelhh.json', 'FUELHH')]:
            content = (directory / filename).read_bytes()
            entry = next((p for p in provenance if p.get('file') == filename), None)
            if entry is None or hashlib.sha256(content).hexdigest().lower() != entry.get('sha256', '').lower():
                raise DataError(f'{filename}: missing provenance or checksum mismatch')
            records[dataset], duplicates[dataset] = validate(json.loads(content), dataset)
        return cls(records['WINDFOR'], records['FUELHH'], provenance, duplicates)
