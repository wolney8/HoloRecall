# Canonical work-item tracker

Updated: 30 September 2026. This file is the canonical local execution tracker. The product charter sets direction, `product-brief.md` records long-range capability coverage, and `project-status.md` is the current restart handoff. GitHub Issues are not in use; if introduced later, they must mirror this tracker rather than form a second source of truth.

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

## Active milestone — Study configuration, history and Anki normalization

All items below originate from Will's 1 October 2026 milestone. The lead owns schema, scheduler contracts and integration. Official comparison sources are the current Anki Manual deck-options, studying, preferences, browsing and packaged-deck pages; these define comparison points, not a requirement to copy Anki's interface.

### HR-STUDY-01 — Reusable HoloRecall study presets
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Schema migration; FSRS adapter
- **Requirement / acceptance:** Stable named presets with built-ins, create/duplicate/rename/edit, deck assignment/usage, safe defaults and referenced-delete protection; deck exceptions and today-only limits stay separate.
- **Platform implications:** Platform-neutral resolution, compact Material 3 UI, keyboard/touch/200% reflow.
- **Verification / commits:** Pending implementation and inheritance/browser evidence.

### HR-STUDY-02 — Daily workload and hierarchy limits
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** HR-STUDY-01; hierarchy-aware queue
- **Requirement / acceptance:** New/review limits, new-after-review-limit policy, per-deck and today-only overrides, deterministic parent/subdeck caps and honest limited-work explanations without history mutation.
- **Platform implications:** Local-day/DST behavior remains platform-neutral and interruption safe.
- **Verification / commits:** Pending queue/inheritance tests.

### HR-STUDY-03 — Supported FSRS settings
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Installed `ts-fsrs` 5.4.2 capabilities
- **Requirement / acceptance:** Desired retention and maximum interval are honored; learning/relearning steps are exposed only where correct; optimisation exists only if a trustworthy supported implementation is present, with explicit apply/recovery.
- **Platform implications:** Pure domain configuration; no imported parameters or native divergence.
- **Verification / commits:** Pending library/API review and fixed-clock scheduler tests.

### HR-STUDY-04 — Preserve five-confidence grading
- **Product area / milestone / priority:** Study / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Existing Study renderer and scheduler adapter
- **Requirement / acceptance:** Retain 1/2/3/4/5 → Again/Hard/Good/Good/Easy with original ratings, labels/help, save-gated effects and timing; no fifth FSRS grade.
- **Platform implications:** Preserve keyboard, touch, reduced motion and fixed Study geometry.
- **Verification / commits:** Existing mapping regression plus full Study journeys.

### HR-STUDY-05 — Deterministic queue and display order
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** HR-STUDY-01/02; stable new-card position
- **Requirement / acceptance:** Supported gather/sort, new-versus-review and review due/random/retrievability orders alter only the persisted queue; animations follow it. Deterministic tests cover every option.
- **Platform implications:** Platform-neutral randomness injection and reload recovery.
- **Verification / commits:** Pending.

### HR-STUDY-06 — Siblings, burying and suspension
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Stable source note/template sibling identity
- **Requirement / acceptance:** Configurable sibling burying, manual bury/unbury and persistent suspend/unsuspend remain distinct from archive. Reversed/cloze siblings survive import/reimport and statuses appear in management filters.
- **Platform implications:** Day-boundary/DST persistence and accessible bulk controls.
- **Verification / commits:** Pending sibling/import/reload tests.

### HR-STUDY-07 — Lapses and leech management
- **Product area / milestone / priority:** Scheduling / Study configuration / P1
- **Status:** IN_PROGRESS
- **Dependencies:** Review history; HR-STUDY-03/06
- **Requirement / acceptance:** Real failures drive configurable attention threshold and optional suspend action; default flags only. No rarity, entitlement or punitive-low-confidence coupling.
- **Platform implications:** Pure event-derived policy; visible recovery on all layouts.
- **Verification / commits:** Pending.

### HR-STUDY-08 — Reviewer preferences
- **Product area / milestone / priority:** Study / Study configuration / P1
- **Status:** IN_PROGRESS
- **Dependencies:** Existing audio, timing and confidence controls
- **Requirement / acceptance:** Remaining-count and predicted-interval visibility, audio autoplay/stop behavior, recorded-answer cap and optional visible timer preserve scheduling and active-time semantics. Auto Advance stays BACKLOG unless safely compatible; Easy Days is evidence-gated.
- **Platform implications:** Audio/lifecycle cleanup, reduced motion, touch, future native interruption.
- **Verification / commits:** Pending.

### HR-HIST-01 — Truthful card review history
- **Product area / milestone / priority:** History / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Immutable review/reversal events
- **Requirement / acceptance:** Collection/management exposes concise review history with persisted time, confidence, grade, state, interval/due changes, timing and FSRS values; missing historical values say unavailable.
- **Platform implications:** Bounded rendering, semantic table/timeline and compact reflow.
- **Verification / commits:** Pending.

### HR-HIST-02 — Safe scheduling administration
- **Product area / milestone / priority:** History / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Versioned administrative events and atomic store operations
- **Requirement / acceptance:** Set due, suspend, bury, reset/forget and meaningful new-card reposition operations are confirmed, atomic and history-preserving. Administrative events never count as recall or rewards.
- **Platform implications:** Durable reload/recovery and touch/keyboard confirmation.
- **Verification / commits:** Pending.

### HR-HIST-03 — Scheduling-state and history filters
- **Product area / milestone / priority:** History / Study configuration / P1
- **Status:** IN_PROGRESS
- **Dependencies:** Existing library index and Progress date filters
- **Requirement / acceptance:** Extend the current index for new/learning/review/due/overdue/suspended/buried/attention/recently reviewed; add date-filtered history without a second search system.
- **Platform implications:** Worker-safe reconstructable fields and compact filter disclosure.
- **Verification / commits:** Pending.

### HR-IMPORT-02 — Normalize Anki content into HoloRecall study
- **Product area / milestone / priority:** Import / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** HR-STUDY-01; existing stable source identities
- **Requirement / acceptance:** Preview selects a HoloRecall preset and states that Anki learning history is excluded. New imports enter native New state; reimport preserves HoloRecall state/history/rewards. No Anki scheduling, options, parameters or AnkiWeb data are adopted.
- **Platform implications:** Worker conversion stays content-only and platform-neutral.
- **Verification / commits:** Pending import→study→reimport tests.

### HR-PLAN-02 — Study-settings capability matrix
- **Product area / milestone / priority:** Planning / Study configuration / P0
- **Status:** IN_PROGRESS
- **Dependencies:** Current official Anki Manual and implemented evidence
- **Requirement / acceptance:** Classify every requested settings/history capability as DONE/PARTIAL/PLANNED/NOT APPLICABLE/NOT PLANNED. Record **AnkiWeb Sync — NOT PLANNED** and keep future HoloRecall sync separate.
- **Platform implications:** Evidence must distinguish web, WebKit and native verification.
- **Verification / commits:** Pending roadmap/import documentation update.

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
