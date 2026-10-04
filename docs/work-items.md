# Canonical work-item tracker

Updated: 3 October 2026. This file is the canonical local execution tracker. The product charter sets direction, `product-brief.md` records long-range capability coverage, and `project-status.md` is the current restart handoff. GitHub Issues are not in use; if introduced later, they must mirror this tracker rather than form a second source of truth.

## Lifecycle

`BACKLOG` → `PLANNED` → `IN_PROGRESS` → `VERIFY` → `DONE`.

Exceptional states are `BLOCKED`, `DEFERRED`, and `CANCELLED`. Completed items remain in this file with their evidence and commits.

## Active milestone — Search, organisation and scalable local media

### HR-GOV-03 — Canonical local work-item tracker

- **Product area / milestone / priority:** Governance / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Existing charter, capability roadmap and durable handoff
- **Requirement:** Establish this tracker, document its lifecycle and make the record-before-work cadence standing repository guidance without creating GitHub Issues.
- **Acceptance:** Every milestone request below is recorded before implementation; `AGENTS.md` links this record and defines state transitions; coherent batches update `project-status.md`; completed history remains discoverable.
- **Platform implications:** None at runtime; interruption recovery must not depend on chat history.
- **Implementation notes:** This tracker owns actionable execution only. It does not replace the charter, roadmap or handoff.
- **Verification / evidence:** Tracker predates implementation, retains every item and is linked from `AGENTS.md`; each coherent batch has a restart entry in `project-status.md`.
- **Commits:** `e0f739c`, `c9f7f23`.

### HR-ORG-01 — Global search

- **Product area / milestone / priority:** Organisation / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Platform-neutral content index; stable deck/card identities
- **Requirement:** Responsive offline search across deck titles and meaningful card content, including answers, meaning, pronunciation, notes, tags and useful source metadata. Results distinguish decks, cards and match context and navigate directly to the relevant context.
- **Acceptance:** Indexed query avoids DOM-wide scanning; wide and compact Material 3 experiences support keyboard and touch; empty state is concise; 1,000- and 10,000-card fixtures provide measured response evidence.
- **Platform implications:** Worker or index boundary must not assume a web filesystem; WebKit, lifecycle cancellation, offline use and future native storage remain explicit.
- **Implementation notes:** Internal IDs must not become ordinary searchable content.
- **Verification / evidence:** Unicode/accent-insensitive domain tests cover learner fields and ID exclusion. Chromium and WebKit navigate card results and measure the 10,000-card Worker path; desktop keyboard selection uses combobox/listbox semantics.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-ORG-02 — Filtering and sorting

- **Product area / milestone / priority:** Organisation / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-01 query boundary; rewards and scheduler read models
- **Requirement:** Add combinable deck/subdeck, tag, rarity, earned state, design, finish, scheduling/attention and media filters where meaningful, plus useful sorting. Use progressive disclosure and active chips.
- **Acceptance:** Combined filters return accurate cards, clearing is obvious, navigation back preserves the active view without trapping the learner, and persisted content is unchanged.
- **Platform implications:** Touch-sized controls, keyboard operation, 200% reflow and compact/landscape layouts.
- **Implementation notes:** Filters are view state, not portable learner content.
- **Verification / evidence:** Domain combination tests and browser navigation prove shared Decks/Collection state, removable active chips, clearing and no content mutation. Collection exposes the same filter model through progressive disclosure.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-ORG-03 — Tags and deck hierarchy

- **Product area / milestone / priority:** Authoring and organisation / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Compatible state migration and atomic bulk mutation
- **Requirement:** Canonical tag add/remove/rename and bulk operations; preserve imported tags. Add explicit deck/subdeck relationships, rename/move decks, and single/bulk card moves. Keep deletion non-destructive or separately confirmed.
- **Acceptance:** Trivial case/spacing variants do not duplicate tags; hierarchy cycles are rejected; safe bulk changes preserve review history, sessions and cosmetics; imported `::` hierarchy migrates predictably.
- **Platform implications:** Platform-neutral validation; usable keyboard and touch bulk flows.
- **Implementation notes:** Archive is preferred to destructive deletion during this milestone.
- **Verification / evidence:** Schema 4 migration/cycle tests, Anki `::` conversion, parent-deck queue/archive tests and browser bulk preservation evidence pass. Full backup preserves hierarchy; content workbook v3 remains flat and is recorded as a format limitation.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-ORG-04 — Scalable bulk management

- **Product area / milestone / priority:** Library management / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-02 and HR-ORG-03
- **Requirement:** Efficient selection and bulk move, tag, rarity, design, finish and archive actions without rendering thousands of collectible-card effects.
- **Acceptance:** Incremental rendering, paging or virtualization bounds DOM work; selection is scoped, keyboard-capable and touch-friendly; 10,000-card fixture proves large selection and mutation remain responsive.
- **Platform implications:** Avoid hover-only operation, permanent animation loops and inaccessible offscreen selected controls.
- **Implementation notes:** Only visible collection items animate.
- **Verification / evidence:** Both views render a 60-item slice with explicit incremental loading; atomic bulk preservation passes in Chromium/WebKit. The 10,000-card fixture proves one-result DOM/query bounds; broader 10k mutation profiling remains under HR-ORG-06.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-MEDIA-01 — Scalable local media registry

- **Product area / milestone / priority:** Persistence and portability / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Existing schema-3 asset model, IndexedDB adapter, import/export and backup contracts
- **Requirement:** Evolve the current single-snapshot media assumptions into an efficient stable registry for images, audio, backgrounds, frames and textures. Add content hashing/deduplication, reference accounting and an explicit safe cleanup operation.
- **Acceptance:** Identical imports reuse bytes; conflicting IDs remain safe; referenced assets cannot be cleaned; reload and old backup/package migration work; portable decks and full backups contain required bytes; index metadata is reconstructable.
- **Platform implications:** IndexedDB remains the web prototype; future native durable media uses the same stable IDs. Object URLs are never durable identities and resources are cleaned on lifecycle changes.
- **Implementation notes:** Do not auto-purge uncertain assets or clear existing storage.
- **Verification / evidence:** IndexedDB v2 separates metadata/payloads atomically and skips unchanged byte reads/writes on routine commits. Hashes are recomputed, duplicate bytes reuse stable IDs, reference-safe cleanup is explicit, old snapshots migrate, and ZIP/full-backup media round trips pass in both engines.
- **Commits:** `c4095fe`, `7f7cf3c`.

### HR-ORG-05 — Collection library experience

- **Product area / milestone / priority:** Collection / Search and organisation / P1
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-01, HR-ORG-02 and HR-ORG-04
- **Requirement:** Preserve the premium collectible identity while adding useful All, rarity, deck, recently unlocked, next unlock and query-driven views.
- **Acceptance:** Rich inspection remains; result grids are bounded; visible high-rarity cards may use restrained entrance/focus effects; search/filter navigation is direct; no new currency or unrelated game layer.
- **Platform implications:** WebKit-safe compositing, reduced motion, effects preference, touch and keyboard inspection.
- **Implementation notes:** Existing card renderer, finishes, design sets, tilt, `hrReveal` and M3 tokens remain authoritative.
- **Verification / evidence:** Collection retains the shared renderer, inspection, unlock views, bounded rows, direct search and progressive filters. Chromium/WebKit and reduced-motion journeys cover the presentation.
- **Commits:** `c4095fe`, `7f7cf3c`.

### HR-ORG-06 — Large-library performance

