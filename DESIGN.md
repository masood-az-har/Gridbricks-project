---
name: GridBricks
description: A restrained analytical workspace for historical wind decisions.
colors:
  ink: "#20382e"
  muted: "#617269"
  canvas: "#f6f7f4"
  surface: "#fff"
  line: "#dce3dd"
  teal: "#087e72"
  actual: "#55677d"
  wash: "#edf2ed"
  publication: "#eaf0e8"
  primary: "#174c3d"
  primary-hover: "#0b6450"
  control-border: "#cbd6ce"
  control-hover: "#edf3ee"
  control-active: "#dce9df"
  focus: "#138d7b"
  warning-surface: "#f4efdf"
  warning-ink: "#6c5a2e"
  badge-surface: "#eff3ee"
  badge-ink: "#506659"
typography:
  headline:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "37px"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-1.2px"
  title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "16px"
    fontWeight: 750
    letterSpacing: "-0.25px"
  body:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 450
  label:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "11px"
    fontWeight: 650
  metric:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "30px"
    fontWeight: 650
    letterSpacing: "-0.8px"
rounded:
  badge: "4px"
  field: "5px"
  control: "6px"
  panel: "8px"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  large: "24px"
  section: "30px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "#365d49"
    padding: "5px 0"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "#284537"
    rounded: "{rounded.field}"
    height: "42px"
    padding: "0 12px"
  navigation:
    backgroundColor: "transparent"
    textColor: "#68766e"
    height: "59px"
    rounded: "0"
  snapshot-badge:
    backgroundColor: "{colors.badge-surface}"
    textColor: "{colors.badge-ink}"
    rounded: "{rounded.badge}"
    padding: "6px 9px"
  chart-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  publication:
    backgroundColor: "{colors.publication}"
    rounded: "{rounded.panel}"
    padding: "24px 23px"
---

# Design System: GridBricks

## Overview

**Creative North Star: "The energy analyst's workspace"**

A quiet, light analytical interface with warm paper surroundings, white chart surfaces and a pale sage publication inspector. The agreed teal and sage direction keeps the working data, controls and provenance legible without ornamental decoration.

Compact annotations and tabular numbers support careful comparison. Hairlines and tonal surfaces establish hierarchy; restrained controls keep attention on the selected scenario and its evidence.

**Key Characteristics:**

- Light teal and sage analytical palette.
- Compact labels with prominent tabular metrics.
- Flat panels, hairline dividers and restrained controls.
- Visible provenance, coverage and uncertainty.

## Colors

Muted green neutrals support a consistent teal forecast signal.

### Primary

- **Forecast teal:** forecast lines, links, selected navigation and the brand mark.
- **Deep green action:** primary submission buttons, with a brighter green hover state.

### Secondary

- **Actual slate:** actual generation, paired with a dashed stroke to distinguish it from forecasts.
- **Warning parchment and brown:** caveats and incomplete-data notices.

### Neutral

- **Warm paper:** page canvas around white chart surfaces.
- **Dark green ink:** primary text; **muted green:** captions, units and annotations.
- **Pale sage:** control wash and publication inspector.
- **Soft green hairlines:** panel borders and dividers.

**The Evidence Rule.** Supplement series color with line pattern and labels; retain missing observations as visible gaps.

## Typography

Manrope Variable is bundled locally, with a sans-serif fallback. Its compact labels and tabular metric numerals carry the analytical character.

- **Headline:** page heading; its secondary line uses lighter weight (500). Mobile headings reduce to 30px with -0.8px tracking.
- **Title:** panel headings; the publication inspector uses 14px.
- **Body:** base text role; explanatory page copy uses 13px and 1.7 line height.
- **Label:** compact field labels. Dense annotations span 9–12px according to component and viewport.
- **Metric:** tabular numerals. Decision metrics reduce to 23px on mobile; accuracy metrics use 27px desktop, 24px at the intermediate breakpoint and 25px in the mobile two-column grid.

## Layout

The main content is centered with a 1440px maximum width, 4% horizontal insets and 40px top padding. The desktop header is 84px high; navigation is 59px high. Controls sit in a single wash-backed row above results.

The decision chart and lower accuracy section use a flexible main column plus a 278px inspector, separated by 24px. At 1050px and below the inspector becomes 245px and the gap becomes 18px. At 760px and below these sections become a single column; main horizontal insets become 22px, controls become a two-column grid and accuracy statistics become two columns. The mobile header and navigation heights are 70px and 54px. Above 1500px, header and navigation insets track the centered content.

Chart panels have approximately 24px internal heading and footer padding. Expandable tables scroll within their own region, capped at 420px high. Decision charts are 310px high on desktop and 275px on mobile; comparison charts are 325px and 280px respectively.

## Elevation & Depth

The interface is flat by default. White, paper and sage surfaces plus thin borders supply separation. The chart tooltip alone has a soft shadow (`0 6px 20px #20382e12`) to distinguish transient information above a chart. There are no decorative gradients.

## Shapes

Panels use softly curved corners; fields are slightly tighter than buttons. Snapshot badges have the smallest recurring corner radius. Navigation stays square and gains a thin bottom indicator for the selected view. Borders are generally one pixel; chart and table containers clip or scroll content locally.

## Components

### Buttons

Primary buttons are compact green submission controls with white labels and a 42px height. Secondary buttons are white with a soft green border; hover adds a pale wash, active adds a deeper wash and disabled controls reduce opacity to 0.4. Quiet CSV actions remove the border and background, becoming teal on hover.

Interactive controls use a visible 3px teal focus outline with a 4px offset. Button background and border transitions last 0.16 seconds.

### Inputs / Fields

Native date, time and select controls use white surfaces, fine green borders, compact padding and explicit labels. Fields are 42px high. Edited values are accompanied by pending-change copy until form submission commits the scenario.

### Navigation

Two labeled view buttons sit on a white strip. The active view has teal text, weight 750, an arrow and a 3px underline. The inactive arrow is hidden. Keyboard focus uses the shared outline. Mobile navigation retains the same two-view structure.

### Chips

The historical snapshot badge is a small passive label with a pale background. It communicates snapshot context rather than a fictional live status.

### Cards / Containers

Chart panels use white surfaces and hairline borders. The publication inspector uses sage without a decorative shadow. Statistics are separated by vertical dividers rather than placed into individual cards.

### Charts and tables

Forecasts use solid teal strokes; actuals use dashed slate strokes and explicit legends. Expandable, keyboard-accessible tables provide chart data alternatives. Sticky table headers and tabular numbers support inspection; hover lightly washes rows. CSV actions export the displayed underlying results.

### Feedback and motion

Loading surfaces breathe between two pale fills with a 1.4-second ease-in-out alternating animation. Reduced-motion preference disables animations and transitions. Errors provide a retry button, while caveats and coverage gaps use the parchment notice. New requests clear previous results so stale data cannot appear to match a newly submitted scenario.

## Do's and Don'ts

### Do:

- Do preserve the light teal and sage analytical direction.
- Do keep labels, focus outlines and numerical units visible.
- Do pair chart colors with labels and line patterns.
- Do expose provenance, coverage and uncertainty alongside results.
- Do keep wide tables inside a scrollable region.

### Don't:

- Don't add decorative shadows, gradients or ornamental card mosaics.
- Don't invent live-status signals or fabricate observations.
- Don't bridge missing values or hide approximation caveats.
- Don't replace native date and time fields with decorative controls.
