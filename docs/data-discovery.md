# Elexon data discovery — step 1

Verified 26 October 2026 using the official OpenAPI schema and live historical responses. Scope: decisions 1–31 January 2026, next-day deliveries 2 January–1 February. 09:00 Europe/London is a demonstration default, not a market deadline.

## Sources and requests
Base URL: https://data.elexon.co.uk/bmrs/api/v1
Schema: https://data.elexon.co.uk/swagger/v1/swagger.json
API guidance: https://developer.data.elexon.co.uk/

GET /datasets/WINDFOR/stream?publishDateTimeFrom=2025-12-29T00:00:00Z&publishDateTimeTo=2026-02-01T00:00:00Z
GET /datasets/FUELHH/stream?settlementDateFrom=2026-01-02&settlementDateTo=2026-02-01&fuelType=WIND

WINDFOR filters publication time, not delivery time. Omitted filters return the latest publication: unsuitable for historical decisions. FUELHH allows settlement-date filters OR publication-time filters, not both together. Settlement dates use yyyy-MM-dd. Actual settlement date bounds included both requested dates in the observed response. Treat timestamp windows as half-open locally and deduplicate overlapping downloads rather than relying on untested publication-bound inclusivity.

Stream endpoints return JSON arrays, with no pagination parameters. The developer portal states no data-return limits for streaming endpoints. One complete month request succeeded. An independent 10 January publication-day request returned 584 rows, exactly matching the monthly subset (zero differences). This spot check is not a proof of every historical revision's completeness. No API key required. Documented errors include 400, 429 and 500; ingestion should use bounded timeouts and retry 429/transient server failures.

## Observed snapshot
- WINDFOR: 19,856 rows across 272 publication timestamps, including preceding-December boundary publications.
- FUELHH WIND: 1,488 rows; 48 distinct intervals per day for all 31 delivery days.
- No null generation values; no duplicate forecast (startTime, publishTime) keys; no duplicate actual startTime keys.
- Forecast target timestamps are on the hour. Actual target timestamps are at :00 and :30.
- At 09:00 on each January decision date: 24 eligible next-day forecast targets; each selected day uses one publication timestamp. Other cutoff times must still be evaluated dynamically.
- 31 January decisions have 1 February actuals and eligible forecasts.
- Example: decision 10 January 09:00, target 11 January 14:00 -> latest eligible publication 10 January 07:30, forecast 19,855 MW. The earlier UI mockup values were illustrative only.

## Timestamp and selection contract
Use aware UTC internally and Europe/London in the UI (UTC in January). For every target startTime on the next-day delivery date, select maximum publishTime <= decision instant. Preserve that publication timestamp. Missing eligible points remain null. A missing latest value must not silently fall back to an older value. Exact duplicates may be removed; conflicting duplicates must be flagged and excluded or cause validation failure.

Preserve raw publication data: some forecast records refer to targets earlier than their publication time. They cannot be used before publication. Do not use the latest-view endpoint to reconstruct historical decisions.

## Units and alignment decision
The official FUELHH schema explicitly defines generation as average MW over 30 minutes. The developer portal describes wind forecast MW for a specific point in time; the current dataset schema does not establish a one-hour averaging period. Older interface documents describe forecast periods differently and must not override observed hourly target spacing.

MVP comparison: join each hourly forecast target to the WIND actual with exactly the same startTime, representing the half-hour starting at that target. Do not average both half-hours and pretend the forecast was an hourly mean. Do not interpolate forecasts to invent :30 points. This is a timestamp-matched proxy comparison, not a verified like-for-like instantaneous forecast error or a whole-day energy error. The half-hour average smooths variation; this limitation must appear in the Accuracy view and README. Report 24 expected hourly target comparisons per day and separately disclose the 48 actual intervals available. The 24 off-hour actuals are intentionally outside the comparison, not missing observations.

A true hourly-average forecast interpretation is NOT verified. If later authoritative evidence establishes an hourly period meaning, revise the alignment explicitly and test it. Keep forecast sample mean labelled as mean of available forecast points, not total energy or guaranteed daily average power.

## Accuracy contract
Error = forecast - actual. MAE = mean(abs(error)); RMSE = sqrt(mean(error^2)); bias = mean(error), all MW. Positive bias means overprediction. Use valid matched values only; count missing forecasts, missing actuals, matched points and expected points. Select each delivery day's forecast using the preceding decision date and chosen cutoff independently.

Accuracy is retrospective. Actual publishTime exists, but this snapshot has not proved complete revision history or original real-time availability. Do not label retrospective metrics as information available at a historical decision. No calculated purchase quantity without customer demand and supply commitments. Source geography is Great Britain and the forecast describes wind farms visible to the system operator with operational metering; do not imply complete UK embedded-wind coverage.

## Files
Raw snapshots are stored in data/raw. data-audit.json records per-day counts and 09:00 coverage. metadata.json preserves source request URLs, file timestamps and SHA-256 hashes. The full OpenAPI schema is retained in docs/evidence for reproducibility. Step 2 should add the repeatable Python ingestion and validation pipeline; these downloads are discovery evidence, not that finished pipeline.