- **Product area / milestone / priority:** Performance / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-01, HR-ORG-04 and HR-MEDIA-01
- **Requirement:** Add reproducible 1,000- and 10,000-card fixtures and measure load, index, query, filter, scroll, selection, media resolution and import-to-index availability.
- **Acceptance:** Record real environment and timings, derive regression budgets from observed baselines, demonstrate responsive indexing and safe cancellation/recovery, and never count a completed test alone as performance evidence.
- **Platform implications:** Measurements are browser evidence only; WebKit is not native iOS/macOS proof.
- **Implementation notes:** Reuse existing large Anki fixture where it matches the scenario.
- **Verification / evidence:** Node 24.3/macOS: 1,000-card index/query stay below 500/100 ms test budgets. The final 10,000-card run measured 729.2 ms index, 6.6 ms combined query, 788.8 ms content-to-index availability, 19.1 ms atomic all-card mutation, 17.3 ms registry construction and 114.2 ms for 10,000 media resolutions. Earlier Chromium measured 2,296 ms index/render and 46 ms query/render; WebKit measured 1,077 ms and 69 ms. The DOM remains bounded at 60 normally and one for the measured query. These are local browser/Node baselines, not native-device claims.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`, pending study-milestone checkpoint.

### HR-ORG-07 — UI consistency gate

- **Product area / milestone / priority:** Design system / Search and organisation / P1
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Changed organisation views
- **Requirement:** Apply the charter layout contract to changed screens: shared padding/tracks, deliberate alignment, Material controls, concise copy, hierarchy and complete themes. Record unrelated issues rather than redesigning accepted screens.
- **Acceptance:** Changed flows pass Light/Dark/System, compact/large/landscape, keyboard/touch, reduced motion and 200% text checks with visible focus and no horizontal overflow.
- **Platform implications:** Maintain safe areas, WebKit behavior and future iOS/macOS readiness without native-verification claims.
- **Implementation notes:** Focal card inspection may remain centered; repeated prose/list content normally start-aligns.
- **Verification / evidence:** Changed screens use shared Material/system tokens, start-aligned list tracks and progressive controls. WebKit compact/large/landscape at 200% text passes; theme/reduced-motion coverage remains in the full regression gate.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

## Active defect recovery — Anki preview, hierarchy and Study transitions

These defects were reported from manual testing on 3 October 2026. They take priority over further Study Settings work. Reproduction and destructive verification must use isolated fixtures; the learner's imported decks, media and review history must not be reset or rewritten.

### HR-BUG-ANKI-01 — Import warning severity and classification
- **Product area / milestone / priority:** Anki import / Defect recovery / P0
- **Status:** DONE
- **Source:** Will's manual import of a 39-card package, 3 October 2026
- **Dependencies:** Existing worker parser, sanitisation and import preview
- **Requirement / acceptance:** Distinguish blocking conversion errors, meaningful content-loss warnings and harmless Anki-only simplifications. Anki TTS/filter syntax must preserve convertible field content and safe hyperlinks must not be classified as remote fetch dependencies. Preview counts must state normal, simplified, excluded and unsafe cards accurately, with details behind disclosure and explicit exclusion only for genuinely unsupported cards.
- **Platform implications:** Worker-safe inert conversion; Material 3 semantic states; WebKit/touch/keyboard/reflow; no remote fetching or imported active content.
- **Implementation notes:** First identify the exact triggering templates/syntax, count semantics and whether prompt, answer or required media is lost.
- **Verification / evidence:** Root cause reproduced: one broad issue list made every occurrence a blocking red exclusion; TTS/filter syntax remained literal and `href` was grouped with resource `src`. Domain fixtures prove preserved prompts/answers, inert TTS/filter simplification, ignored safe-link targets, separate remote-media warnings, required-prompt exclusion and mutually exclusive card counts. The animation-enabled defect suite passed 8/8 in Chromium/WebKit; the complete desktop gate passed 118/118 and phone WebKit passed 18/18 after correcting a real 200%-text summary overflow. Evidence is retained under `.runtime/evidence/hr-anki-defects-20261003/`.
- **Commits:** `0687816`.

### HR-BUG-ANKI-02 — Imported deck hierarchy and learning journey
- **Product area / milestone / priority:** Anki import and Decks / Defect recovery / P0
- **Status:** DONE
- **Source:** Will's manual Lesson 1 import, 3 October 2026
- **Dependencies:** Existing deck `parentId`, queue descendant logic, content exchange format
- **Requirement / acceptance:** Preserve authoritative Anki parent/subdeck structure with stable identities; show parents as aggregate learning journeys with progressively disclosed, individually studyable descendants; keep direct and recursive counts semantically consistent; parent Study gathers descendants and child Study stays scoped; reimport does not duplicate the tree.
- **Platform implications:** Platform-neutral hierarchy and queue logic; compact Material 3 hierarchy on web/iOS/macOS widths; portable version migration must retain hierarchy.
- **Implementation notes:** Determine whether import loses relationships, the Decks UI flattens existing relationships, counts mix scopes, or a combination. Never infer hierarchy only from punctuation when authoritative source data exists.
- **Verification / evidence:** Genuine Anki 26.9.3 analysis proved source hierarchy already converted to stable `parentId`; flat Decks rendering plus direct-card/recursive-ready count mixing caused the defect. Parent journey/subdeck Chromium and WebKit journeys pass; domain hierarchy identity, aggregate counts, parent/child queue scope, reimport preservation and format-v4 XLSX/ZIP parent/sibling round trips pass while v1–v3 remain readable. Complete browser evidence: 118/118 desktop and 18/18 phone WebKit. Evidence is retained under `.runtime/evidence/hr-anki-defects-20261003/`.
- **Commits:** `0687816`.

### HR-BUG-STUDY-01 — Imported card disappears after transition
- **Product area / milestone / priority:** Study presentation / Defect recovery / P0 (highest)
- **Status:** DONE
- **Source:** Will's manual multi-card imported-deck Study, 3 October 2026
- **Dependencies:** Save-gated confidence feedback, deal transition, shared card renderer and imported media/content
- **Requirement / acceptance:** Reproduce the first-to-second/third imported-card transition and identify whether domain queue, converted content, renderer state or stale presentation callbacks cause the loss. Every accepted transition must settle the current active card visibly; callbacks must be scoped to their transition/card; optional motion failure/cancellation must fail visible. Preserve Study geometry, controls, order, Undo, deduplication, timing and reduced-motion behavior.
- **Platform implications:** Animation cleanup and background/resume safety; Chromium and Playwright WebKit evidence; native Safari/WKWebView remains separately unverified.
- **Implementation notes:** Capture active/queue IDs, transition generation/state, renderer presence and final computed opacity/visibility/display/transform. Do not mask the defect with longer timeouts.
- **Verification / evidence:** Reproduced in both engines: queue/current content advanced correctly, but the finished 180 ms outgoing animation retained `opacity:0` and translate through `fill:forwards` after the incoming animation released. Owned animations now cancel on success, stale-run, navigation, destruction and background settlement. Genuine imported-card journeys prove two consecutive transitions settle at opacity 1, transform none, no retained animation and exactly one event per rating; interruption settles visibly; reimport preserves states, reviews, rewards and hierarchy. Defect suite 8/8, complete desktop 118/118 and phone WebKit 18/18 passed without retries or skips.
- **Commits:** `0687816`.

## Paused milestone — Study configuration, history and Anki normalization

All items below originate from Will's 1 October 2026 milestone. The lead owns schema, scheduler contracts and integration. Official comparison sources are the current Anki Manual deck-options, studying, preferences, browsing and packaged-deck pages; these define comparison points, not a requirement to copy Anki's interface.

### HR-STUDY-01 — Reusable HoloRecall study presets
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Schema migration; FSRS adapter
- **Requirement / acceptance:** Stable named presets with built-ins, create/duplicate/rename/edit, deck assignment/usage, safe defaults and referenced-delete protection; deck exceptions and today-only limits stay separate.
- **Platform implications:** Platform-neutral resolution, compact Material 3 UI, keyboard/touch/200% reflow.
- **Verification / commits:** Schema-5 preset IDs survive rename/reload; create/duplicate/edit/restore, deck assignment, referenced replacement/delete and built-in defaults are covered by store/domain tests and Chromium/WebKit settings journeys. Commit `91800ea` plus final milestone checkpoint.

### HR-STUDY-02 — Daily workload and hierarchy limits
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** HR-STUDY-01; hierarchy-aware queue
- **Requirement / acceptance:** New/review limits, new-after-review-limit policy, per-deck and today-only overrides, deterministic parent/subdeck caps and honest limited-work explanations without history mutation.
- **Platform implications:** Local-day/DST behavior remains platform-neutral and interruption safe.
- **Implementation notes:** Accepted review events retain owning deck, full ancestry, selected Study root, learner day and IANA time zone. The selected root caps the aggregate queue; every applicable branch between each card's owning deck and that selected root caps its descendant contribution. Direct child Study stops limit resolution at that child and excludes unrelated branches. New introductions and mature reviews have separate ledgers; only cards admitted inside the root cap consume contribution allowance; learning/relearning remains scheduler-correct.
- **Verification / commits:** Fixed-clock Course/Lesson A/Greetings/Introductions/Lesson B tests prove unrelated-deck isolation, repeated same-day seeding, selected-parent aggregation, intermediate and leaf caps, shared-parent state, learner-day reset, today-only expiry, distinct new/review limits, bounded candidate charging, exact-once undo and administrative/practice exclusion. Backup validation checks that attribution is a real parent chain while retaining legacy events. Chromium and WebKit verify apply/reload/clear without review mutation. Implementation commits `4df9d61` and `cb2bbce`.

### HR-ACCEPT-ANKI-01 — Exact real-package manual acceptance
- **Product area / milestone / priority:** Anki import and Study / Study configuration / P1
- **Status:** VERIFY
- **Source:** Will, 3 October 2026 follow-up acceptance direction
- **Dependencies:** Will's exact real-world `.apkg`; accepted HR-BUG-ANKI-01/02 and HR-BUG-STUDY-01 implementation
- **Requirement / acceptance:** Manually verify that the exact package presents proportionate simplification/warning classifications, retains its parent/subdeck journey, and keeps several consecutive imported Study cards visibly settled.
- **Platform implications:** This is real-content acceptance on Will's local browser profile, not native iOS/macOS verification. It must not clear or rewrite existing learner history.
- **Implementation notes:** Automated genuine/synthetic fixtures remain supporting evidence. They do not substitute for this exact package or permit this item to be marked DONE.
- **Verification / evidence:** Pending Will's manual report. This item does not block continued Study Settings implementation.
- **Commits:** Tracker checkpoint in the final milestone documentation commit; manual evidence pending.

### HR-STUDY-03 — Supported FSRS settings
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Installed `ts-fsrs` 5.4.2 capabilities
- **Requirement / acceptance:** Desired retention and maximum interval are honored; learning/relearning steps are exposed only where correct; optimisation exists only if a trustworthy supported implementation is present, with explicit apply/recovery.
- **Platform implications:** Pure domain configuration; no imported parameters or native divergence.
- **Verification / commits:** `ts-fsrs` 5.4.2 accepts the validated retention, maximum interval and same-day learning/relearning steps. Review events snapshot resolved settings. The installed package has no optimiser, so optimisation remains a named roadmap gap rather than a UI action.

### HR-STUDY-04 — Preserve five-confidence grading
- **Product area / milestone / priority:** Study / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Existing Study renderer and scheduler adapter
- **Requirement / acceptance:** Retain 1/2/3/4/5 → Again/Hard/Good/Good/Easy with original ratings, labels/help, save-gated effects and timing; no fifth FSRS grade.
- **Platform implications:** Preserve keyboard, touch, reduced motion and fixed Study geometry.
- **Verification / commits:** Domain tests confirm `1/2/3/4/5 → Again/Hard/Good/Good/Easy`, ratings 3/4 schedule identically from identical state/time while persisting their original value. Accepted Chromium/WebKit Study timing/geometry suites pass.

### HR-STUDY-05 — Deterministic queue and display order
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** HR-STUDY-01/02; stable new-card position
- **Requirement / acceptance:** Supported gather/sort, new-versus-review and review due/random/retrievability orders alter only the persisted queue; animations follow it. Deterministic tests cover every option.
- **Platform implications:** Platform-neutral randomness injection and reload recovery.
- **Verification / commits:** Stable due, deterministic hash-random, explicit position, gathered/random, before/mixed/after and per-card FSRS retrievability ordering are domain-owned; the persisted session queue remains the renderer/deal order. Due/position outcomes and repeatability pass fixed-state tests; stronger expected-order fixtures for random/retrievability are tracked under HR-TEST-01.

### HR-STUDY-06 — Siblings, burying and suspension
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Stable source note/template sibling identity
- **Requirement / acceptance:** Configurable sibling burying, manual bury/unbury and persistent suspend/unsuspend remain distinct from archive. Reversed/cloze siblings survive import/reimport and statuses appear in management filters.
- **Platform implications:** Day-boundary/DST persistence and accessible bulk controls.
- **Verification / commits:** Native reversible pairs and imported cards share explicit sibling IDs; auto bury uses learner-day keys, manual bury is separate, and suspension persists. Collection/index filters expose buried/suspended state. Interday-learning bury is not applicable while supported steps are same-day.

### HR-STUDY-07 — Lapses and leech management
- **Product area / milestone / priority:** Scheduling / Study configuration / P1
- **Status:** DONE
- **Dependencies:** Review history; HR-STUDY-03/06
- **Requirement / acceptance:** Real failures drive configurable attention threshold and optional suspend action; default flags only. No rarity, entitlement or punitive-low-confidence coupling.
- **Platform implications:** Pure event-derived policy; visible recovery on all layouts.
- **Verification / commits:** Active, scheduled rating-1 events drive a configurable threshold; default action flags, optional action suspends. Tests prove flag-only behavior and no cosmetic/scheduler-grade coupling.

### HR-STUDY-08 — Reviewer preferences
- **Product area / milestone / priority:** Study / Study configuration / P1
- **Status:** DONE
- **Dependencies:** Existing audio, timing and confidence controls
- **Requirement / acceptance:** Remaining-count and predicted-interval visibility, audio autoplay/stop behavior, recorded-answer cap and optional visible timer preserve scheduling and active-time semantics. Auto Advance and Easy Days were evidence-gated here and are resolved under HR-STUDY-09 and HR-STUDY-10.
- **Platform implications:** Audio/lifecycle cleanup, reduced motion, touch, future native interruption.
- **Verification / commits:** Study supports optional counts, predicted next timing, visible timer, configurable recording cap, autoplay with accessible fallback and stop-on-action/lifecycle cleanup. HR-STUDY-09 is now DONE; HR-STUDY-10 records the evidence-based Easy Days dependency instead of simulating it.

### HR-HIST-01 — Truthful card review history
- **Product area / milestone / priority:** History / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Immutable review/reversal events
- **Requirement / acceptance:** Collection/management exposes concise review history with persisted time, confidence, grade, state, interval/due changes, timing and FSRS values; missing historical values say unavailable.
- **Platform implications:** Bounded rendering, semantic table/timeline and compact reflow.
- **Verification / commits:** Collection card inspection and Progress expose a bounded 50-row timeline with persisted confidence/grade, before/after state, interval, due, timing, stability/difficulty and reversal state. Historical retrievability is labelled unavailable. Chromium/WebKit journeys pass.

### HR-HIST-02 — Safe scheduling administration
- **Product area / milestone / priority:** History / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Versioned administrative events and atomic store operations
- **Requirement / acceptance:** Set due, suspend, bury, reset/forget and meaningful new-card reposition operations are confirmed, atomic and history-preserving. Administrative events never count as recall or rewards.
- **Platform implications:** Durable reload/recovery and touch/keyboard confirmation.
- **Verification / commits:** Atomic single/bulk set-due, reset, bury, suspend and reposition commands append distinct management events. Reset preserves reviews/rewards; Progress continues to count only review events. HR-HIST-04 now supplies exact valid administrative undo without turning those records into reviews.

### HR-HIST-03 — Scheduling-state and history filters
- **Product area / milestone / priority:** History / Study configuration / P1
- **Status:** DONE
- **Dependencies:** Existing library index and Progress date filters
- **Requirement / acceptance:** Extend the current index for new/learning/review/due/overdue/suspended/buried/attention/recently reviewed; add date-filtered history without a second search system.
- **Platform implications:** Worker-safe reconstructable fields and compact filter disclosure.
- **Verification / commits:** The existing index now covers overdue, suspended, buried, leech and recently reviewed alongside prior states. Progress date controls filter the shared history view; no second search/index architecture was added.

### HR-IMPORT-02 — Normalize Anki content into HoloRecall study
- **Product area / milestone / priority:** Import / Study configuration / P0
- **Status:** DONE
- **Dependencies:** HR-STUDY-01; existing stable source identities
- **Requirement / acceptance:** Preview selects a HoloRecall preset and states that Anki learning history is excluded. New imports enter native New state; reimport preserves HoloRecall state/history/rewards. No Anki scheduling, options, parameters or AnkiWeb data are adopted.
- **Platform implications:** Worker conversion stays content-only and platform-neutral.
- **Verification / commits:** Anki preview provides a concise HoloRecall preset selector and required history-exclusion copy. New decks receive that preset and cards remain New; reimport preserves native schedules, reviews, rewards, suspend/bury/leech/position and existing preset assignment. Unit/import/browser fixtures pass.

### HR-PLAN-02 — Study-settings capability matrix
- **Product area / milestone / priority:** Planning / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Current official Anki Manual and implemented evidence
- **Requirement / acceptance:** Classify every requested settings/history capability as DONE/PARTIAL/PLANNED/NOT APPLICABLE/NOT PLANNED. Record **AnkiWeb Sync — NOT PLANNED** and keep future HoloRecall sync separate.
- **Platform implications:** Evidence must distinguish web, WebKit and native verification.
- **Verification / commits:** `docs/product-brief.md` contains the explicit settings/review matrix and separates Anki content import, HoloRecall exchange/backup, future HoloRecall sync and **AnkiWeb Sync — NOT PLANNED**.

### HR-PERF-01 — Recover initial bundle warning headroom
- **Product area / milestone / priority:** Performance / Study configuration / P2
- **Status:** DONE
- **Source:** Production build measurement, 3 October 2026
- **Dependencies:** Angular route/chunk ownership review
- **Requirement / acceptance:** Return the initial production bundle to or below the existing 850 kB warning ceiling without raising the budget, removing accepted behavior or moving unsafe code into eager paths.
- **Platform implications:** Smaller startup payload benefits web and future packaged WebView startup; no native performance claim follows from bundle size alone.
- **Implementation notes:** The measured eager graph included Angular Material at 259.41 kB, Angular framework/forms/platform at 191.29 kB, application shell code at 165.21 kB, CDK at 85.61 kB, domain code at 46.53 kB and `ts-fsrs` at 21.14 kB. The root Settings shell eagerly imported `MatSlideToggle` solely for Appearance controls. Those controls now live in a deferred standalone `AppearanceSettingsComponent`; Study remains eager because it is part of the primary workflow. Existing Focus, Exchange, ExcelJS, JSZip, SQLite/WASM and Anki parsing boundaries remain lazy.
- **Verification / evidence:** Closure baseline: **847.67 kB raw / 198.69 kB transfer**. Native interaction initially measured **851.43 kB**; moving the settings-only reward editor into the existing deferred settings boundary produced **849.53 kB raw / 201.26 kB transfer**, below the unchanged ceiling. Capacitor/Haptics/Back and heavy exchange tooling remain lazy. No limit increase or accepted feature removal was used.
- **Relevant commits:** `065a391`, `711cfc5`, `f80042e`, current acceptance commit.

### HR-TEST-01 — Strengthen queue-order and audio-action assertions
- **Product area / milestone / priority:** Verification / Study configuration / P2
- **Status:** DONE
- **Source:** Independent acceptance review, 3 October 2026
- **Dependencies:** Existing deterministic queue fixtures and bundled-audio browser fixture
- **Requirement / acceptance:** Add expected-order fixtures that distinguish random and retrievability policies, and a focused browser assertion that accepted rating pauses active card audio after persistence succeeds. Preserve current general audio/lifecycle and queue regression coverage.
- **Platform implications:** Run in Chromium and Playwright WebKit; native audio interruption remains separate device evidence.
- **Verification / evidence:** `study-settings.test.ts` now asserts exact random and retrievability order, and the genuine Anki MP3 Chromium/WebKit journey proves accepted persistence dispatches `pause` before advancing. Full unit and both desktop browser suites pass.

## Completed milestone — Custom Study and Focused Practice

Source: Will's 3 October 2026 milestone. Anki's current filtered-deck, studying and searching documentation is a capability reference; HoloRecall uses non-destructive Focused Sessions over original cards.

### HR-FOCUS-01 — Explicit scheduled and practice modes
- **Product area / milestone / priority:** Study / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Persisted Study session and immutable scheduled reviews
- **Requirement / acceptance:** Persist mode explicitly. Scheduled mode alone may update FSRS, due dates, daily usage, statistics and rewards. Practice may record separate activity but never scheduling/reward state.
- **Platform implications:** Platform-neutral domain contract and interruption-safe persistence.
- **Verification / evidence:** Schema 6 persists explicit mode plus separate immutable Practice events. Domain and browser tests prove Practice leaves FSRS, due dates, allowance, reviews, controls and rewards unchanged; Scheduled Focus creates a real FSRS transition.

### HR-FOCUS-02 — Focus entry and quick actions
- **Product area / milestone / priority:** Decks / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Today overrides; library index
- **Requirement / acceptance:** Deck Focus entry with more-new, more-review, missed, due/overdue, preview-new, review-ahead and tag/state actions. Scheduled choices remain genuinely eligible.
- **Platform implications:** Material 3, keyboard/touch, compact and 200% reflow.
- **Verification / evidence:** Deck/Dashboard Focus entry plus today-only new/review actions, Today/7-day mistakes, due/overdue, preview-new, 1/3/7-day ahead and tag/state builder pass Chromium/WebKit and phone reflow checks.

### HR-FOCUS-03 — Focused Session builder
- **Product area / milestone / priority:** Study / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Existing indexed filters and scheduler eligibility
- **Requirement / acceptance:** Combine branch, tags, state, due/missed/attention/added criteria, bounded card count, mode and evidence-backed order without a second query language.
- **Platform implications:** Large result sets remain bounded and platform-neutral.
- **Verification / evidence:** Versioned criteria reuse the library index and support branch, query, tags, schedule states, missed/due/overdue/added windows, suspension opt-in, limit, mode and backed orderings. The final 10,000-card Node/Vitest fixture returned its bounded 40-card slice in 1,640.5 ms within the 3 s local budget.

### HR-FOCUS-04 — Saved Focus presets
- **Product area / milestone / priority:** Study / Focused Practice / P1
- **Status:** DONE
- **Dependencies:** Focus criteria schema
- **Requirement / acceptance:** Stable-ID save, rename, duplicate, delete and run; presets store criteria, not duplicated card IDs, and remain distinct from scheduler Study presets.
- **Platform implications:** Versioned local persistence and backup.
- **Verification / evidence:** Stable-ID schema-6 presets support save, edit/rename, duplicate, delete and run. Each run reevaluates criteria; random runs receive a persisted per-session seed. Full backups validate preset/session references.

### HR-FOCUS-05 — Study from search and selection
- **Product area / milestone / priority:** Collection / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Library query/selection state
- **Requirement / acceptance:** Practice selected/current-filter cards and Study eligible cards without duplicating search logic or rendering the whole result set.
- **Platform implications:** Keyboard multi-select and touch-friendly actions.
- **Verification / evidence:** Collection current results and selected IDs expose Practice and Study eligible actions through the same Focus request; scheduled selection is intersected with the genuine due queue.

### HR-FOCUS-06 — Shared Practice player
- **Product area / milestone / priority:** Study / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** HR-FOCUS-01
- **Requirement / acceptance:** Reuse the accepted card player, reveal, five-confidence controls, feedback, audio and responsive layout with a subtle persisted Practice label. Ratings never invoke FSRS.
- **Platform implications:** Preserve Study geometry, animation ownership and WebKit cleanup.
- **Verification / evidence:** The shared Study player branches only at the persisted writer. Two consecutive motion-enabled Practice ratings remain visibly settled in Chromium/WebKit; audio, five controls, feedback and phone layouts are reused.

### HR-FOCUS-07 — Practice results
- **Product area / milestone / priority:** Results / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Separate practice events/session state
- **Requirement / acceptance:** Show real practice count, unique cards, active time, confidence, recall timing and low-confidence cards without intervals, due movement or cosmetics.
- **Platform implications:** Reuse accessible Results motion with reduced-motion settlement.
- **Verification / evidence:** Results show event count, unique cards, active time, average and 1–5 confidence distribution, timed recall sample and low-confidence cards, with repeat/view/return actions and no cosmetic or interval claims.

### HR-FOCUS-08 — Weak-card contextual practice
- **Product area / milestone / priority:** Progress / Focused Practice / P1
- **Status:** DONE
- **Dependencies:** Needs-attention and leech filters
- **Requirement / acceptance:** Contextual Practice actions for needs attention, recent confidence 1, leeches and low-confidence results reuse the shared Focus builder.
- **Platform implications:** No bespoke or duplicated queue implementations.
- **Verification / evidence:** Progress Needs Attention emits the shared Practice selection; Focus exposes Today/recent Confidence 1 plus attention/leech states; Collection can practise the active filtered result without bespoke queues.

### HR-FOCUS-09 — Focus lifecycle and recovery
- **Product area / milestone / priority:** Persistence / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Persisted session schema and lifecycle port
- **Requirement / acceptance:** Recover mode, focus criteria, ordered IDs, position and outcomes without duplicate reviews/rewards/practice events; safely skip removed or newly ineligible cards.
- **Platform implications:** Background/resume, offline local state and future Capacitor lifecycle.
- **Verification / evidence:** Mode, criteria, seeded order, queue position and accepted outcomes persist. Reload resumes Practice without converting it; normal Study cannot resume a Practice queue. Reconciliation safely prunes missing, archived, ancestor-suspended and newly buried cards.

### HR-FOCUS-10 — Scheduler safety boundary
- **Product area / milestone / priority:** Scheduling / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** HR-FOCUS-01
- **Requirement / acceptance:** Scheduled review recording requires scheduled context; Practice has a separate event operation and cannot mutate FSRS, due dates, allowance, leeches or rewards. Scheduled Undo remains unchanged.
- **Platform implications:** Pure domain/type separation shared by every platform.
- **Verification / evidence:** `applyScheduledReview` now requires a revealed active Scheduled session. `recordPracticeRating` owns a distinct operation/event namespace and rejects cross-namespace IDs. Independent review found and the lead fixed the prior no-session bypass and Study-resumes-Practice defect; 128/128 domain tests pass.

### HR-PLAN-03 — Custom Study capability matrix
- **Product area / milestone / priority:** Planning / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** HR-FOCUS-01–10 evidence
- **Requirement / acceptance:** Accurately classify limit increases, forgotten/ahead/new/state/tag/arbitrary selection, limits, ordering, saved selection, rescheduling and home-deck identity. Document Focused Session versus literal filtered deck.
- **Platform implications:** Distinguish browser evidence from native verification.
- **Verification / evidence:** `docs/product-brief.md` records the exact comparison and the non-destructive Focused Session architecture; review-ahead rescheduling remains intentionally not implemented.

## Active milestone — Review Workflow Completion and Study Settings Closure

Source: Will's 3 October 2026 closure milestone. Current Anki deck-options documentation is a capability reference; HoloRecall retains its own five-confidence reviewer and platform boundaries.

### HR-HIST-04 — Administrative event undo
- **Product area / milestone / priority:** Review management / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** Administrative event log, atomic store concurrency and HR-HIST-02
- **Requirement / acceptance:** Exactly and atomically reverse valid set-due, bury/unbury, suspend/unsuspend, reset/forget and reposition actions without creating reviews, changing rewards or applying stale snapshots. Bulk actions undo as one logical action; invalid/superseded actions expose why they cannot be undone. Persist audit history and keep review Undo separate.
- **Platform implications:** Platform-neutral event contract, atomic IndexedDB persistence, compact keyboard/touch History affordance and future native read-back.
- **Implementation notes:** New administrative changes carry a stable bulk `groupId` and exact before/after projections for the scheduling state, card controls and suspension flag. Undo validates every group member against current persisted state before one atomic commit, advances scheduling versions rather than rewinding them, and appends immutable `undo` records referencing the original events. Legacy schema-6 records remain readable but are deliberately non-undoable because they lack safe snapshots. No-op reset/bury/suspend operations create no misleading history. Direct Collection suspension now uses the same management path.
- **Verification / evidence:** Store/domain coverage exercises set-due, reset, bury/unbury, suspend/unsuspend, reposition, atomic bulk undo, duplicate undo, stale state after another control change or review, legacy records, no-op New reset, review/reward invariance and backup validation (16/16 focused tests). Chromium and WebKit both pass the History reset → undo → reload journey (2/2); the UI shows Undo only for a currently valid group and marks its original record Undone. Production build passes.
- **Relevant commits:** `065a391`, `711cfc5`.

### HR-STUDY-09 — Safe Auto Advance
- **Product area / milestone / priority:** Reviewer / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** Shared Study player, lifecycle, audio and finite confidence/deal choreography
- **Requirement / acceptance:** Optional default-off auto-reveal timing with explicit rating always required; configurable question/answer presentation controls, immediate pause/resume, no timer burst after backgrounding, no audio/animation truncation and identical Scheduled/Practice safety. Auto Advance never invents a rating.
- **Platform implications:** Shared web/iOS/macOS lifecycle boundary, keyboard/touch controls, reduced motion and accessible status without noisy announcements.
- **Implementation notes:** Presets now hold default-off bounded question and minimum-answer timing. The one shared Study player owns a generation/session/card-bound auto-reveal timer; lifecycle or audio interruption preserves a bounded remainder and persists a paused state, while recovery requires deliberate Resume. Auto-reveal never rates. A real rating persists first, then the retained card completes confidence feedback, any remaining configured answer dwell and the existing deal. Recall/active time is captured before presentation delays. The outgoing card now retains its own preset while visible.
- **Verification / evidence:** The complete desktop matrix passes **136/136** and WebKit phone profiles **24/24**. Dedicated checks cover pause/reload/deliberate resume, auto-reveal with zero reviews, explicit rating, owned answer dwell, next-card visibility, lifecycle interruption, valid playing audio, rejected playback recovery and Practice without FSRS/reward mutation. The full unit/domain suite passes **132/132**. A startup race was fixed by declaring pending autoplay before its asynchronous `play()` call; rejected playback now always releases that state.
- **Relevant commit:** `711cfc5`.

### HR-STUDY-10 — Easy Days evaluation
- **Product area / milestone / priority:** Scheduling / Workflow closure / P1
- **Status:** PLANNED
- **Dependencies:** `ts-fsrs` 5.4.2 scheduling API and future-schedule integrity
- **Requirement / acceptance:** Determine whether Normal/Reduced/Minimum weekday workload treatment has a supported scheduler integration. Implement only if future schedules can be adjusted without hiding due work, rewriting existing due dates or corrupting FSRS interval state; otherwise document the exact missing primitive and retain an honest PARTIAL/PLANNED state.
- **Platform implications:** Pure scheduler decision shared across platforms; deterministic learner-time-zone tests if implemented.
- **Verification / evidence:** Current Anki documents Easy Days as FSRS-aware future workload redistribution. Installed `ts-fsrs` **5.4.2** type/runtime inspection exposes interval fuzzing and review-history rescheduling but no weekday workload-distribution input. Post-processing its returned due date would create a second unsanctioned scheduler policy, and hiding due work would violate the requirement. Exact dependency: a supported weekday distribution integration that returns internally valid scheduling state and can be tested deterministically. No setting or fake due-date shift was added.
- **Relevant commit:** `711cfc5` (evaluation and recorded decision).

### HR-STUDY-11 — Reviewer workflow consistency
- **Product area / milestone / priority:** Reviewer / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** Scheduled, Focus and Practice session modes
- **Requirement / acceptance:** Normal/parent/child/Scheduled Focus/Practice/saved Focus use the authoritative player and consistent reveal, confidence, help, keyboard, audio, timers, Auto Advance, Undo, progress, motion, end and Results behavior. Remove divergence through shared seams rather than copied CSS.
- **Platform implications:** Desktop/touch/WebKit, lifecycle settlement, stable geometry and reduced-motion evidence.
- **Implementation notes:** Normal/parent/child/Scheduled Focus/Practice/saved Focus already converge on the root shared player. This pass adds Auto Advance only there, fixes retained outgoing cards to resolve the displayed card's preset/timing/audio policy, and keeps reveal, rating, persistence, motion and Results on the established paths.
- **Verification / evidence:** Normal Scheduled, parent/child, Scheduled Focus, Practice and saved Focus remain on the single root player. The complete Chromium/WebKit matrix passes **136/136**, including consecutive-card visibility, animation ownership, audio, Results, rewards, history and Focus boundaries; WebKit phone profiles pass **24/24**.
- **Relevant commit:** `711cfc5`.

### HR-STUDY-12 — Settings discoverability
- **Product area / milestone / priority:** Settings / Workflow closure / P1
- **Status:** DONE
- **Dependencies:** Existing Study Settings component and deck preset assignment
- **Requirement / acceptance:** Natural Deck details, Study and main Settings entry points all reach one underlying settings surface. Deck context clearly identifies assigned preset and override state; advanced controls remain progressively disclosed.
- **Platform implications:** Material 3 alignment, touch targets, 200% reflow, focus and safe-area readiness.
- **Implementation notes:** Deck and subdeck actions plus the active Study session open the same `StudySettingsComponent`; a deck-aware context panel shows the resolved preset, inheritance and direct workload overrides. The main Settings navigation opens the same surface without stale deck context. Opening it from Study pauses Auto Advance and preserves the session.
- **Verification / evidence:** Deck → Settings, Study → Settings and global Settings context clearing pass both desktop engines. The complete WebKit compact/large/landscape gate passes **24/24**, including Study Settings at 200% text and touch-sized layouts.
- **Relevant commit:** `711cfc5`.

### HR-PLAN-04 — Study capability closure matrix
- **Product area / milestone / priority:** Planning / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** HR-PERF-01, HR-HIST-04 and HR-STUDY-09–12 evidence
- **Requirement / acceptance:** Reconcile presets, limits, steps, order, siblings, leeches, audio/timers, Auto Advance, Easy Days, retention/interval, optimization, history/admin undo, Focus/Practice, import and AnkiWeb status. Keep optimizer honest and **AnkiWeb Sync — NOT PLANNED**.
- **Platform implications:** Distinguish implementation from Chromium/WebKit and native evidence.
- **Verification / evidence:** `docs/product-brief.md` now records Auto Advance DONE, Easy Days evaluated/PLANNED with the missing scheduler primitive, administrative management/undo DONE, the existing preset/limits/steps/order/audio/timer/FSRS/history/Focus/Practice/import boundaries, optimizer PARTIAL and **AnkiWeb Sync — NOT PLANNED**. Intentional HoloRecall differences remain explicit.
- **Relevant commit:** `711cfc5`.

## Active milestone — Confirmed mobile platforms and Android baseline

Source: Will's 4 October 2026 confirmed Web/iOS/iPadOS/Android/Apple-silicon Mac direction. Intel Mac and AnkiWeb Sync are not planned. Shared contracts remain lead-owned; store provisioning, signing, publication, cloud sync and payments are outside scope.

### HR-GOV-04 — Authoritative multi-platform product contract
- **Product area / milestone / priority:** Governance / Mobile platform direction / P0
- **Status:** DONE
- **Dependencies:** Existing charter and Apple feasibility decision
- **Requirement:** Record the confirmed targets, Anki/Duolingo/collectible reference model, OS support policy, Intel Mac and AnkiWeb exclusions in the existing charter.
- **Acceptance:** No authoritative record implies Android is out of scope; minimums remain evidence-based; references describe inspiration without copying product identity.
- **Platform implications:** Web, iOS/iPadOS, Android and Apple-silicon Mac become the maintained target set.
- **Implementation notes:** Update the existing charter only.
- **Verification / evidence:** Charter v1.1 names all four targets, OS policy, reference models and exclusions; architecture/readiness records agree.
- **Relevant commits:** `fa33a27`, `f80042e`.

### HR-GOV-05 — Continuous portability rule
- **Product area / milestone / priority:** Governance / Mobile platform direction / P0
- **Status:** DONE
- **Dependencies:** HR-GOV-04; canonical tracker cadence
- **Requirement:** Make proportional four-target portability review and narrow adapter use a standing repository instruction.
- **Acceptance:** `AGENTS.md` names every target and persistence/files/lifecycle/offline/input/safe areas/haptics/motion/accessibility/share/performance/permission considerations without claiming simultaneous device verification.
- **Platform implications:** Prevent browser/native leakage into domain contracts.
- **Verification / evidence:** Root `AGENTS.md` has the proportional four-target review rule and links the canonical readiness record.
- **Relevant commits:** `fa33a27`.

### HR-ANDROID-01 — Android environment audit
- **Product area / milestone / priority:** Platform / Android feasibility / P0
- **Status:** DONE
- **Dependencies:** Installed Mac Android Studio/SDK/JDK/emulator/adb state; official Capacitor 8 requirements
- **Requirement:** Record exact Android tools, platforms/images, selected Java and blockers without installing Android Studio or large SDK packages.
- **Acceptance:** Every runtime/build claim identifies actual tooling; missing requirements are explicit blockers.
- **Platform implications:** Determines Gradle-build/emulator evidence, never physical-device evidence.
- **Verification / evidence:** macOS 26.5.1 arm64 supports virtualization. Android Studio, SDK/tools/images, selected Java and Gradle are absent. SideQuest adb 35.0.1 is present but is not a development SDK and reports no device. Evidence: `.runtime/evidence/hr-mobile-platforms-20261004/android-environment.log`.
- **Relevant commits:** `f80042e`.

### HR-ANDROID-02 — Capacitor Android platform
- **Product area / milestone / priority:** Platform / Android feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-ANDROID-01; pinned Capacitor 8 family
- **Requirement:** Generate/sync the same production Angular application into an Android project, add repeatable build/sync/open/run scripts and keep native config free of a development URL.
- **Acceptance:** Core/CLI/iOS/Android/plugin versions are compatible; static config passes; Gradle/emulator evidence runs only where tooling permits.
- **Platform implications:** No second Angular application or web-only domain fork.
- **Verification / evidence:** `@capacitor/android` 8.5.2 is pinned; the generated project syncs the same production output with App/Filesystem/Haptics/Share and no `server.url`. Scripts build/sync/open/run the project. `./gradlew assembleDebug` is blocked by the absent JDK/SDK, so build/emulator claims remain unverified.
- **Relevant commits:** `f80042e`.

### HR-ANDROID-03 — Android compatibility baseline
- **Product area / milestone / priority:** Platform / Android feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-ANDROID-01/02 and official Capacitor/plugin requirements
- **Requirement:** Retain minSdk 24 unless an evidenced dependency requires higher; use Capacitor 8's supported compile/target SDK and document old/current/latest representative emulator coverage.
- **Acceptance:** Generated Gradle values and plugin minimums are recorded; testing on a newer image never silently raises the product minimum.
- **Platform implications:** Emulator and physical-device evidence remain separate.
- **Verification / evidence:** Generated values are minSdk 24, compile/target 36, AGP 8.13.0, Gradle 8.14.3 and Java 21. API 24/middle/API 36 emulator coverage is blocked by the missing toolchain/images; no minimum was raised.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-01 — Shared semantic haptic feedback
- **Product area / milestone / priority:** Interaction / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** Official Capacitor Haptics 8; existing owned Study/results presentation lifecycle
- **Requirement:** Add one semantic feedback port for selection, reveal, accepted rating, deal, session completion, genuine unlock, warning and real error. Native uses official Haptics; web is a safe no-op without desktop vibration.
- **Acceptance:** Components do not import Haptics directly; calls never delay saves/navigation; failures are swallowed safely; honest low ratings never use error feedback.
- **Platform implications:** iOS/Android invoke the same semantics; Mac/web no-op unless future evidence supports otherwise.
- **Verification / evidence:** `InteractionFeedback` and one official Capacitor driver map semantic cues to selection/light impact/success/warning/error. Web is a strict no-op; the adapter loads lazily, swallows and disables after failure. Unit mapping/suppression passes; native invocation and tactile quality remain pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-02 — Haptics setting and accessibility
- **Product area / milestone / priority:** Settings / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** HR-MOBILE-01; versioned Preferences migration
- **Requirement:** Persist an On/Off haptics preference, default on for supported native mobile platforms and fully suppress decorative tactile calls when off.
- **Acceptance:** Setting is independent from reduced motion, errors remain visually understandable, unsupported hardware is not retried repeatedly and web avoids irrelevant prominence.
- **Platform implications:** Compact touch/reflow, reload and platform-default behavior require separate evidence.
- **Verification / evidence:** Backward-compatible persisted `haptics` preference defaults on, is shown only when a native platform is detected, remains independent of reduced motion and suppresses every decorative call. Migration and settings persistence are unit/browser gated; native control and device behavior remain pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-03 — Coordinated Study feedback
- **Product area / milestone / priority:** Study / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** HR-MOBILE-01/02 and owned flip/confidence/deal/results lifecycle
- **Requirement:** Coordinate reveal, accepted confidence, deal, session completion and real unlock haptics with existing visual/audio milestones without independent drifting timers.
- **Acceptance:** Persistence and scheduling remain first; native-call failure cannot strand a transition; Practice/FSRS/reward boundaries remain unchanged.
- **Platform implications:** Web remains unchanged; native calls are lifecycle-aware and require device tuning later.
- **Verification / evidence:** Cues occur after successful reveal/review/practice persistence, after incoming-card settle, at live session completion and when a genuine persisted unlock card is revealed. Results replay/reopen/skip never rearms reward haptics; background lifecycle suppresses calls. Complete 160/160 browser motion regression passes; native invocation remains pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-04 — Mobile Session Complete presentation
- **Product area / milestone / priority:** Results / Mobile quality / P1
- **Status:** VERIFY
- **Dependencies:** Existing approved Results/Skip/Replay/unlock choreography; HR-MOBILE-03
- **Requirement:** Inspect mobile results, correct evidenced clarity/action issues and add native haptic milestones while preserving real metrics and Practice separation.
- **Acceptance:** Concise mobile layout, progressive reveal, accurate bars/unlocks, accessible Continue, reduced motion and Skip remain intact; no fabricated progress.
- **Platform implications:** Phone/tablet portrait/landscape and native haptic timing need distinct evidence.
- **Verification / evidence:** Existing progressive results/unlock choreography remains authoritative; action rows wrap at enlarged compact widths. Practice remains reward-free. Compact/large/landscape and reduced-motion browser gates pass; native haptic timing remains pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-05 — Native application and delivery contract
- **Product area / milestone / priority:** Release architecture / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** Confirmed platform targets and Capacitor direction
- **Requirement:** Document normal Xcode/TestFlight/App Store, Gradle/AAB/Play testing, Apple-silicon iOS-app-on-Mac delivery and shared Angular/native-service architecture. Intel Mac is not planned.
- **Acceptance:** Native-shell architecture is not described as a lesser website; store/signing resources remain uncreated.
- **Platform implications:** Version/build metadata and platform services remain narrow adapters.
- **Verification / evidence:** Architecture/readiness define Xcode/TestFlight/App Store, Gradle/AAB/Play testing, Apple-silicon iOS-app-on-Mac, shared Angular/native services and explicit non-authorisation of stores/signing.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-06 — App chrome and platform integration audit
- **Product area / milestone / priority:** Native shell / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** iOS and Android generated projects; official plugins
- **Requirement:** Audit splash/icon infrastructure, system bars, safe areas, edge-to-edge, keyboard, Android Back, orientation, lifecycle, share/picker and offline startup; fix safe in-scope configuration gaps.
- **Acceptance:** No final-branding claim for generated placeholders; Back preserves expected navigation; permissions remain minimal.
- **Platform implications:** Runtime-specific verification remains explicit.
- **Verification / evidence:** Generated icon/splash assets are explicitly placeholders; Android manifest uses expected orientation/keyboard/screen config, normal INTERNET, plugin-provided VIBRATE and FileProvider with no dangerous runtime permission. A lazy Android Back adapter applies shell navigation and cleans up. System-bar/edge-to-edge/keyboard/share/picker/offline runtime remain blocked.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-07 — Retrospective portability audit
- **Product area / milestone / priority:** Architecture / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** Existing major feature set and platform boundaries
- **Requirement:** Classify each requested major surface as portable, adapter-backed, native work/verification required or intentionally platform-specific; create debt only from evidence and repair small leaks safely.
- **Acceptance:** Every listed feature appears in the maintained matrix; no functioning code is rewritten for symmetry alone.
- **Platform implications:** Four-target evidence distinctions remain explicit.
- **Verification / evidence:** `docs/ios-readiness.md` classifies every requested surface. Safe fixes cover late native-listener cleanup and Android Back; evidenced native picker, bounded export/media, native storage/audio and confirmation-surface debt remains visible.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-08 — Web remains first class
- **Product area / milestone / priority:** Architecture / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** Shared Angular/domain architecture and lazy native adapters
- **Requirement:** Maintain one product/domain codebase, web behavior and the 850 kB initial-bundle ceiling while adding native platforms.
- **Acceptance:** Native plugins stay out of eager web startup where practical; web suites/build remain green; business logic has no platform forks.
- **Platform implications:** Apple-silicon Mac normally follows iOS/iPad implementation.
- **Verification / evidence:** Native services/plugins load lazily and domain rules remain shared. Unit/domain **145/145**, complete Chromium/WebKit/phone matrix **160/160**, and post-split settings regression **31/31** pass. Production build is **849.53 kB raw / 201.26 kB transfer**, below the unchanged ceiling.
- **Relevant commits:** `f80042e`, `3e37ac2`.

### HR-MOBILE-09 — Xcode blocker remains explicit
- **Product area / milestone / priority:** Evidence / Mobile quality / P0
- **Status:** BLOCKED
- **Dependencies:** Full Xcode 26+ installation by Will
- **Requirement:** Preserve blocked/unverified status for Simulator, WKWebView, Designed-for-iPad Mac, native persistence/files/haptics/accessibility until the actual toolchain exists.
- **Acceptance:** Exact installation requirement and evidence boundary remain visible while independent Web/Android work continues.
- **Platform implications:** No browser or mock substitutes.
- **Verification / evidence:** Command Line Tools only; accepted baseline logs retained.
- **Relevant commits:** `f6e4ffd`, `ada5a80`.

### HR-MOBILE-10 — Release readiness structure
- **Product area / milestone / priority:** Release architecture / Mobile quality / P1
- **Status:** DONE
- **Dependencies:** Shared product version and generated native projects
- **Requirement:** Define product version, iOS build number, Android versionCode and web release version plus development/local-native/beta/production environments without credentials or store resources.
- **Acceptance:** One authoritative product version can drive platform metadata; secrets remain outside Angular/native source.
- **Platform implications:** Signing, provisioning and store configuration remain future authorised work.
- **Verification / evidence:** `package.json` version 0.1.0 is authoritative; `native:version` writes iOS `MARKETING_VERSION` and Android `versionName`, while build number/versionCode remain independent integer inputs. Environments and non-secret/store boundaries are documented.
- **Relevant commits:** `f80042e`, `3e37ac2`.

### HR-PLAN-06 — Four-target platform matrix
- **Product area / milestone / priority:** Planning / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** HR-GOV-04/05, HR-ANDROID-01–03 and HR-MOBILE-01–10
- **Requirement:** Evolve the existing readiness matrix for Web, iOS/iPadOS, Android and Apple-silicon Mac across startup, persistence, Study, Focus, haptics, audio/effects/results, import/export/backup, offline, lifecycle, accessibility, layouts and distribution.
- **Acceptance:** Evidence uses IMPLEMENTED/BROWSER VERIFIED/EMULATOR VERIFIED/PHYSICAL DEVICE VERIFIED/BLOCKED/NOT APPLICABLE accurately; no competing matrix is created.
- **Platform implications:** Engine, emulator, Simulator, Mac and physical-device evidence remain distinct.
- **Verification / evidence:** The existing readiness document now contains one four-target compatibility/evidence matrix plus detailed historical browser/Apple evidence, with runtime and physical-device gaps kept distinct.
- **Relevant commits:** `f80042e`.

## Apple native feasibility — preserved accepted baseline

Source: Will's 4 October 2026 iOS-first and macOS-delivery-decision milestone. Native work remains local; publication, signing/provisioning, payments and cloud sync are outside scope.

### HR-NATIVE-01 — Apple development environment audit
- **Product area / milestone / priority:** Platform / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** Installed macOS/Xcode/Simulator and current official Capacitor requirements
- **Requirement / acceptance:** Record the actual Mac architecture, Node/npm, selected developer tools, Xcode/Simulator runtimes and existing Capacitor/native state before dependency or project generation. Missing mandatory tools remain explicit blockers rather than simulated evidence.
- **Platform implications:** Determines which iOS/macOS claims can be made; no automatic Xcode installation or global toolchain upgrade.
- **Verification / evidence:** macOS 26.5.1 (`arm64`, M1 Pro), Node 24.3.0, npm 11.4.2 and Command Line Tools 26.3 were recorded. `xcode-select` points to `/Library/Developer/CommandLineTools`; full Xcode, `xcodebuild`, `simctl` and Simulator runtimes are absent. Exact logs are under `.runtime/evidence/hr-apple-native-20261004/`.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-02 — Capacitor iOS baseline
- **Product area / milestone / priority:** Platform / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** HR-NATIVE-01; compatible pinned Capacitor core/CLI/iOS versions
- **Requirement / acceptance:** Add the smallest supported Capacitor configuration to the existing Angular build, generate one local iOS shell and automate web build/sync. Native build, Simulator launch and real HoloRecall interaction require installed Xcode evidence.
- **Platform implications:** Packaged WKWebView assets must use the production output without a development-server URL; generated artifacts remain reviewable and bounded.
- **Verification / evidence:** Xcode 26.6 built scheme `App` for the iOS 26.5 iPhone 17 Pro Simulator from the synced 849.53 kB production Angular output; install and command-line launch of `com.holorecall.app` succeeded. Logs and launch screenshot are under `.runtime/evidence/hr-apple-runtime-20261004/`. No signing team or development server was used.
- **Verification / evidence:** Stable Capacitor 8.5.2 plus official App 8.1.2, Filesystem 8.1.4 and Share 8.0.3 are pinned. The real Angular output is configured as `dist/holorecall/browser`; `cap add ios` generated the SPM iOS 15 project and `cap sync ios` copied the 13 MB production asset set with no `server.url`. Native compile/launch is blocked only by absent full Xcode; the exact `xcodebuild` failure is retained in runtime evidence.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-03 — Native smoke journey
- **Product area / milestone / priority:** Study / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-NATIVE-02 and an available Simulator runtime
- **Requirement / acceptance:** Exercise the actual WKWebView launch → Decks → Study/reveal/rate/next/results → Collection/Progress/History/Settings path, including former disappearing-card regression, themes, orientation, safe areas, keyboard, motion and valid local audio.
- **Platform implications:** Simulator evidence remains distinct from Playwright WebKit and physical-device verification.
- **Verification / evidence:** `NativeSmokeUITests.testPackagedStudyAndNavigationSmoke` passed on iPhone 17 Pro / iOS 26.5 after driving three reveal/rate/deal transitions, partial results, Collection, Progress and Settings. Run 3 passed in 32.706 s; two selector-development failures are retained. Theme/orientation/audio and broader screen evidence remain in progress.
- **Verification / evidence:** Repeatable WKWebView checklist prepared; no native build or runtime exists on this Mac, so no launch, interaction, audio, disappearing-card, screenshot or video claim is made. Chromium and Playwright WebKit remain regression evidence only.
- **Relevant commit:** `f6e4ffd` (shell/checklist); runtime evidence pending Xcode.

### HR-NATIVE-04 — Native persistence architecture spike
- **Product area / milestone / priority:** Data / Apple feasibility / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Existing `StudyPersistence` and media boundaries; candidate maintenance/security review
- **Requirement / acceptance:** Recommend transactional native structured storage and durable media storage. If a sufficiently supported candidate exists, prove isolated fixture create/write/relaunch/read/update/rollback/version behavior without changing production persistence or real data.
- **Platform implications:** Domain and scheduler remain storage-agnostic; Preferences/UserDefaults cannot hold the learning database.
- **Verification / evidence:** `StudyPersistence` is now injected while the default production provider remains the untouched IndexedDB `LocalDatabase`. SQLite/filesystem shape and candidate review are recorded in architecture/readiness. No official Capacitor SQLite exists; the strongest community candidate (`@capacitor-community/sqlite` 8.1.1) carries SQLCipher/export and unverified Catalyst concerns. The required native create/relaunch/read/update/rollback spike is blocked by Xcode and no SQLite package was adopted.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-05 — Data migration design
- **Product area / milestone / priority:** Data safety / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** HR-NATIVE-04; validated full-backup contract
- **Requirement / acceptance:** Specify and fixture-test an idempotent backup-first IndexedDB → native staged migration with count/hash/invariant verification, interruption recovery, rollback, deduplication and retained recovery data. Do not touch genuine learner storage.
- **Platform implications:** Protect every content, scheduling, reward, source-identity, media and administrative-history field across versions.
- **Verification / evidence:** A typed, production-unused migration staging contract validates the source, retains a hashed recovery backup, stages by deterministic fingerprint, reads back every State collection and media hash/count, activates only after verification, treats a completed fingerprint as idempotent and discards staging after injected interruption at backup/stage/verify/mark/activate. Fixture tests never open learner storage.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-06 — Native lifecycle adapter
- **Product area / milestone / priority:** Runtime / Apple feasibility / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Official Capacitor App plugin and existing `AppLifecycle`
- **Requirement / acceptance:** Feed native active/background events into the shared lifecycle contract while retaining browser signals. Verify timing, animations, Auto Advance, audio, accepted-review durability, deduplication and resume behavior where native execution is available.
- **Platform implications:** Components remain free of direct Capacitor calls; listeners are removed on destruction.
- **Verification / evidence:** Native UI automation is now available; background/resume acceptance is the next isolated test. Existing unit/browser evidence remains valid but does not close this native item.
- **Verification / evidence:** Official Capacitor App state, pause and resume events feed the existing `AppLifecycle` through a dynamically loaded adapter; listener handles are removed. Resume refresh now waits for queued commits, avoiding stale replacement of an accepted review. Unit tests cover event mapping/cleanup; actual background/foreground, audio, timer and transition behavior remains blocked on Simulator/device.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-07 — Native file import/export feasibility
- **Product area / milestone / priority:** Portability / Apple feasibility / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Existing `FileDelivery`; official Files/share APIs and picker-gap evaluation
- **Requirement / acceptance:** Prove or precisely design Apple Files/share workflows for APKG, portable ZIP, XLSX and full backup import/export. Generated exports must become user-accessible files; cancellation and invalid input must remain safe.
- **Platform implications:** Parsing/generation stays platform-neutral and no real collection is overwritten.
- **Verification / evidence:** Package generation remains platform-neutral. Native export dynamically writes the real bytes to Cache with official Filesystem, shares its `file://` URI with official Share and removes the temporary file on completion/failure; unit tests cover bytes, URI handoff and cleanup. Existing WKWebView file input is the no-new-dependency import candidate. Files picker, cancellation and reopening every generated format require Simulator/device evidence.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-08 — Native media feasibility
- **Product area / milestone / priority:** Media / Apple feasibility / P0
- **Status:** IN_PROGRESS
- **Dependencies:** HR-NATIVE-04; media resolver boundary
- **Requirement / acceptance:** Exercise or specify stable native references for images, WAV/MP3, backgrounds, frames and textures across reload/relaunch and Study transitions. Device paths cannot leak into portable card data.
- **Platform implications:** WKWebView display URLs are adapter-owned; Simulator audio is not physical speaker/interruption evidence.
- **Verification / evidence:** Stable `asset:` IDs and content hashes remain portable; proposed native Application Support bytes and transient `Filesystem.getUri`/`Capacitor.convertFileSrc` resolution are documented. Current eager data-URL hydration is an explicit scaling gap. No native image/audio/relaunch test can run without Xcode.
- **Relevant commit:** `f6e4ffd` (architecture only); runtime provider pending.

