# GridBricks

## Platform
Web. React + TypeScript + Vite frontend, Python FastAPI backend.

## Users and purpose
UK energy utility day-ahead purchasing team. Inspect wind forecasts available at a historical decision and evaluate retrospective errors. Decisions are restricted to January 2026; next-day deliveries cover 2 January–1 February.

## Constraints
Six-hour total build budget. Elexon WINDFOR and FUELHH WIND only. Strict publication cutoff. No fabricated fallback data. No purchase quantities without demand and supply commitments. Hourly actuals are the average of both half-hours, with missing halves invalidating the hour. Forecast averaging window remains unconfirmed and must be disclosed. Accuracy is retrospective. Europe/London display, UTC storage.

## Confirmed direction
Continue the light analytical sample already discussed: teal forecasts, clear controls, two views, visible publication and coverage information. User requests an aesthetic, restrained interface without generic AI decoration. No need for a new visual concept round. All business facts derive from the challenge and existing backend.
