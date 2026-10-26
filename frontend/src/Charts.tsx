import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { clock, number, day } from "./api";
import type { Point, ComparisonPoint, Accuracy } from "./api";

function WindTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ComparisonPoint;
  return (
    <div className="chart-tooltip">
      <strong>{clock(p.start_time)} · Europe/London</strong>
      <dl>
        <div>
          <dt>Forecast</dt>
          <dd>{number(p.forecast_mw)} MW</dd>
        </div>
        {"actual_mw" in p && (
          <>
            <div>
              <dt>Hourly actual</dt>
              <dd>{number(p.actual_mw)} MW</dd>
            </div>
            <div>
              <dt>First / second half</dt>
              <dd>
                {p.actual_half_hours_mw.map((v) => number(v)).join(" / ")} MW
              </dd>
            </div>
            <div>
              <dt>Half-hour half-range</dt>
              <dd>{number(p.within_hour_half_range_mw)} MW</dd>
            </div>
          </>
        )}
      </dl>
      <small>
        Published{" "}
        {p.publish_time
          ? `${day(p.publish_time)}, ${clock(p.publish_time)}`
          : "not available"}
      </small>
    </div>
  );
}
export function WindChart({
  points,
  comparison = false,
}: {
  points: Point[];
  comparison?: boolean;
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={
        comparison
          ? "Hourly forecast and hourly-average actual wind generation. Exact values are in the interval table below."
          : "Hourly wind forecast. Exact values and publication times are in the interval table below."
      }
    >
      <span className="axis-unit">Generation · MW</span>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 32, right: 14, left: 0, bottom: 15 }}
          accessibilityLayer
        >
          <CartesianGrid stroke="#e6ebe7" vertical={false} />
          <XAxis
            dataKey="start_time"
            tickFormatter={clock}
            minTickGap={38}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64736c", fontSize: 11 }}
            dy={12}
          />
          <YAxis
            domain={[0, "auto"]}
            width={54}
            tickFormatter={(v) => number(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64736c", fontSize: 11 }}
          />
          <Tooltip
            content={<WindTooltip />}
            cursor={{ stroke: "#97aaa1", strokeDasharray: "4 4" }}
          />
          {comparison && (
            <Line
              name="Hourly-average actual"
              type="linear"
              dataKey="actual_mw"
              stroke="#55677d"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line
            name="Forecast"
            type="linear"
            dataKey="forecast_mw"
            stroke="#087e72"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <span className="axis-caption">Delivery time · Europe/London</span>
    </div>
  );
}
export function ErrorChart({ daily }: { daily: Accuracy["daily"] }) {
  const values = daily.map((d) => ({
    date: d.delivery_date,
    mae: d.metrics.mae_mw,
  }));
  return (
    <div
      className="error-chart"
      role="img"
      aria-label="Daily mean absolute error in megawatts. The daily metrics table below provides exact values."
    >
      <span className="axis-unit">MAE · MW</span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={values}
          margin={{ top: 28, right: 12, left: 0, bottom: 8 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="#e6ebe7" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => day(v).slice(0, 6)}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tick={{ fontSize: 11, fill: "#64736c" }}
          />
          <YAxis
            width={54}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#64736c" }}
          />
          <Tooltip
            cursor={{ fill: "#eef2ee" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="chart-tooltip">
                  <strong>{day(String(payload[0].payload.date))}</strong>
                  <p>MAE {number(Number(payload[0].value))} MW</p>
                </div>
              ) : null
            }
          />
          <ReferenceLine y={0} stroke="#bdc9c1" />
          <Bar
            dataKey="mae"
            fill="#649589"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