### HR-NATIVE-09 — Packaged offline startup
- **Product area / milestone / priority:** Offline / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-NATIVE-02/04 and Simulator availability
- **Requirement / acceptance:** Distinguish loaded-tab web offline from a terminated packaged app relaunching without network, studying local content, persisting a review and surviving another relaunch.
- **Platform implications:** No cloud dependency or service-worker substitution.
- **Verification / evidence:** With port 4200 stopped and no `server.url` in the generated Capacitor config, the installed app terminated/relaunched from packaged assets and restored its IndexedDB fixture (7 ready cards after three accepted reviews, down from 10). `.runtime/evidence/hr-apple-runtime-20261004/packaged-no-localhost-relaunch.log` and `iphone-no-localhost-relaunch.png` record the proof. Network-disabled launch and production native storage remain outstanding.
- **Verification / evidence:** Synced production assets contain no development-server URL and are suitable for packaged cold start, but terminate/offline/relaunch/study/read-back is unexecuted because no Simulator runtime exists.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-10 — Native accessibility and device UI audit
- **Product area / milestone / priority:** Accessibility / Apple feasibility / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Native shell and Simulator accessibility controls
- **Requirement / acceptance:** Audit safe areas, orientation, software keyboard, larger text implications, touch/focus, reduced motion, themes, scrolling and dialogs inside the shell. VoiceOver remains unverified unless actually exercised.
- **Platform implications:** Retain Material 3 identity and avoid unnecessary UIKit imitation.
- **Verification / evidence:** Generated project targets iPhone and iPad in portrait/landscape and the web UI retains safe-area, reflow, touch, keyboard and reduced-motion safeguards. Native safe-area, software-keyboard, Dynamic Type, VoiceOver and WKWebView modal/scroll evidence is blocked by the missing runtime.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-11 — Entitlement/purchase readiness check
- **Product area / milestone / priority:** Entitlements / Apple feasibility / P1
- **Status:** DONE
- **Dependencies:** Existing central capability policy
- **Requirement / acceptance:** Confirm native seams cannot bypass product access and that future verified Apple ownership/restore can be adapted without changing learning or cosmetic state. No StoreKit, product IDs or transactions.
- **Platform implications:** Universal-purchase and commercial policy remain product decisions.
- **Verification / evidence:** Native platform adapters contain no entitlement decisions and do not mutate learning/cosmetic state. Future verified Apple ownership must enter only through `CAPABILITY_POLICY`; current `development-unverified` access remains non-enforcing. No StoreKit/product IDs/transactions were introduced, and recovery/export access remains independent.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-12 — Privacy and permission inventory
- **Product area / milestone / priority:** Privacy / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** Every native dependency selected in this milestone
- **Requirement / acceptance:** Record version, purpose, native APIs, permissions, plist and privacy-manifest implications, and platform support. Request no unnecessary permission and add no analytics/tracking.
- **Platform implications:** Inventory must match generated native dependencies and official Apple/Capacitor requirements.
- **Verification / evidence:** Exact dependency inventory is in `ios-readiness.md`. Filesystem's required `NSPrivacyAccessedAPICategoryFileTimestamp` / `C617.1` declaration is committed in `PrivacyInfo.xcprivacy`; App and Share document no runtime permission/usage-description need for this scope. No Photos, microphone, tracking or analytics permission was added. Final Xcode privacy report remains pending.
- **Relevant commit:** `f6e4ffd`.

