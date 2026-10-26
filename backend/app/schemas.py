from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel

from .config import ALIGNMENT


class Point(BaseModel):
    start_time: datetime
    forecast_mw: float | None
    publish_time: datetime | None
    publication_age_hours: float | None


class Decision(BaseModel):
    decision_time: datetime
    delivery_date: date
    timezone: str
    expected_points: int
    available_points: int
    missing_points: int
    mean_forecast_mw: float | None
    minimum_forecast_mw: float | None
    minimum_time: datetime | None
    publication_times: list[datetime]
    mixed_publications: bool
    intervals: list[Point]


class ComparisonPoint(Point):
    actual_mw: float | None
    actual_half_hours_mw: list[float | None]
    actual_publish_times: list[datetime | None]
    error_mw: float | None
    within_hour_half_range_mw: float | None
    constant_forecast_half_hour_rmse_mw: float | None


class Metrics(BaseModel):
    expected_points: int
    matched_points: int
    missing_points: int
    missing_forecast_points: int
    missing_actual_hours: int
    missing_actual_half_hours: int
    coverage_percent: float
    mae_mw: float | None
    rmse_mw: float | None
    bias_mw: float | None
    mean_within_hour_half_range_mw: float | None
    variation_hours: int


class Methodology(BaseModel):
    retrospective: Literal[True] = True
    alignment: str = ALIGNMENT
    error_definition: str = 'forecast - actual; positive bias means overprediction'
    variation_note: str = 'Half-range is half the difference between actual half-hours. The constant-forecast diagnostic is not verified half-hour forecast accuracy.'


class Comparison(Methodology):
    delivery_date: date
    decision_time: datetime
    metrics: Metrics
    intervals: list[ComparisonPoint]


class DailyMetrics(BaseModel):
    delivery_date: date
    decision_time: datetime
    metrics: Metrics


class Accuracy(Methodology):
    start_date: date
    end_date: date
    cutoff: str
    metrics: Metrics
    daily: list[DailyMetrics]
