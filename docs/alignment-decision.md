# Accepted alignment decision

The user selected hourly averaging after reviewing alternatives. This supersedes the provisional timestamp-matched half-hour approach in data-discovery.md and forecast-semantics.md; those documents retain the research history, not the active calculation contract.

For forecast target t, require actuals at t and t+30 minutes. Their arithmetic mean is the hourly-average actual, in MW. Missing either makes that hour unavailable. Do not impute or duplicate forecasts. Hourly spacing is verified; the forecast's averaging window remains unconfirmed, so the API and UI must disclose this as approximate alignment.

Use error = forecast - hourly actual. Keep MAE/RMSE/bias separate from actual variability. Expose both half-hour actuals and half-range abs(A1-A2)/2. A constant-forecast half-hour diagnostic is sqrt(((F-A1)^2+(F-A2)^2)/2), whose square equals hourly error squared plus half-range squared. This diagnostic does not establish half-hour forecast semantics and must not be labelled official forecast accuracy.

All comparison data is retrospective. This decision changes alignment only; publication cutoffs and no-future-data selection remain strict.
