from contextlib import asynccontextmanager
from datetime import date, timedelta
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config, logic, schemas
from .data import Store


def create_app(data_dir: Path | None = None, store: Store | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = store
        if store is None:
            try:
                app.state.store = Store.load(data_dir or config.DATA_DIR)
            except (OSError, ValueError, KeyError, TypeError):
                logging.exception('Cannot load Elexon snapshot')
        yield

    app = FastAPI(title='GridBricks Wind API', version='0.1.0', lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS,
                       allow_credentials=False, allow_methods=['GET'], allow_headers=['*'])

    def data(request: Request) -> Store:
        value = request.app.state.store
        if value is None:
            raise HTTPException(503, 'Data snapshot unavailable or invalid. Run ingestion and restart the API.')
        return value

    @app.exception_handler(ValueError)
    async def invalid_input(request, exc):
        return JSONResponse(status_code=422, content={'detail': str(exc)})

    @app.get('/health')
    def health(request: Request):
        ready = request.app.state.store is not None
        return JSONResponse(status_code=200 if ready else 503,
                            content={'status': 'ok' if ready else 'data_unavailable', 'data_ready': ready})

    @app.get('/api/metadata')
    def metadata(request: Request):
        snapshot = data(request)
        days = [logic.FIRST_DECISION + timedelta(days=i) for i in range(31)]
        coverage = []
        for day in days:
            result = logic.forecast_day(snapshot, day, config.DEFAULT_CUTOFF)
            matched = logic.comparison(snapshot, day+timedelta(days=1), config.DEFAULT_CUTOFF)['metrics']
            coverage.append({'decision_date': day, 'delivery_date': result['delivery_date'],
                             'forecast_points': result['available_points'], 'matched_points': matched['matched_points'], 'expected_points': result['expected_points']})
        return dict(timezone='Europe/London', geography='Great Britain; system-operator-visible wind',
                    units='MW', forecast_spacing_minutes=60, actual_interval_minutes=30,
                    default_cutoff=config.DEFAULT_CUTOFF, cutoff_is_market_deadline=False,
                    decision_dates=days, coverage_at_default_cutoff=coverage,
                    available_decision_dates=[c['decision_date'] for c in coverage if c['forecast_points'] > 0],
                    available_delivery_dates=[c['delivery_date'] for c in coverage if c['matched_points'] > 0],
                    alignment=config.ALIGNMENT, accuracy_is_retrospective=True,
                    forecast_records=snapshot.forecast_count, actual_records=snapshot.actual_count,
                    duplicate_rows_removed=snapshot.duplicates, sources=snapshot.provenance)

    @app.get('/api/decision', response_model=schemas.Decision)
    def decision(request: Request, decision_date: date, cutoff: str = Query(config.DEFAULT_CUTOFF)):
        return logic.forecast_day(data(request), decision_date, cutoff)

    @app.get('/api/comparison', response_model=schemas.Comparison)
    def comparison(request: Request, delivery_date: date, cutoff: str = Query(config.DEFAULT_CUTOFF)):
        return logic.comparison(data(request), delivery_date, cutoff)

    @app.get('/api/accuracy', response_model=schemas.Accuracy)
    def accuracy(request: Request, start_date: date, end_date: date, cutoff: str = Query(config.DEFAULT_CUTOFF)):
        return logic.accuracy(data(request), start_date, end_date, cutoff)

    return app


app = create_app()
