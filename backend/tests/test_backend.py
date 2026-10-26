import json
import math
from datetime import date, timedelta
from pathlib import Path
from urllib.error import HTTPError

import pytest
from fastapi.testclient import TestClient

from backend.app.data import DataError, Record, Store, instant, validate
from backend.app.logic import accuracy, comparison, decision_instant, forecast_day, metrics
from backend.app.main import create_app
from scripts import ingest

TARGET = instant('2026-01-11T10:00:00Z')
PUB = instant('2026-01-10T08:00:00Z')


def record(value, start=TARGET, published=PUB):
    return Record(start, published, value)


def store(forecast=8000, first=4000, second=12000):
    return Store([record(forecast)], [record(first), record(second, TARGET+timedelta(minutes=30))])


def point(result):
    return next(p for p in result['intervals'] if p['start_time'] == TARGET)


def test_latest_eligible_inclusive_and_no_future_leakage():
    snapshot = Store([record(1), record(2, published=instant('2026-01-10T09:00:00Z')),
                      record(999, published=instant('2026-01-10T09:00:01Z'))], [])
    result = forecast_day(snapshot, date(2026,1,10), '09:00')
    assert point(result)['forecast_mw'] == 2
    assert result['available_points'] == 1
    assert result['missing_points'] == 23
    assert point(forecast_day(snapshot, date(2026,1,10), '07:59'))['forecast_mw'] is None


def test_latest_null_is_not_replaced_by_older_forecast():
    snapshot = Store([record(8000), record(None, published=PUB+timedelta(minutes=30))], [])
    selected = point(forecast_day(snapshot, date(2026,1,10), '09:00'))
    assert selected['forecast_mw'] is None
    assert selected['publish_time'] == PUB+timedelta(minutes=30)


def test_average_and_cancellation_diagnostic():
    result = comparison(store(), date(2026,1,11), '09:00')
    selected = point(result)
    assert selected['actual_mw'] == 8000
    assert selected['error_mw'] == 0
    assert selected['within_hour_half_range_mw'] == 4000
    assert selected['constant_forecast_half_hour_rmse_mw'] == 4000
    assert result['metrics']['matched_points'] == 1
    assert result['metrics']['missing_points'] == 23


@pytest.mark.parametrize('first,second', [(None,12000),(4000,None),(None,None)])
def test_missing_half_hour_never_becomes_complete_hour(first,second):
    selected = point(comparison(store(first=first,second=second), date(2026,1,11), '09:00'))
    assert selected['actual_mw'] is None
    assert selected['error_mw'] is None


def test_zero_is_valid_and_latest_actual_revision_is_used():
    snapshot = store(first=0,second=0)
    assert point(comparison(snapshot,date(2026,1,11),'09:00'))['actual_mw'] == 0
    snapshot = Store([record(100)], [record(50), record(None,published=PUB+timedelta(days=2)), record(150,TARGET+timedelta(minutes=30))])
    assert point(comparison(snapshot,date(2026,1,11),'09:00'))['actual_mw'] is None


def test_hand_calculated_metrics():
    points = [dict(error_mw=e,forecast_mw=10,actual_mw=10-e,actual_half_hours_mw=[10-e]*2,within_hour_half_range_mw=0) for e in [3,-4]]
    result = metrics(points)
    assert result['mae_mw'] == 3.5
    assert result['rmse_mw'] == math.sqrt(12.5)
    assert result['bias_mw'] == -0.5
    assert metrics([])['mae_mw'] is None


def test_boundaries_timezone_and_mixed_publications():
    result = forecast_day(Store([],[]),date(2026,1,31),'23:59')
    assert result['delivery_date'] == date(2026,2,1)
    assert len(result['intervals']) == 24
    assert decision_instant(date(2026,1,10),'09:00') == instant('2026-01-10T14:30:00+05:30')
    snapshot = Store([record(1),record(2,TARGET+timedelta(hours=1),PUB-timedelta(hours=1))],[])
    assert forecast_day(snapshot,date(2026,1,10),'09:00')['mixed_publications']
    with pytest.raises(ValueError):
        forecast_day(snapshot,date(2026,2,1),'09:00')
    with pytest.raises(DataError):
        instant('2026-01-10T09:00:00')


