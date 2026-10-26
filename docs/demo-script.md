# Demo script and recording plan

Target duration: 8 minutes 40 seconds. Record one video with two clearly announced parts; keep each under five minutes. Use an anonymous browser window, close unrelated tabs and notifications, and avoid exposing account menus or credentials. Read naturally rather than word-for-word if preferred.

## Part 1 - Customer pilot overview (0:00-4:20)

### 0:00-0:40 - Purpose
Screen: Decision view, January 10 at 09:00 London.

This pilot helps your day-ahead purchasing team see the wind forecast that was actually available when a decision was made, then measure its historical accuracy. It uses national wind data from Elexon. It supports a purchasing decision; it does not calculate a purchase volume because customer demand and existing supply commitments are not included.

### 0:40-1:40 - Historical decision
Action: Set decision date to January 10, 2026, cutoff 09:00, then View forecast.

We are reconstructing the decision for delivery on January 11. For every target hour, the application chooses the latest forecast published at or before the cutoff. A newer forecast published after the decision is excluded. Nine o'clock is a demonstration scenario, not a claimed market deadline. The chart shows megawatts, with London time on the horizontal axis. Mean forecast, minimum forecast, its time, and coverage summarize the day.

Action: Hover a chart point, show the publication panel, and expand Inspect forecast intervals. Read the visible publication time; do not invent one.

### 1:40-2:20 - Boundary and traceability
Action: Choose January 31, show February 1 delivery, then export CSV.

January is the decision window, so the final delivery day falls on February 1. Every selected hour retains its publication time. Missing data stays missing, and CSV export makes the displayed values reviewable.

### 2:20-3:30 - Accuracy and findings
Action: Accuracy tab; January 2-February 1, cutoff 09:00, Evaluate period.

This view is retrospective. Each delivery day is evaluated using forecasts eligible at its own previous-day cutoff. Across this stored period there are 744 matched hours. The approximate MAE is 2,039 megawatts, RMSE 2,505 megawatts, and positive bias 1,748 megawatts. Positive bias means overprediction of wind in this sample. That can matter when planning additional supply, but this sample is not a calibrated reserve recommendation or a guarantee of future performance.

Action: Show selected-day comparison, daily errors, and the half-hour details.

### 3:30-4:20 - Essential limitation and value

The actual data arrives in half-hour intervals, while the observed forecasts have hourly timestamps. We average the two actual halves for each target hour. The forecast averaging window is not conclusively established, so the app clearly labels this an approximation and retains both actual halves for inspection. Averages can hide within-hour variation. The value of the pilot is a traceable forecast decision and quantified error, with these limitations made explicit.

## Part 2 - Technical review (4:20-8:40)

### 4:20-5:15 - Architecture
Screen: repository README directory guide.

React and TypeScript provide the two dashboard views. FastAPI serves typed endpoints for metadata, decisions, comparisons, accuracy and health. Elexon data is fetched by a separate ingestion script, validated, and stored as versioned JSON snapshots. Requests do not download the historical dataset. Vercel serves the frontend and Python API together; Docker Compose provides a reproducible local deployment.

### 5:15-6:10 - Selection and correctness
Screen: backend/app/logic.py, then backend/tests/test_backend.py.

The key rule is latest publication less than or equal to the decision timestamp for each target. UTC is used internally and London time in the interface. Tests cover cutoff equality, future-publication exclusion, missing values, duplicate conflicts, boundaries and metric examples. Metrics use valid matched hours; period calculations weight observations rather than averaging daily metrics.

### 6:10-7:00 - Data integrity and approximation
Screen: backend/app/data.py and docs/alignment-decision.md.

The loader validates timestamps, values and snapshot checksums. Exact duplicates are removed, conflicting records fail validation, and a failed ingestion cannot replace the active snapshot pointer. Both half-hour actuals are required for a valid hourly mean. The signed error is forecast minus actual. Actual revisions are retrospective, not assumed to have been available at the historical decision time. The current validator deliberately targets the winter challenge period; broader daylight-saving support is future work.

### 7:00-7:50 - UX and failure handling
Screen: frontend/src/api.ts, then frontend/src/Skeleton.tsx.

Requests have timeouts and cancellation to avoid stale results. Errors offer retry; partial and empty data are explicit. Loading skeletons mirror the existing view and support reduced-motion preferences. Keyboard-labelled controls, mobile layout, tables and CSV make the data accessible. Browser checks cover normal and failure paths without introducing fixture data into production.

### 7:50-8:40 - Run, deploy and disclosure
Screen: README Docker commands, live app, then AI disclosure.

Docker Compose builds and starts both services; the README also documents local Python and Node setup. GitHub is connected to Vercel. Sixteen backend tests and the public browser checks pass. The remaining optimization is reducing the chart bundle. OpenAI Codex assisted with research, implementation, documentation and testing; this is explicitly disclosed. I can explain the selection rule, approximation and code rather than treating generated output as proof of correctness.

## Before submitting

- Record both parts and check duration and readable text.
- Upload to YouTube as Unlisted; verify audio and playback without signing in.
- Resolve the anonymous repository name requirement.
- Open repository, deployed app and video links in an incognito window.
- Enter only verified links in the challenge form. Do not submit without the video.
