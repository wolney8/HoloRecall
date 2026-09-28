# Project status

Updated: 28 September 2026. Milestone: first running local web prototype, ready for inspection.

## What works

- Responsive Angular dashboard with real ready/new/due counts, today's review count, self-reported recall success and seven daily activity counts. No synthetic progress.
- Original 16-card Italian deck covering image recall, articles, noun patterns and exceptions, essere, avere and parlare. Six original bundled SVG assets, with no media account or external font dependency.
- Deck creation/editing/pausing and basic text/visual card creation, editing, tags and suspension. Content revisions preserve review history.
- Reveal, five confidence choices mapped to FSRS, next card, session progress and guarded undo through immutable reversal events. Double submissions are prevented; scheduler fuzz is disabled and the full versioned parameters are persisted.
- IndexedDB saves survive reload. Atomic snapshot writes detect stale tabs. Configurable limits, time zone, pointer effects and reduced motion. Accessible answer reveal and keyboard controls.
- Clearly labelled matte, foil, holo and relic collection samples; no earned reward claims or automatic challenge classification.
- JSON backup download and validated restore into untouched storage.

## Verification completed

| Check | Actual result |
| --- | --- |
| `npm run build` | Passed; production initial bundle 290.76 kB, estimated transfer 76.96 kB; no build warnings |
| `npm test` | 20 tests passed across two files: mapping, FSRS state, deduplication, undo/version chains, multi-deck eligibility, daily limits, London DST, backup validation, IndexedDB reload, stale writes and storage-open retry |
| `npm run test:e2e` | 9 Chromium tests passed: reveal/rate/reload, create/edit, undo, keyboard, samples/effects, mobile/reduced motion, loaded-page offline review and online recovery, visual-to-text conversion, JSON download/restore |
| Browser errors | No unhandled page errors; no console errors in online browser tests |
| Visual inspection | Desktop 1440px and mobile 390px; dashboard, study/reveal and collection screenshots inspected; no horizontal overflow in checked mobile pages |
| HTTP server | `http://127.0.0.1:4200/` returned HTTP 200; Angular development server left running in the execution environment's persistent terminal session |
| Dependency tree | Angular build and Vitest share pinned Vite 7.3.6 without invalid peers; lockfile retained |

Browser tests use isolated contexts and do not seed fabricated data into the user's browser. Browser emulation is not physical iPhone evidence. Cold offline startup/reload is not supported by a service worker in this milestone; only an already loaded page was tested offline.

## Repository and environment

- Correct isolated root: `/Users/will_work/Scripts/Homelab/HoloRecall`. The parent was not a Git repository; no applicable ancestor instruction files were present.
- `https://github.com/wolney8/HoloRecall.git` was empty at clone time. The checkout deliberately began with unborn `main`; the initial local commit includes the lockfile and uses the existing configured Git identity. Nothing is pushed or deployed.
- Working toolchain: Node 24.3.0, npm 11.4.2, Angular/CLI/build 21.2.24, TypeScript 5.9.3, ts-fsrs 5.4.2. [Architecture](architecture.md) records current official references and the npm resolver workaround.
- Full Xcode is unavailable (only Command Line Tools). No native build or physical-device check has run.

## Known limitations and deferred work

- One local learner and browser-origin storage; no authentication, API, Neon database, cloud media, cloud sync or durable native database. Clearing browser storage can remove study data. Back up before substantial study.
- Session queue/counter restart on page reload; saved reviews, history and schedule persist. Short-term due cards can be picked up by starting another session. No separate practice mode yet.
- Conflict detection rejects stale writes, but pending events are not durable across reload; there is no outbox or cross-device conflict resolution yet.
- Backups only restore into untouched storage; no import merge, CSV or Anki import.
- Cosmetic unlocks, XP, streak rewards, mastery criteria, boosters and automatic challenge tiers remain future work. No paid resources or publishing commitments.
- iOS packaging, native authentication/deep links, app lifecycle/storage, motion and named-device performance testing remain deferred. Automated checks do not certify full accessibility or every browser.

## Single next action

Inspect the running prototype at **http://127.0.0.1:4200/** and give feedback on the study flow, rating wording and visual direction before expanding the next milestone.