def test_each_delivery_uses_its_preceding_decision_cutoff():
    second_target = TARGET+timedelta(days=1)
    snapshot = Store([record(1),record(999,published=PUB+timedelta(days=1)),
                      record(2,second_target,PUB+timedelta(days=1)),record(999,second_target,PUB+timedelta(days=2))],
                     [record(0),record(0,TARGET+timedelta(minutes=30)),record(0,second_target),record(0,second_target+timedelta(minutes=30))])
    result = accuracy(snapshot,date(2026,1,11),date(2026,1,12),'09:00')
    assert [day['metrics']['bias_mw'] for day in result['daily']] == [1,2]
    assert result['metrics']['mae_mw'] == 1.5


def test_duplicate_validation():
    row = dict(dataset='WINDFOR',startTime=TARGET.isoformat(),publishTime=PUB.isoformat(),generation=10)
    records, duplicates = validate([row,row],'WINDFOR')
    assert len(records) == 1 and duplicates == 1
    with pytest.raises(DataError,match='conflicting duplicate'):
        validate([row,dict(row,generation=20)],'WINDFOR')
    with pytest.raises(DataError):
        validate([dict(row,generation=float('nan'))],'WINDFOR')
    with pytest.raises(DataError):
        validate([dict(row,startTime='2026-01-11T10:30:00Z')],'WINDFOR')


def test_api_contract_and_invalid_input():
    with TestClient(create_app(store=store())) as client:
        assert client.get('/health').status_code == 200
        decision = client.get('/api/decision',params={'decision_date':'2026-01-10'}).json()
        assert 'actual_mw' not in decision['intervals'][0]
        result = client.get('/api/comparison',params={'delivery_date':'2026-01-11'})
        assert result.status_code == 200
        assert result.json()['retrospective'] is True
        assert 'unconfirmed' in result.json()['alignment']
        for params in [{'decision_date':'2026-02-01'},{'decision_date':'bad'},{'decision_date':'2026-01-10','cutoff':'25:00'},{'decision_date':'2026-01-10','cutoff':'9:00'}]:
            assert client.get('/api/decision',params=params).status_code == 422
        assert client.get('/api/accuracy',params={'start_date':'2026-01-12','end_date':'2026-01-11'}).status_code == 422
        assert client.get('/api/metadata').json()['default_cutoff'] == '09:00'


def test_missing_snapshot_returns_503(tmp_path):
    with TestClient(create_app(data_dir=tmp_path)) as client:
        assert client.get('/health').status_code == 503
        assert client.get('/api/decision',params={'decision_date':'2026-01-10'}).status_code == 503


def test_ingestion_atomic_pointer_and_failure_preserves_snapshot(tmp_path, monkeypatch):
    forecast = [dict(dataset='WINDFOR',startTime=TARGET.isoformat(),publishTime=PUB.isoformat(),generation=8000)]
    actuals = [dict(dataset='FUELHH',fuelType='WIND',startTime=TARGET.isoformat(),publishTime=PUB.isoformat(),generation=8000,settlementDate='2026-01-11',settlementPeriod=21)]
    monkeypatch.setattr(ingest,'fetch',lambda url,timeout: json.dumps(forecast if 'WINDFOR' in url else actuals).encode())
    ingest.ingest(tmp_path,10)
    previous = (tmp_path/'current.json').read_bytes()
    assert Store.load(tmp_path).forecast_count == 1
    monkeypatch.setattr(ingest,'fetch',lambda url,timeout: b'[]')
    with pytest.raises(ValueError):
        ingest.ingest(tmp_path,10)
    assert (tmp_path/'current.json').read_bytes() == previous
    name = json.loads(previous)['snapshot']
    (tmp_path/name/'windfor.json').write_text('[]')
    with pytest.raises(DataError,match='checksum'):
        Store.load(tmp_path)


def test_retry_transient_only(monkeypatch):
    calls=[]
    class Response:
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def read(self): return b'[]'
    def transient(*args,**kwargs):
        calls.append(1)
        if len(calls)<3:
            raise HTTPError('https://example.test',503,'unavailable',{},None)
        return Response()
    monkeypatch.setattr(ingest,'urlopen',transient)
    monkeypatch.setattr(ingest.time,'sleep',lambda _:None)
    assert ingest.fetch('https://example.test',1) == b'[]'
    assert len(calls) == 3


def test_real_january_snapshot():
    snapshot = Store.load(Path(__file__).resolve().parents[2]/'data'/'raw')
    result = accuracy(snapshot,date(2026,1,2),date(2026,2,1),'09:00')
    assert len(result['daily']) == 31
    assert result['metrics']['matched_points'] == 744
    assert result['metrics']['missing_points'] == 0
    assert result['metrics']['missing_actual_half_hours'] == 0
