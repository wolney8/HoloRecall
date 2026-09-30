# Project status and durable handoff

Updated: 30 September 2026. Branch: `main`. Baseline commit: `bb475eb` (`Build local HoloRecall study prototype`). Verified local implementation checkpoint: `f7ed8d7` (`Complete visual design and focused study milestone`). Nothing has been pushed or deployed.

## Recovery snapshot

The worktree contains a coherent extension of the first prototype: Angular Material 3 theming with Light/Dark/System choices; all 16 Italian illustrations; schema-2 IndexedDB migration; persisted study sessions; seven rarity tiers and auditable reward events; Design Studio; Collection inspection; Progress reports; and XLSX/portable-ZIP content exchange. Package versions are pinned in `package.json`; installed top-level versions match it. No development server was listening on port 4200 at recovery.

Evidence recovered from files and repeatable checks, rather than interrupted-agent intent:

- Production build had passed at 684.38 kB initial with deferred feature screens and no warnings. This must be rerun after current changes.
- The latest completed unit/domain run before interruption reported 59 passing tests across six files. Queue reconciliation was changed after that result and still needs a full rerun.
- Earlier isolated Chromium runs passed the nine original scenarios and exchange round trips, but the combined milestone suite did not finish after the final session changes. Browser behavior remains unverified until rerun.
- The previous status page described only the first milestone and was stale; this document supersedes it.

## HR-UX tracker

| ID | Status | Acceptance evidence | Remaining issue / exact next action |
| --- | --- | --- | --- |
| HR-UX-01 | Complete | Browser test checks the explicit whole-face layer order and pointer-inert overlay for all seven tiers under System-dark; full suite checks both application themes, effects preference and reduced motion. Settled Collection screenshot inspected. | Physical-device/GPU differences remain outside browser automation. |
| HR-UX-02 | Complete | Chromium exercises click, Enter, Space and a 45 px drag; only genuine activation flips. The accessible label/state follows the displayed face and the redundant face button is gone. | No known issue. |
| HR-UX-03 | Complete | Live Chromium sees the first 360 ms phase of the 760 ms turn; content swaps edge-on before the 400 ms return. Rapid reversal and reduced-motion zero-animation paths pass. Mobile Study was inspected in both themes. | Timing remains a product-tuning choice; no physical iPhone profiling yet. |
| HR-UX-04 | Complete | Study preamble and repeated save copy removed. Reward rules, Collection unlock rules, result definitions and metric definitions use collapsed native details while current status/actions/errors stay visible. Marketing-copy audit found none of the prohibited slogans. | Dense authoring/exchange help remains because it is needed to complete those tasks. |
| HR-UX-05 | Complete | Natural and partial completion, recall timing, reload, replay/skip, active event counts, unique cards, confidence, actual eligible contributions/unlocks, no-data semantics and undo are covered by unit/browser tests. Results refresh/replay leaves event counts unchanged. | Older reviews correctly show no recall-speed sample; no fluency/mastery score is produced. |
| HR-UX-06 | Complete | Desktop/mobile browser checks confirm hidden Study chrome, restored shell, honest first/next card stack boundaries, End/Undo, routine-toast suppression and a real stale-tab failure shown as one persistent alert. | Background cards are visual concealed surfaces only; they expose no content or interaction. |

## Earlier milestone tracker

| Area | Recovered status | Remaining verification |
| --- | --- | --- |
| Material 3 / theme | Complete for local web milestone: public Angular Material 21 M3 APIs, Roboto, startup Light/Dark/System preference and token-based custom components. | Persistence, pre-Angular dark paint, desktop/mobile themes and no-overflow checks pass. |
| Italian artwork | Complete: 16 distinct subject-specific original SVGs. | Live front/back decode and intended-path audit passes for all 16. |
| Design Studio / renderer | Complete for scope: named reusable design sets, durable raster uploads, per-tier frames, fit/crop, theme/rarity preview, attribution, deck/card assignment and 2:3 guides. | Upload, assignment, reload, backup and mobile theme checks pass. |
| Cosmetics | Complete for initial policy: seven authored tiers, separate earned state, strictly increasing configurable thresholds, spaced rating-4/5 contributions, idempotent events and undo. | Reward/config/undo/session-results tests pass; samples remain labelled and isolated. |
| Authoring / exchange | Complete for specified local scope: authoring plus versioned XLSX preview/import/export, portable ZIP, blank/populated examples, exact spec and reusable prompt. | Accents, multiline/raster/design round trips, formula rejection, atomic apply and history preservation pass. |
| Progress | Complete for scope: real event counts/time/confidence, attention, deck data, cosmetics, FSRS estimate, filters and accessible summaries. | Date filtering, samples, undo, practice exclusion and empty states pass. |

## Known limitations retained by design

This remains one local learner in browser IndexedDB. There is no authentication, API, Neon database, cloud media, cloud sync, service worker, native packaging or physical-device evidence. Restore intentionally refuses to replace a nonempty workspace. Practice-mode storage is modeled but no practice UI exists. Uploaded assets are retained even if an unsaved design is abandoned; safe garbage collection is deferred. Browser emulation does not prove physical iPhone behavior.

## Current batch handoff

- Branch/commit: `main`; the application, domain, tests, 16 art assets, downloadable workbook/ZIP assets and dependency lockfile are checkpointed at `f7ed8d7`.
- Relevant worktree: clean after the implementation checkpoint except for this handoff reconciliation. `git diff --check` passes.
- Checks completed: `npm test` passes **65 tests across six files**; `npm run build` passes without warnings at **703.97 kB initial / 160.05 kB estimated transfer**; `npm run test:e2e` equivalent passes **25 Chromium tests** with two workers; `npm audit` reports **0 vulnerabilities**; `git diff --check` passes.
- Browser coverage: desktop/mobile, Light/Dark/System startup, keyboard/touch-equivalent pointer interaction, reduced motion, reload recovery, stale-write error handling, offline loaded-page review, all illustrations, uploads/backups, migration, reports and content exchange. Browser emulation is not physical iPhone evidence.
- Visual evidence inspected: settled System-dark Collection with all tiers; settled session results with metric cards/progress/unlocked card; 390 px Study, Collection, Design Studio and Progress in Light and Dark. Test screenshots are under ignored `test-results/final-pass/` and can be regenerated by the browser suite.
- Checkpoint contents: all recovered second-milestone work plus renderer layers/flip, Collection activation, persisted results/timing, focused Study, tests and documentation.
- Outstanding product limitations are listed above; there are no known blockers for local review.
- Exact next action: inspect the local application at `http://127.0.0.1:4200/`; future cloud/iOS work remains a separate milestone.
