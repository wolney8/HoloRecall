---
name: holorecall-ui-platform-acceptance
description: Review HoloRecall UI changes for its layout contract, accessibility, motion, and web/iOS/macOS readiness before accepting a visual milestone.
---

# HoloRecall UI and platform acceptance

Read `AGENTS.md`, `docs/HoloRecall_Product_Charter_v1.md`, `docs/architecture.md`, and `docs/ios-readiness.md`.

For changed flows, inspect the running UI and verify shared alignment/spacing, start-aligned prose, useful numeric alignment, deliberate centring, Light/Dark/System themes, contextual help, stable Study geometry, reduced motion, keyboard/touch access, 200% text reflow, and lifecycle cleanup. Sample intermediate motion when timing matters. Preserve `hrReveal` ownership and do not infer native verification from Playwright WebKit.

Record actual commands, browser engines, viewports, failures/retries, evidence paths, and native-only gaps in `docs/project-status.md`. Report unrelated findings without expanding the authorised milestone.
