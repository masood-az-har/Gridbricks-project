import { chromium } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("../.impeccable/review", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(10000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto((process.env.APP_BASE_URL || "http://127.0.0.1:5173"));
await page
  .getByRole("heading", { name: "Delivery-day forecast", exact: true })
  .waitFor();
await page.evaluate(() => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
  window.scrollTo(0, 0);
});
await page.screenshot({
  path: "../.impeccable/review/desktop.png",
  fullPage: true,
});
await page.getByLabel("Decision date", { exact: true }).fill("2026-01-31");
await page.getByRole("button", { name: "View forecast" }).click();
await page.getByText("01 Feb 2026", { exact: true }).first().waitFor();

await page
  .getByRole("heading", { name: "Delivery-day forecast", exact: true })
  .waitFor();
if (
  !(await page.getByRole("button", { name: "Next decision day" }).isDisabled())
)
  throw Error("Boundary navigation not disabled");
await page.getByText("Inspect forecast intervals", { exact: true }).click();
if ((await page.locator("tbody tr").count()) !== 24)
  throw Error("Expected 24 intervals");
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Export CSV" }).click();
const download = await downloadPromise;
if (!download.suggestedFilename().includes("2026-02-01"))
  throw Error("Wrong export date");
await page.getByRole("button", { name: "Accuracy", exact: true }).click();
await page.getByRole("heading", { name: "Forecast meets actual" }).waitFor();
await page.getByText("Selected day MAE", { exact: false }).waitFor();
await page.evaluate(() => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
  window.scrollTo(0, 0);
});
await page.screenshot({
  path: "../.impeccable/review/accuracy-desktop.png",
  fullPage: true,
});
await page
  .getByLabel("Inspect delivery day", { exact: true })
  .selectOption("2026-02-01");
await page.getByText("Inspect hourly comparisons", { exact: true }).waitFor();
await page.getByText("Inspect hourly comparisons", { exact: true }).click();
if ((await page.locator(".comparison-panel tbody tr").count()) !== 24)
  throw Error("Missing comparison points");
await page.setViewportSize({ width: 390, height: 844 });
await page.getByText("Inspect hourly comparisons", { exact: true }).click();
await page.evaluate(() => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
  window.scrollTo(0, 0);
});
await page.screenshot({
  path: "../.impeccable/review/accuracy-mobile.png",
  fullPage: true,
});
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw Error("Accuracy mobile horizontal overflow");
await page.getByRole("button", { name: "Decision view", exact: true }).click();
await page
  .getByRole("heading", { name: "Delivery-day forecast", exact: true })
  .waitFor();
await page.evaluate(() => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
  window.scrollTo(0, 0);
});
await page.screenshot({
  path: "../.impeccable/review/mobile.png",
  fullPage: true,
});
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw Error("Decision mobile horizontal overflow");
await page.route("**/api/decision?**", (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ detail: "Test service outage" }),
  }),
);
await page.getByLabel("Decision date", { exact: true }).fill("2026-01-12");
await page.getByRole("button", { name: "View forecast" }).click();
await page
  .getByRole("heading", { name: "We couldn’t load this view" })
  .waitFor();
await page.unroute("**/api/decision?**");
await page.getByRole("button", { name: "Try again" }).click();
await page
  .getByRole("heading", { name: "Delivery-day forecast", exact: true })
  .waitFor();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "PASS: desktop/mobile views, boundary navigation, tables, CSV, day selection, error/retry, no horizontal overflow or runtime errors.",
);
await browser.close();

