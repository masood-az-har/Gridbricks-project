import { useEffect, useState } from "react";
export type Point = {
  start_time: string;
  forecast_mw: number | null;
  publish_time: string | null;
  publication_age_hours: number | null;
};
export type Decision = {
  decision_time: string;
  delivery_date: string;
  expected_points: number;
  available_points: number;
  missing_points: number;
  mean_forecast_mw: number | null;
  minimum_forecast_mw: number | null;
  minimum_time: string | null;
  publication_times: string[];
  mixed_publications: boolean;
  intervals: Point[];
};
export type Metrics = {
  expected_points: number;
  matched_points: number;
  missing_points: number;
  missing_forecast_points: number;
  missing_actual_hours: number;
  missing_actual_half_hours: number;
  coverage_percent: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  mean_within_hour_half_range_mw: number | null;
  variation_hours: number;
};
export type ComparisonPoint = Point & {
  actual_mw: number | null;
  actual_half_hours_mw: (number | null)[];
  actual_publish_times: (string | null)[];
  error_mw: number | null;
  within_hour_half_range_mw: number | null;
  constant_forecast_half_hour_rmse_mw: number | null;
};
export type Comparison = {
  delivery_date: string;
  decision_time: string;
  metrics: Metrics;
  intervals: ComparisonPoint[];
  alignment: string;
};
export type Accuracy = {
  start_date: string;
  end_date: string;
  metrics: Metrics;
  daily: { delivery_date: string; decision_time: string; metrics: Metrics }[];
};
export type Metadata = {
  default_cutoff: string;
  forecast_records: number;
  actual_records: number;
  sources: {
    file: string;
    retrieved_at?: string;
    downloadedFileLastWriteUtc?: string;
    sourceUrl: string;
  }[];
};
const base =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_API_BASE_URL ?? "";
export function useApi<T>(path: string) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    setState({ data: null, loading: true, error: null });
    fetch(base + path, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          let detail = "";
          try {
            const body = await response.json();
            detail = typeof body.detail === "string" ? body.detail : "";
          } catch {}
          throw new Error(
            detail || `The data service returned ${response.status}.`,
          );
        }
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted || timedOut)
          setState({
            data: null,
            loading: false,
            error: timedOut
              ? "The data service took too long to respond."
              : error instanceof Error
                ? error.message
                : "Unable to load data.",
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, revision]);
  return { ...state, retry: () => setRevision((r) => r + 1) };
}
export const number = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(
        value,
      );
export const clock = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
export const day = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value));
export const stamp = (value: string | null) =>
  value ? `${day(value)}, ${clock(value)}` : "Unavailable";
export const nextDay = (value: string) =>
  new Date(Date.parse(value + "T12:00:00Z") + 86400000)
    .toISOString()
    .slice(0, 10);
