"""Business rules independent of HTTP and storage."""
import math
import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from .data import Store

LONDON = ZoneInfo('Europe/London')
FIRST_DECISION = date(2026, 1, 1)
LAST_DECISION = date(2026, 1, 31)
FIRST_DELIVERY = date(2026, 1, 2)
LAST_DELIVERY = date(2026, 2, 1)


def parse_cutoff(value: str) -> time:
    if not re.fullmatch(r'\d{2}:\d{2}', value):
        raise ValueError('Cutoff must be HH:MM in Europe/London')
    return time.fromisoformat(value)


def decision_instant(day: date, cutoff: str) -> datetime:
    if not FIRST_DECISION <= day <= LAST_DECISION:
        raise ValueError('Decision date must be 1–31 January 2026')
    return datetime.combine(day, parse_cutoff(cutoff), LONDON).astimezone(timezone.utc)


def targets(day: date) -> list[datetime]:
    start = datetime.combine(day, time(), LONDON).astimezone(timezone.utc)
    end = datetime.combine(day + timedelta(days=1), time(), LONDON).astimezone(timezone.utc)
    return [start + timedelta(hours=i) for i in range(int((end - start).total_seconds() / 3600))]


def select(store: Store, target: datetime, cutoff: datetime):
    return next((r for r in reversed(store.forecasts.get(target, [])) if r.published <= cutoff), None)


def forecast_day(store: Store, day: date, cutoff: str) -> dict:
    decided = decision_instant(day, cutoff)
    delivery = day + timedelta(days=1)
    intervals = []
    for target in targets(delivery):
        chosen = select(store, target, decided)
        intervals.append(dict(start_time=target, forecast_mw=chosen.generation if chosen else None,
                              publish_time=chosen.published if chosen else None,
                              publication_age_hours=(decided - chosen.published).total_seconds() / 3600 if chosen else None))
    available = [p for p in intervals if p['forecast_mw'] is not None]
    publications = sorted({p['publish_time'] for p in intervals if p['publish_time'] is not None})
    minimum = min(available, key=lambda p: p['forecast_mw']) if available else None
    return dict(decision_time=decided, delivery_date=delivery, timezone='Europe/London',
                expected_points=len(intervals), available_points=len(available), missing_points=len(intervals)-len(available),
                mean_forecast_mw=sum(p['forecast_mw'] for p in available)/len(available) if available else None,
                minimum_forecast_mw=minimum['forecast_mw'] if minimum else None,
                minimum_time=minimum['start_time'] if minimum else None,
                publication_times=publications, mixed_publications=len(publications)>1, intervals=intervals)


def metrics(points: list[dict]) -> dict:
    errors = [p['error_mw'] for p in points if p['error_mw'] is not None]
    variation = [p['within_hour_half_range_mw'] for p in points if p['within_hour_half_range_mw'] is not None]
    return dict(expected_points=len(points), matched_points=len(errors), missing_points=len(points)-len(errors),
                missing_forecast_points=sum(p['forecast_mw'] is None for p in points),
                missing_actual_hours=sum(p['actual_mw'] is None for p in points),
                missing_actual_half_hours=sum(sum(v is None for v in p['actual_half_hours_mw']) for p in points),
                coverage_percent=100*len(errors)/len(points) if points else 0,
                mae_mw=sum(abs(e) for e in errors)/len(errors) if errors else None,
                rmse_mw=math.sqrt(sum(e*e for e in errors)/len(errors)) if errors else None,
                bias_mw=sum(errors)/len(errors) if errors else None,
                mean_within_hour_half_range_mw=sum(variation)/len(variation) if variation else None,
                variation_hours=len(variation))


def comparison(store: Store, delivery: date, cutoff: str) -> dict:
    if not FIRST_DELIVERY <= delivery <= LAST_DELIVERY:
        raise ValueError('Delivery date must be 2 January–1 February 2026')
    forecast = forecast_day(store, delivery-timedelta(days=1), cutoff)
    points = []
    for point in forecast['intervals']:
        actuals = [store.actuals.get(point['start_time'] + timedelta(minutes=m)) for m in (0, 30)]
        values = [r.generation if r else None for r in actuals]
        complete = all(v is not None for v in values)
        mean = sum(values)/2 if complete else None
        f = point['forecast_mw']
        error = f-mean if f is not None and mean is not None else None
        points.append(dict(**point, actual_mw=mean, actual_half_hours_mw=values,
                           actual_publish_times=[r.published if r else None for r in actuals],
                           error_mw=error, within_hour_half_range_mw=abs(values[0]-values[1])/2 if complete else None,
                           constant_forecast_half_hour_rmse_mw=math.sqrt(sum((f-v)**2 for v in values)/2) if error is not None else None))
    return dict(delivery_date=delivery, decision_time=forecast['decision_time'], retrospective=True,
                metrics=metrics(points), intervals=points)


def accuracy(store: Store, start: date, end: date, cutoff: str) -> dict:
    if not FIRST_DELIVERY <= start <= end <= LAST_DELIVERY:
        raise ValueError('Evaluation range must be ordered and within 2 January–1 February 2026')
    daily, points = [], []
    for offset in range((end-start).days+1):
        result = comparison(store, start+timedelta(days=offset), cutoff)
        daily.append(dict(delivery_date=result['delivery_date'], decision_time=result['decision_time'], metrics=result['metrics']))
        points.extend(result['intervals'])
    return dict(start_date=start, end_date=end, cutoff=cutoff, retrospective=True, metrics=metrics(points), daily=daily)
