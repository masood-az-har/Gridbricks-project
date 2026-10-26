import { DashboardSkeleton } from "./Skeleton";
import type { SkeletonView } from "./Skeleton";
import { useState, useId, cloneElement, isValidElement } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  RefreshCw,
  Wind,
  Clock3,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { useApi, number, day, clock, stamp, nextDay } from "./api";
import type {
  Decision,
  Comparison,
  Accuracy,
  Metadata,
  Point,
  ComparisonPoint,
} from "./api";
import { WindChart, ErrorChart } from "./Charts";

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement<{ id?: string }>(children)
        ? cloneElement(children, { id })
        : children}
    </div>
  );
}
function State({
  loading,
  error,
  retry,
  skeleton = "decision",
  fullPage = false,
}: {
  skeleton?: SkeletonView;
  fullPage?: boolean;
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  if (loading) return <DashboardSkeleton view={skeleton} fullPage={fullPage} />;
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={24} />
      <h2>We couldn’t load this view</h2>
      <p>{error} Check that the data service is running, then try again.</p>
      <button onClick={retry}>
        <RefreshCw size={15} /> Try again
      </button>
    </div>
  );
}
function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <div>
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <p>{note}</p>
    </div>
  );
}
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Info size={17} />
      <p>{children}</p>
    </div>
  );
}
function DownloadCSV({
  points,
  filename,
}: {
  points: Point[];
  filename: string;
}) {
  function download() {
    const comparison = points.length > 0 && "actual_mw" in points[0];
    const headers = [
      "target_utc",
      "forecast_mw",
      "publication_utc",
      ...(comparison
        ? [
            "hourly_actual_mw",
            "first_half_actual_mw",
            "second_half_actual_mw",
            "error_mw",
          ]
        : []),
    ];
    const rows = points.map((p) => {
      const c = p as ComparisonPoint;
      return [
        p.start_time,
        p.forecast_mw,
        p.publish_time,
        ...(comparison
          ? [c.actual_mw, ...c.actual_half_hours_mw, c.error_mw]
          : []),
      ];
    });
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            value == null ? "" : `"${String(value).replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <button className="quiet-button" onClick={download}>
      <Download size={15} /> Export CSV
    </button>
  );
}
function IntervalTable({
  points,
  comparison = false,
}: {
  points: Point[];
  comparison?: boolean;
}) {
  return (
    <details className="table-details">
      <summary>
        <span>
          {comparison
            ? "Inspect hourly comparisons"
            : "Inspect forecast intervals"}
        </span>
        <span>{points.length} hourly points</span>
      </summary>
      <div
        className="table-scroll"
        tabIndex={0}
        aria-label="Scrollable interval data"
      >
        <table>
          <caption>
            {comparison
              ? "Hourly comparison with both underlying half-hour actuals. All values in MW."
              : "Forecast values and publication times. All times Europe/London."}
          </caption>
          <thead>
            <tr>
              <th>Delivery time</th>
              <th>Forecast · MW</th>
              {comparison && (
                <>
                  <th>Actual mean · MW</th>
                  <th>First / second half · MW</th>
                  <th>Error · MW</th>
                </>
              )}
              <th>Published · London</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => {
              const c = p as ComparisonPoint;
              return (
                <tr key={p.start_time}>
                  <td>{clock(p.start_time)}</td>
                  <td>{number(p.forecast_mw)}</td>
                  {comparison && (
                    <>
                      <td>{number(c.actual_mw, 1)}</td>
                      <td>
                        {c.actual_half_hours_mw
                          .map((v) => number(v))
                          .join(" / ")}
                      </td>
                      <td>{number(c.error_mw, 1)}</td>
                    </>
                  )}
                  <td>{stamp(p.publish_time)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function DecisionView({ defaultCutoff }: { defaultCutoff: string }) {
  const [date, setDate] = useState("2026-01-10"),
    [cutoff, setCutoff] = useState(defaultCutoff),
    [query, setQuery] = useState({ date: "2026-01-10", cutoff: defaultCutoff });
  const request = useApi<Decision>(
    `/api/decision?decision_date=${query.date}&cutoff=${query.cutoff}`,
  );
  const d = request.data;
  const dirty = date !== query.date || cutoff !== query.cutoff;
  function submit(e: FormEvent) {
    e.preventDefault();
    setQuery({ date, cutoff });
  }
  function shift(amount: number) {
    const value = new Date(
      Date.parse(query.date + "T12:00:00Z") + amount * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    setDate(value);
    setQuery({ ...query, date: value });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <h1>
            Tomorrow’s wind.
            <br />
            <span>Known at your cutoff.</span>
          </h1>
          <p>
            Revisit a purchasing decision with only the forecast available then.
          </p>
        </div>
        <div className="scope-note">
          <CalendarDays size={17} />
          <span>
            January 2026 decisions
            <br />
            <strong>Great Britain · National wind</strong>
          </span>
        </div>
      </div>
      <form className="controls" onSubmit={submit}>
        <Field label="Decision date">
          <input
            type="date"
            value={date}
            min="2026-01-01"
            max="2026-01-31"
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Cutoff · Europe/London">
          <input
            type="time"
            value={cutoff}
            required
            onChange={(e) => setCutoff(e.target.value)}
          />
        </Field>
        <ArrowRight size={18} className="control-arrow" />
        <div className="delivery">
          <span>Next-day delivery</span>
          <strong>{date ? day(nextDay(date)) : "Choose a date"}</strong>
        </div>
        <button type="submit" className="primary">
          View forecast <ArrowRight size={16} />
        </button>
      </form>
      <div className="control-caption">
        <span>
          {dirty
            ? "Controls changed. Apply them with “View forecast”."
            : "The cutoff is your scenario assumption, not an official market deadline."}
        </span>
        <span>All times Europe/London</span>
      </div>
      {request.loading || request.error ? (
        <State {...request} />
      ) : (
        d && (
          <>
            <div className="section-line">
              <span>
                <span className="status-dot" />
                Historical decision snapshot
              </span>
              <div className="day-navigation">
                <button
                  aria-label="Previous decision day"
                  onClick={() => shift(-1)}
                  disabled={query.date === "2026-01-01"}
                >
                  <ChevronLeft size={17} />
                </button>
                <strong>{day(d.delivery_date)}</strong>
                <button
                  aria-label="Next decision day"
                  onClick={() => shift(1)}
                  disabled={query.date === "2026-01-31"}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
            <div className="stats">
              <Stat
                label="Mean forecast"
                value={number(d.mean_forecast_mw)}
                unit="MW"
                note="Mean of available hourly forecast points"
              />
              <Stat
                label="Lowest forecast"
                value={number(d.minimum_forecast_mw)}
                unit="MW"
                note={
                  d.minimum_time
                    ? `At ${clock(d.minimum_time)} on the delivery day`
                    : "No eligible forecast points"
                }
              />
              <Stat
                label="Forecast coverage"
                value={`${d.available_points} / ${d.expected_points}`}
                note={
                  d.missing_points
                    ? `${d.missing_points} hourly points unavailable`
                    : "Every delivery-hour target is available"
                }
              />
            </div>
            {d.missing_points > 0 && (
              <Notice>
                {d.available_points === 0
                  ? "No forecast was available for this delivery day at the selected cutoff. Try a later decision time."
                  : `${d.missing_points} target hours have no usable forecast. Gaps are retained; summary values use available points only.`}
              </Notice>
            )}
            <div className="decision-grid">
              <section className="chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Delivery-day forecast</h2>
                    <p>{day(d.delivery_date)} · Hourly forecast points</p>
                  </div>
                  <span className="legend">
                    <i />
                    Forecast
                  </span>
                </div>
                <WindChart points={d.intervals} />
                <div className="chart-bottom">
                  <span>Source: Elexon WINDFOR</span>
                  <DownloadCSV
                    points={d.intervals}
                    filename={`forecast-${d.delivery_date}.csv`}
                  />
                </div>
              </section>
              <aside className="publication">
                <div className="aside-title">
                  <Clock3 size={19} />
                  <h2>The information window</h2>
                </div>
                <p className="aside-intro">
                  What was available before your decision.
                </p>
                <dl>
                  <div>
                    <dt>Decision cutoff</dt>
                    <dd>
                      {day(d.decision_time)}
                      <strong>{clock(d.decision_time)} London</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {d.mixed_publications
                        ? "Selected publications"
                        : "Forecast published"}
                    </dt>
                    <dd>
                      {d.publication_times.length === 1 ? (
                        <>
                          {day(d.publication_times[0])}
                          <strong>
                            {clock(d.publication_times[0])} London
                          </strong>
                        </>
                      ) : d.publication_times.length ? (
                        `${d.publication_times.length} different publication times`
                      ) : (
                        "No eligible publication"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Age at decision</dt>
                    <dd>
                      {d.publication_times.length
                        ? `${number(Math.min(...d.intervals.filter((p) => p.publication_age_hours !== null).map((p) => p.publication_age_hours!)), 1)}${d.mixed_publications ? `–${number(Math.max(...d.intervals.filter((p) => p.publication_age_hours !== null).map((p) => p.publication_age_hours!)), 1)}` : ""} hours`
                        : "Unavailable"}
                    </dd>
                  </div>
                </dl>
                <div className="cutoff-note">
                  <Check size={17} />
                  <p>Only publications at or before the cutoff are eligible.</p>
                </div>
                <p className="small-note">
                  {d.mixed_publications
                    ? "This curve combines publications. Inspect each interval for its source time."
                    : "Each selected point retains its original publication time."}{" "}
                  Actual generation is shown separately in Accuracy.
                </p>
              </aside>
            </div>
            <IntervalTable points={d.intervals} />
          </>
        )
      )}
    </>
  );
}

function AccuracyView({ defaultCutoff }: { defaultCutoff: string }) {
  const [start, setStart] = useState("2026-01-02"),
    [end, setEnd] = useState("2026-02-01"),
    [cutoff, setCutoff] = useState(defaultCutoff);
  const [query, setQuery] = useState({
    start: "2026-01-02",
    end: "2026-02-01",
    cutoff: defaultCutoff,
  });
  const [selected, setSelected] = useState("2026-01-11");
  const request = useApi<Accuracy>(
    `/api/accuracy?start_date=${query.start}&end_date=${query.end}&cutoff=${query.cutoff}`,
  );
  const single = useApi<Comparison>(
    `/api/comparison?delivery_date=${selected}&cutoff=${query.cutoff}`,
  );
  const data = request.data;
  const m = data?.metrics;
  function submit(e: FormEvent) {
    e.preventDefault();
    setQuery({ start, end, cutoff });
    if (selected < start || selected > end) setSelected(start);
  }
  const dirty =
    start !== query.start || end !== query.end || cutoff !== query.cutoff;
  return (
    <>
      <div className="page-title">
        <div>
          <h1>
            How close
            <br />
            <span>was the forecast?</span>
          </h1>
          <p>Evaluate historical decisions against observed wind generation.</p>
        </div>
        <div className="scope-note">
          <Clock3 size={17} />
          <span>
            Retrospective analysis
            <br />
            <strong>Hourly-average comparison</strong>
          </span>
        </div>
      </div>
      <form className="controls accuracy-controls" onSubmit={submit}>
        <Field label="First delivery day">
          <input
            type="date"
            min="2026-01-02"
            max={end || "2026-02-01"}
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Last delivery day">
          <input
            type="date"
            min={start || "2026-01-02"}
            max="2026-02-01"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <Field label="Prior-day cutoff · London">
          <input
            type="time"
            required
            value={cutoff}
            onChange={(e) => setCutoff(e.target.value)}
          />
        </Field>
        <button className="primary">
          Evaluate period <ArrowRight size={16} />
        </button>
      </form>
      <div className="control-caption">
        <span>
          {dirty
            ? "Controls changed. Apply them with “Evaluate period”."
            : "Each delivery day uses its own preceding decision date at the selected cutoff."}
        </span>
        <span>2 Jan – 1 Feb delivery scope</span>
      </div>
      <Notice>
        Approximate alignment: each hourly forecast is compared with the mean of
        two half-hour actuals. The forecast’s averaging period is unconfirmed.
        These results are retrospective.
      </Notice>
      {request.loading || request.error ? (
        <State {...request} skeleton="accuracy" />
      ) : (
        data &&
        m && (
          <>
            <div className="section-line">
              <span>Period results</span>
              <strong>
                {day(query.start)} – {day(query.end)}
              </strong>
            </div>
            <div className="stats accuracy-stats">
              <Stat
                label="Mean absolute error"
                value={number(m.mae_mw)}
                unit="MW"
                note="Average size of the forecast error"
              />
              <Stat
                label="Root mean squared error"
                value={number(m.rmse_mw)}
                unit="MW"
                note="Gives more weight to large errors"
              />
              <Stat
                label="Mean bias"
                value={`${m.bias_mw !== null && m.bias_mw > 0 ? "+" : ""}${number(m.bias_mw)}`}
                unit="MW"
                note="Positive = forecast above actual"
              />
              <Stat
                label="Matched coverage"
                value={`${number(m.matched_points)} / ${number(m.expected_points)}`}
                note={`${number(m.coverage_percent, 1)}% of expected hourly comparisons`}
              />
            </div>
            {m.missing_points > 0 && (
              <Notice>
                {m.matched_points === 0
                  ? "No matched observations are available. Try another period or cutoff."
                  : `${m.missing_points} comparisons unavailable.`}{" "}
                Missing forecasts: {m.missing_forecast_points}; incomplete
                actual hours: {m.missing_actual_hours}. These categories can
                overlap.
              </Notice>
            )}
            <section className="chart-panel comparison-panel">
              <div className="panel-heading">
                <div>
                  <h2>Forecast meets actual</h2>
                  <p>
                    Day-level detail · Cutoff {query.cutoff} on the preceding
                    day
                  </p>
                </div>
                <Field label="Inspect delivery day">
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {data.daily.map((d) => (
                      <option key={d.delivery_date} value={d.delivery_date}>
                        {day(d.delivery_date)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="comparison-legend">
                <span className="legend">
                  <i />
                  Forecast
                </span>
                <span className="legend actual">
                  <i />
                  Hourly-average actual
                </span>
              </div>
              {single.loading || single.error ? (
                <State {...single} skeleton="comparison" />
              ) : (
                single.data && (
                  <>
                    <WindChart points={single.data.intervals} comparison />
                    <div className="chart-bottom">
                      <span>
                        Selected day MAE{" "}
                        <strong>{number(single.data.metrics.mae_mw)} MW</strong>{" "}
                        · {single.data.metrics.matched_points}/
                        {single.data.metrics.expected_points} matched
                      </span>
                      <DownloadCSV
                        points={single.data.intervals}
                        filename={`comparison-${selected}.csv`}
                      />
                    </div>
                    {single.data.metrics.missing_points > 0 && (
                      <Notice>
                        This day has {single.data.metrics.missing_points}{" "}
                        unmatched hours. Missing values remain gaps.
                      </Notice>
                    )}
                    <IntervalTable points={single.data.intervals} comparison />
                  </>
                )
              )}
            </section>
            <div className="accuracy-bottom">
              <section className="chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>The daily picture</h2>
                    <p>Mean absolute error · All matched hours in each day</p>
                  </div>
                </div>
                <ErrorChart daily={data.daily} />
                <details className="table-details">
                  <summary>
                    <span>Inspect daily metrics</span>
                    <span>{data.daily.length} days</span>
                  </summary>
                  <div className="table-scroll" tabIndex={0}>
                    <table>
                      <caption>Daily error metrics in MW</caption>
                      <thead>
                        <tr>
                          <th>Delivery</th>
                          <th>MAE</th>
                          <th>RMSE</th>
                          <th>Bias</th>
                          <th>Matched</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.daily.map((d) => (
                          <tr key={d.delivery_date}>
                            <td>{day(d.delivery_date)}</td>
                            <td>{number(d.metrics.mae_mw)}</td>
                            <td>{number(d.metrics.rmse_mw)}</td>
                            <td>{number(d.metrics.bias_mw)}</td>
                            <td>
                              {d.metrics.matched_points}/
                              {d.metrics.expected_points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
              <aside className="reading-note">
                <Info size={21} />
                <h2>What the average can hide</h2>
                <p>
                  Two very different half-hours can produce the same hourly
                  average.
                </p>
                <dl>
                  <dt>Mean within-hour half-range</dt>
                  <dd>
                    {number(m.mean_within_hour_half_range_mw)} <small>MW</small>
                  </dd>
                </dl>
                <p>
                  Half the difference between the actual half-hours, averaged
                  over {m.variation_hours} complete hours. This measures
                  variation, not forecast error.
                </p>
                <p>
                  Inspect the comparison table or chart tooltip to see both
                  underlying actual values.
                </p>
              </aside>
            </div>
          </>
        )
      )}
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState<"decision" | "accuracy">("decision");
  const metadata = useApi<Metadata>("/api/metadata");
  const source = metadata.data?.sources[0];
  const retrieved = source?.retrieved_at || source?.downloadedFileLastWriteUtc;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to dashboard
      </a>
      <header>
        <a
          className="brand"
          href="#"
          aria-label="GridBricks home"
          onClick={(e) => {
            e.preventDefault();
            setTab("decision");
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <strong>GridBricks</strong>
          <span className="brand-divider" />
          <span className="brand-description">Wind intelligence</span>
        </a>
        <div className="header-source">
          <Wind size={17} />
          <span>Elexon data</span>
          <span className="snapshot-badge">Historical snapshot</span>
        </div>
      </header>
      <div className="nav-shell">
        <nav aria-label="Dashboard views">
          <button
            className={tab === "decision" ? "active" : ""}
            aria-current={tab === "decision" ? "page" : undefined}
            onClick={() => setTab("decision")}
          >
            Decision view
            <ArrowUpRight size={14} />
          </button>
          <button
            className={tab === "accuracy" ? "active" : ""}
            aria-current={tab === "accuracy" ? "page" : undefined}
            onClick={() => setTab("accuracy")}
          >
            Accuracy
            <ArrowUpRight size={14} />
          </button>
        </nav>
        <span className="nav-context">JAN 2026</span>
      </div>
      <main id="main">
        {metadata.loading || metadata.error ? (
          <State {...metadata} skeleton={tab} fullPage />
        ) : tab === "decision" ? (
          <DecisionView
            defaultCutoff={metadata.data?.default_cutoff ?? "09:00"}
          />
        ) : (
          <AccuracyView
            defaultCutoff={metadata.data?.default_cutoff ?? "09:00"}
          />
        )}
        <footer>
          <div>
            <strong>GridBricks</strong>
            <span>Built on Elexon WINDFOR & FUELHH.</span>
            {retrieved && (
              <span>Snapshot retrieved {stamp(retrieved)} London</span>
            )}
          </div>
          <p>
            Wind forecasts inform planning. Purchase quantities also require
            demand and existing supply commitments.
          </p>
        </footer>
        <details className="methodology">
          <summary>Data & methodology</summary>
          <p>
            Forecasts cover system-operator-visible wind in Great Britain.
            Decision forecasts use the latest eligible publication for each
            target, never a publication after the selected cutoff. Missing
            values remain unavailable.
          </p>
          <p>
            Accuracy compares hourly forecast points with the mean of both
            corresponding half-hour actuals. Both actuals are required. The
            forecast averaging window is unconfirmed; this is an approximation.
            Error = forecast − actual. Period metrics weight matched hours
            equally. Retrospective results are not claimed to have been
            available at a historical decision.
          </p>
          <a
            href="https://developer.data.elexon.co.uk/"
            target="_blank"
            rel="noreferrer"
          >
            Elexon API documentation <ArrowUpRight size={13} />
          </a>
        </details>
      </main>
    </>
  );
}