### HR-MAC-01 — macOS delivery decision
- **Product area / milestone / priority:** Platform / Apple feasibility / P0
- **Status:** IN_PROGRESS
- **Dependencies:** HR-NATIVE-01/02/04/07 and Apple distribution/runtime evidence
- **Requirement / acceptance:** Evaluate iOS/iPad app on Apple-silicon Mac, Mac Catalyst and a dedicated-wrapper option; run only legitimate local spikes. Recommend one first-release route with explicit hardware, file, window/input, purchase, maintenance and testing limitations. Intel/alternate-runtime scope requires product approval.
- **Platform implications:** Capacitor itself is not represented as a supported macOS target.
- **Verification / evidence:** Xcode exposes the arm64 `My Mac` destination with variant `Designed for [iPad,iPhone]`; the project has `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD=YES`, Catalyst disabled and iOS 15 deployment. Compile/run evidence remains in progress; unsigned compilation alone will not be counted as launch proof.
- **Verification / evidence:** Decision 008 recommends the same iPad-capable iOS application on Apple-silicon Macs as the first candidate because it minimizes runtime and adapter duplication. It remains gated by `My Mac (Designed for iPad)` resizing/keyboard/pointer/files/storage/plugin tests. Catalyst is deferred because Capacitor does not support it and cannot be built here; a dedicated wrapper is deferred unless Intel support or desktop acceptance later requires it. Final product approval and executable Mac evidence remain pending.
- **Relevant commit:** `f6e4ffd`.

