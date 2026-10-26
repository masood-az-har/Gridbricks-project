# WINDFOR measurement-period verification

Research date: 26 October 2026.

## Findings
1. The Elexon OpenAPI schema downloaded during discovery gives WINDFOR startTime and publishTime as date-times and generation as a nullable integer. It provides no interval duration or averaging definition. FUELHH explicitly provides average MW over 30 minutes.
   https://data.elexon.co.uk/swagger/v1/swagger.json
2. Elexon's developer portal describes the wind/latest view as forecast MW for a specific point in time. This suggests timestamp-specific forecasts but is not a precise definition of the averaging window or an explicit instantaneous measurement contract.
   https://developer.data.elexon.co.uk/
3. National Grid's BMRA & SAA Interface Specification, Issue 16, dated 25 July 2011, section 14 (printed page 13, PDF page 19), explicitly specifies hourly wind forecast resolution. Section 20's WINDFOR field table uses Time of Forecast and MW. The document does not explicitly say these values are one-hour averages. It is historical supporting evidence, not proof of the complete January 2026 contract.
   https://www.neso.energy/document/34076/download
4. Elexon's NETA IDD Part 1 version 57 describes WINDFOR in terms of selected half-hour periods and peak generation, with settlement period fields. That wording is insufficient to prove modern hourly-average semantics and differs from the observed API shape. Do not silently reconcile those differences by inventing an averaging period.
   https://bscdocs.elexon.co.uk/bsc-module/interface-definition-documents/neta-interface-definition-and-design-document-part-1-interfaces-with-bsc-parties-and-their-agents/v-57-0/id-67b34bd747c7f13fbb2970f5

## Conclusion
Hourly timestamp spacing is confirmed by the January snapshot and supported by the historical upstream specification. A one-hour average, a half-hour average, and strictly instantaneous semantics are not conclusively established for January 2026 by the reviewed sources. Do not state that an hourly forecast necessarily represents a whole-hour average. Do not claim the timestamp-matched half-hour comparison is exact either.

Proceed with the documented MVP timestamp-matched half-hour proxy, visibly labelled approximate, unless stronger provider evidence becomes available. The forecast at 10:00 is compared with FUELHH startTime 10:00 (the 10:00–10:30 average); this is a reproducible engineering assumption, not an Elexon-endorsed method. No selecting the alignment that produces the lowest error. No fabricated :30 forecasts. Retain the original source values so the alignment can be changed independently.

## Provider clarification draft — NOT SENT
Subject: WINDFOR startTime and generation averaging period (January 2026)

For /bmrs/api/v1/datasets/WINDFOR/stream, January 2026 records have hourly startTime values. Does generation for startTime 10:00Z represent instantaneous/point power at 10:00Z, average power over 10:00–10:30Z, average power over 10:00–11:00Z, or another statistic/period? Are the labelled times period starts or ends? What is the recommended temporal alignment with FUELHH half-hour mean MW for forecast accuracy evaluation?

Example: publishTime 2026-01-10T07:30:00Z, startTime 2026-01-11T14:00:00Z, generation 19855 MW. Please confirm the statistic and exact delivery interval represented by that value.

The public developer portal names insightssupport@elexon.co.uk for service questions. No email or other external message has been sent.
