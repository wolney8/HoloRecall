# Project status and durable handoff

Updated: 30 September 2026. Branch: `main`. Baseline commit: `bb475eb` (`Build local HoloRecall study prototype`). Visual milestone checkpoint: `f7ed8d7`; HR-UX-07–11 implementation checkpoint: `268fd78` (`Polish study and results motion`). Nothing has been pushed or deployed.

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
| HR-UX-07 | Complete | Desktop and 390 px Chromium checks sample the untransformed stage bounds and document scroll before, 180 ms into, and after the live flip; x/y/width/height remain within 0.5 px and scroll is unchanged. The fixed 2:3 envelope and reserved interaction region remain present in both control states. | Physical-browser text zoom combinations beyond the card renderer's tested scrollable long-content region remain manual review. |
| HR-UX-08 | Complete | Study uses the full focused workspace with a centered 360 px stage, responsive 330 px mobile cap, 30 px control separation and compact 48 px reveal action. Light/Dark 390 px screenshots and overflow assertions pass. | Very short physical-device viewports may require ordinary vertical scrolling; controls never overlap the card. |
| HR-UX-09 | Complete | A motion-enabled browser test records five distinct intermediate animation signatures. Feedback is created only after commit; five accepted ratings create five reviews/effects, while a forced stale save creates neither. Rapid double input remains deduplicated. | Treatments are CSS/Web Animations presentation only and remain subject to product tuning. |
| HR-UX-10 | Complete | IntersectionObserver uses the document viewport at 22% visibility. Tests prove the progress section has no animation while offscreen, then samples active row entrance, an intermediate real 0-to-1 fill, sheen and the transient zero-track error-colour glow before settlement. | Browser automation cannot characterize every GPU's colour/blending output. |
| HR-UX-11 | Complete | The diagnosed render race is removed with run-scoped observer attachment after conditional rendering. Intro current time is sampled mid-run; Skip appears only during active motion, settles/cancels all sections, and Replay/reload leave review/reward arrays unchanged. Reduced motion is static with no Skip. | No physical-device motion profiling yet. |

### HR-UX-07–11 diagnosed causes

- Reveal previously replaced a short action block with five tall rating rows in normal flow. The Study layout was a two-column grid whose overall height and scroll anchoring changed; focusing/clicking controls could expose that movement. The card now occupies an invariant stage, while both interaction states share reserved space below it.
- Results previously applied CSS animations immediately at render, including offscreen rows, and displayed Skip unconditionally. Most motion finished before it was viewed. The first observer correction also exposed an Angular conditional-render race; each visual run now attaches after the result sections exist, owns its timers and observer, and keeps final values as the nonanimated fallback.

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

- Branch/commit: `main`; HR-UX-07–11 application and test changes are checkpointed at `268fd78`; nothing is pushed or deployed.
- Relevant worktree: clean after the implementation checkpoint except for this final handoff reconciliation. `git diff --check` passes.
- Checks completed: `npm test` passes **65 tests across six files**; `npm run build` passes without warnings at **716.65 kB initial / 162.57 kB estimated transfer**; the full suite passes **32 Chromium tests** with two workers; `npm audit` reports **0 vulnerabilities**.
- Browser coverage: desktop/mobile, Light/Dark/System startup, keyboard/touch-equivalent pointer interaction, reduced motion, reload recovery, stale-write error handling, offline loaded-page review, all illustrations, uploads/backups, migration, reports and content exchange. Browser emulation is not physical iPhone evidence.
- Visual evidence inspected: centered 390 px Study in Light/Dark, System-theme results at intermediate progress, and a five-second Chromium video covering reveal, rating-4 feedback, results intro, scroll and bar growth. Evidence is under ignored `test-results/hr-ux-07-11-final/` and `test-results/ux-review-video-final/`.
- Current batch: invariant Study stage/control reserve, compact reveal action, five confidence effects, scroll-run results presentation, accurate progress animation, zero glow, Skip/Replay lifecycle, targeted tests and documentation.
- Outstanding product limitations are listed above; there are no known blockers for local review.
- Exact next action: inspect the local application at `http://127.0.0.1:4200/`; future cloud/iOS work remains a separate milestone.