### HR-PLAN-05 — Apple platform readiness matrix
- **Product area / milestone / priority:** Planning / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** HR-NATIVE-01–12 and HR-MAC-01 evidence
- **Requirement / acceptance:** Maintain separate implementation/browser/Simulator/physical-device/distribution evidence for startup, Study, persistence, media/audio, import/export, backup, lifecycle, offline, accessibility, input, entitlements and signing.
- **Platform implications:** WebKit tests never count as WKWebView or physical-device evidence.
- **Verification / evidence:** `docs/ios-readiness.md` now separates web implementation, Chromium, Playwright WebKit, iOS architecture, Simulator, physical device, macOS route and distribution evidence across every requested capability. Blocked and untested cells remain explicit.
- **Relevant commit:** `f6e4ffd`.

## Preserved completed history

The detailed acceptance evidence for these items remains in `docs/project-status.md`, `docs/architecture.md`, `docs/ios-readiness.md`, and `docs/anki-import.md`. They retain their original stable IDs and are not reopened by this milestone.

| IDs | Area | Status | Evidence / commits |
| --- | --- | --- | --- |
| HR-UX-01–15, HR-AUTH-01, HR-DESIGN-02, HR-GAME-01 | Study, motion, authoring and collection presentation | DONE | Evidence matrix in `project-status.md`; checkpoints through `5bdf7a4`. |
| HR-IOS-01–06 | Cross-platform web readiness | DONE for documented browser scope | Readiness matrix in `ios-readiness.md`; native gaps remain explicit. |
| HR-GOV-01–02 | Charter and agentic delivery | DONE | Charter integration and real delegate review at `958060f`–`d5d0c89`. |
| HR-IMPORT-01 / 01A–C | Bounded Anki import, worker, audio and mapping | DONE for documented compatibility subset | `anki-import.md`; implementation `52e60f7`, acceptance `3c1246b`, handoff `d5d0c89`. |
| HR-COM-01 | Non-enforcing entitlement seam | DONE | Development policy tests and architecture decision; no payment enforcement. |
| HR-PLAN-01 | Capability matrix | DONE | Capability matrix in `product-brief.md`; this milestone was its accepted next recommendation. |
