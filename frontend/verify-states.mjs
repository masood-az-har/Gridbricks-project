import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(10000);
const fixture = await fetch(
  `${process.env.APP_BASE_URL || "http://127.0.0.1:5173"}/api/decision?decision_date=2026-01-10`,
).then((r) => r.json());
const empty = {
  ...fixture,
  available_points: 0,
  missing_points: 24,
  mean_forecast_mw: null,
  minimum_forecast_mw: null,
  minimum_time: null,
  publication_times: [],
  intervals: fixture.intervals.map((p) => ({
    ...p,
    forecast_mw: null,
    publish_time: null,
    publication_age_hours: null,
  })),
};
await page.route("**/api/decision?**", (r) => r.fulfill({ json: empty }));
await page.goto((process.env.APP_BASE_URL || "http://127.0.0.1:5173"));
await page
  .getByText("No forecast was available for this delivery day", {
    exact: false,
  })
  .waitFor();
if (
  await page
    .locator(".stat")
    .filter({ hasText: "Forecast coverage" })
    .innerText()
    .then((t) => !t.includes("0 / 24"))
)
  throw Error("Empty coverage incorrect");
await page.unroute("**/api/decision?**");
const partial = {
  ...fixture,
  available_points: 23,
  missing_points: 1,
  intervals: fixture.intervals.map((p, i) =>
    i === 0 ? { ...p, forecast_mw: null } : p,
  ),
};
await page.route("**/api/decision?**", (r) => r.fulfill({ json: partial }));
await page.getByLabel("Decision date", { exact: true }).fill("2026-01-12");
await page.getByRole("button", { name: "View forecast" }).click();
await page
  .getByText("1 target hours have no usable forecast.", { exact: false })
  .waitFor();
await page.getByText("Inspect forecast intervals", { exact: true }).click();
if (
  !(await page
    .locator("tbody tr")
    .first()
    .innerText()
    .then((t) => t.includes("—")))
)
  throw Error("Null not displayed as missing");
console.log(
  "PASS: isolated empty and partial-data response handling; no fabricated fallback values.",
);
await browser.close();

