# Project status and durable handoff

Updated: 3 October 2026. Branch: `main`. Baseline commit: `bb475eb` (`Build local HoloRecall study prototype`). Visual milestone checkpoint: `f7ed8d7`; HR-UX-07–11 implementation checkpoint: `268fd78` (`Polish study and results motion`). Nothing has been pushed or deployed.

## Current durable handoff

### 3 October 2026 Study Settings continuation recovery

- **Recovered state:** `main` at clean checkpoint `69f129d`; schema 5, accepted Anki defect fixes and existing Study/history implementation are intact. No reset, IndexedDB clearing or learner-data mutation occurred.
- **Implemented:** HR-STUDY-02 now rebuilds same-day usage from persisted owning-deck/ancestry, selected-root, learner-day and time-zone attribution. Selected parents cap aggregate work, every applicable intermediate/leaf branch caps its descendant contribution, direct-child Study excludes unrelated ancestors/branches, and new/review ledgers remain distinct. Candidates discarded by the root cap do not consume branch allowance. Legacy events retain a conservative card/deck fallback.
- **Acceptance corrections:** a true safe-default preset creation action, bounded deck-assignment rendering, visible today-only apply/clear state, learner-time-zone history filtering, expired automatic-bury filtering, due-filter eligibility, rating-time audio stop, reversible automatic leech suspension and stable sequential bulk repositioning close the independent review findings.
- **Checks:** unit/domain **119/119 passed**; production build passes at **852.98 kB initial / 195.10 kB estimated transfer**, 2.98 kB above the unchanged 850 kB warning ceiling and tracked as HR-PERF-01. The final corrected scheduler passed the complete desktop matrix **120/120** and WebKit compact/large/landscape **18/18**. One earlier focused preset run required a selector-only rerun after the new creation field made the locator ambiguous; no product flake, skip or timeout change occurred.
- **Manual acceptance:** HR-ACCEPT-ANKI-01 remains `VERIFY — PENDING MANUAL USER VERIFICATION` for Will's exact package. It is not represented as automated evidence and does not block the completed Study implementation.
- **Delegation:** the lead owned scheduler semantics, schema and integration. Two bounded read-only delegates reviewed daily hierarchy limits and the remaining Study/history acceptance surface. The final reviewer found intermediate-branch and bounded-selection defects; both are fixed and independently rechecked. Nonblocking assertion hardening is retained as HR-TEST-01.
- **Checkpoint:** implementation commits `4df9d61` and `cb2bbce`; final documentation checkpoint follows this handoff. The local server remains available at `http://127.0.0.1:4200/`.
- **Exact next action:** stop at the completed milestone. The recommended next bounded product milestone remains custom study and focused practice controls; HR-PERF-01 should recover bundle headroom alongside the next safe route/chunk change. Do not begin either automatically.

### 3 October 2026 defect-recovery final handoff

- **Branch/checkpoint:** `main` at implementation commit `0687816`; nothing is pushed or deployed.
- **Requirement state:** HR-BUG-ANKI-01, HR-BUG-ANKI-02 and HR-BUG-STUDY-01 are `DONE` in the canonical tracker. Recovery and destructive checks used isolated browser fixtures; no IndexedDB clearing, reset or mutation of Will's imported decks/reviews occurred.
- **Delivered:** semantic Anki conversion outcomes and compact disclosures; safe TTS/filter simplification; hyperlink/resource distinction; required-prompt validation; aggregate parent journeys with scoped subdecks; parent/child Study semantics; content-format v4 hierarchy/sibling portability; and generation-owned, fail-visible Study deal animations.
- **Checks:** unit/domain **104/104 passed**; production build succeeded at **850.03 kB initial / 194.34 kB estimated transfer** with a 33-byte budget warning; the updated animation-enabled defect suite passed **8/8**; complete Chromium/WebKit desktop passed **118/118** in 6.1 minutes; WebKit compact/large/landscape passed **18/18** after a real 200%-text import-summary overflow was fixed and the complete phone matrix rerun. No skips, retries or timeout increases.
- **Evidence:** durable screenshots and Chromium/WebKit recordings are under `.runtime/evidence/hr-anki-defects-20261003/`. They cover classified import preview, imported hierarchy and consecutive visible imported-card transitions.
- **Platform boundary:** Playwright WebKit is engine evidence only. Safari, WKWebView, VoiceOver, simulator, physical iPhone and native macOS packaging remain unverified.
- **Interrupted Study Settings state:** schema-5 presets/history/import-normalisation work at `91800ea` plus preserved follow-up UI/tests now passes the complete regression gate. HR-STUDY-02 is moved back to `VERIFY` because recovery review found global completed-today counting can consume an unrelated selected deck's cap and per-child counters do not yet seed earlier same-day sessions. Other documented deferred capabilities remain unchanged.
- **Exact next action:** correct and test HR-STUDY-02 selected-branch/repeated-session daily-limit accounting. Do not begin another milestone.

### 3 October 2026 defect-recovery checkpoint

- **Recovered branch/state:** `main` at `91800ea` with the interrupted Study Settings follow-up changes preserved in the working tree. No reset, storage clearing or learner-data mutation was performed. The local Angular server is retained on port 4200.
- **Priority scope:** HR-BUG-ANKI-01, HR-BUG-ANKI-02 and HR-BUG-STUDY-01 are recorded `IN_PROGRESS` in the canonical tracker before implementation. Broader Study Settings work is paused until these defects have evidence-backed fixes.
- **Interrupted milestone state:** the schema/domain/settings/history implementation is checkpointed in `91800ea`; follow-up UI, browser-test and documentation changes remain uncommitted. Existing tracker entries currently say DONE based on prior focused evidence, but final full-suite reconciliation was interrupted and must be retained honestly.
- **Known interrupted regression evidence:** the prior desktop Chromium/WebKit run exposed failures in full-backup restore, uploaded-design backup and page-reveal inventory. These remain open integration checks; they are not being discarded while the three reported Anki defects take priority.
- **Delegation:** two bounded read-only investigations cover Anki warning/hierarchy conversion and Study presentation lifecycle. The lead owns tracker state, shared schemas, integration and final acceptance.
- **Exact next action:** reproduce the observed TTS/URL classifications, imported hierarchy flattening and multi-card disappearance with isolated Anki-derived fixtures; then implement minimal shared fixes and targeted evidence before resuming broader milestone reconciliation.

### 3 October 2026 defect implementation batch

- **Requirement state:** HR-BUG-ANKI-01, HR-BUG-ANKI-02 and HR-BUG-STUDY-01 are `VERIFY`. None is marked DONE until the complete regression gate finishes.
- **Import fix:** conversion now records normal/simplified/excluded/unsafe card outcomes, keeps occurrence details separate, renders semantic Material states and requires acknowledgement only for excluded/unsafe cards. Supported Anki TTS/filter/type-answer constructs retain inert field text. Anchor `href` values are not remote dependencies; resource-bearing remote elements remain unfetched warnings. Missing required image-only prompts are excluded instead of becoming empty cards.
- **Hierarchy fix:** genuine fixture inspection showed the importer already produced stable parent relationships. Dashboard/Decks had flattened all levels and mixed direct card totals with recursive ready counts. They now show aggregate top-level journeys with expandable branch-scoped subdecks. Portable content format v4 carries parent and sibling IDs; v1–v3 remain readable.
- **Study fix:** the outgoing stage animation's uncancelled `fill:forwards` reasserted opacity 0 after the incoming animation ended. Deal animations are now explicitly owned and cancelled on every settlement/interruption path. The new current card remains fail-visible.
- **Checks so far:** full unit/domain **104/104 passed**; production build passed at **849.96 kB initial / 194.26 kB estimated transfer**; dedicated animation-enabled Chromium/WebKit defect suite **6/6 passed**. Previously interrupted JSON restore, design-backup version and page-reveal inventory regressions were corrected and reran **6/6** across both engines.
- **Visual evidence:** `test-results/anki-defects-HR-BUG-ANKI-0-27152-remote-media-and-safe-links-{chromium,webkit}/`, `test-results/anki-defects-HR-BUG-ANKI-0-d0377-urneys-with-scoped-subdecks-{chromium,webkit}/`, and `test-results/anki-defects-HR-BUG-STUDY--bfd76-le-visible-after-every-deal-{chromium,webkit}/` contain recordings and screenshots.
- **Exact next action:** run the complete desktop and phone-profile browser regressions, fix any material failures without weakening assertions, then update requirement status/evidence and checkpoint the defect recovery.

### Study configuration/history milestone recovery

- **Recovered state:** `main` is clean at accepted checkpoint `8a36388`; Angular 21.2.24, Material/CDK 21.2.14, `ts-fsrs` 5.4.2 and schema 4 are installed. Existing Study, import, organisation, media, rewards and portability behavior is preserved. The local server was retained on port 4200.
- **Tracked scope:** HR-STUDY-01–08, HR-HIST-01–03, HR-IMPORT-02 and HR-PLAN-02 are recorded `IN_PROGRESS` in the canonical tracker before implementation. HR-ORG-06 is now `DONE` after its requested dedicated measurements.
- **Delegation:** the lead owns schema/scheduler/event contracts and integration. Two read-only delegates are reviewing the current official Anki comparison/scheduler surface and the existing Material 3 settings/history UX boundaries.
- **Official baseline:** current Anki documentation confirms reusable presets; preset/deck/today-only limits; selected-parent versus child limit semantics; FSRS desired retention (default 0.90), maximum interval, short sub-day learning/relearning guidance, retrievability ordering, sibling burying, audio/timers and administrative browser operations. It also warns against copying parameters and treats higher retention as higher workload. HoloRecall will implement only semantics supported by its own model/library.
- **HR-ORG-06 closure:** Vitest on Node 24.3/macOS measured 10k index 729.2 ms, query 6.6 ms, import-to-index 788.8 ms, atomic 10k mutation 19.1 ms, media-registry construction 17.3 ms and 10k map resolutions 114.2 ms; 11 targeted tests passed. Budgets remain evidence-based local regression limits.
- **Schema/domain batch:** schema 5 migrates v1–v4 data without deleting reviews/rewards and adds stable reusable Study presets, direct deck/today overrides, per-card bury/leech/position controls, sibling identity and distinct administrative history. FSRS settings resolve per home deck and review events snapshot preset ID/parameters. Queue policies cover daily category-aware caps, descendant decks, supported new/review orders, deterministic random order, retrievability order and sibling burying. Anki reimport preserves native progress/management fields and new imports select a HoloRecall preset.
- **UI batch:** Settings now exposes M3 preset, workload, FSRS, order, sibling/leech and reviewer-preference controls with progressive disclosure. Collection and Progress expose persisted review/management history; Collection provides set-due, reset, bury and suspend operations. Study honours remaining-count, predicted-timing, visible-timer and audio preferences. Library filters include overdue, suspended, buried, leech and recently reviewed.
- **Checks:** the complete Vitest suite passes (11 files, 98 tests); production build succeeds with one initial-bundle budget warning (858.89 kB versus 850 kB) before lazy-loading refinement. Browser acceptance remains pending.
- **Exact next action:** checkpoint this implementation, lazy-load the settings feature to clear the bundle warning, then run focused Chromium/WebKit interaction checks and reconcile documentation/evidence.

- **Recovered state:** `main` was clean at accepted checkpoint `d5d0c89`; Angular 21.2.24, Material/CDK 21.2.14, TypeScript 5.9.3 and the previously verified schema-3 features are present. The local server remained available on port 4200.
- **Active requirements:** HR-GOV-03 is `IN_PROGRESS`; HR-ORG-01–07 and HR-MEDIA-01 are recorded as `PLANNED` in the canonical `docs/work-items.md` before implementation.
- **Delegation:** the lead owns tracker state, shared contracts, migrations, integration and commits. Two bounded read-only delegates are inspecting data/index/media architecture and organisation UI/platform acceptance.
- **Preservation boundary:** no data reset, dependency change, package installation or application mutation occurred in recovery. Existing learning content, media, reviews, rewards, imports, designs and portability remain intact.
- **Exact next action:** checkpoint the canonical tracker/guidance, then implement the platform-neutral library query/index contract and compatible organisation/media model in one tested batch.

### Search/data foundation batch

- **Branch/checkpoint:** `main` after tracker commit `e0f739c`; current organisation/media implementation is uncommitted at this handoff point.
- **Implemented:** schema 4 hierarchy/archive fields; Unicode/accent-insensitive platform-neutral library index and combined filters; a lazy local Worker boundary; stable 60-card result slices shared by Decks and Collection; atomic bulk move/tag/presentation/archive operations; SHA-256 media registry, deduplication and safe reference accounting; IndexedDB v2 media payload separation so routine reviews write metadata without rewriting bytes.
- **Checks:** focused library/media/migration/persistence **17/17 passed**; full unit/domain **83/83 passed**. Production build completed at **819.76 kB initial / 185.14 kB estimated transfer** with one 19.76 kB budget warning that must be resolved or deliberately re-budgeted. The measured 10,000-card Node fixture indexed in **777.8 ms** and answered a combined search/tag query in **10.9 ms**.
- **Known issues:** browser fixture helpers are being migrated to IndexedDB v2; portable hierarchy metadata, browser interactions, themes/reflow, 1,000-card measurements and Chromium/WebKit evidence remain unfinished. Media bytes are separated in web IndexedDB, but native durable media remains a future adapter.
- **Exact next action:** complete persistence/browser fixture migration and portable-format compatibility, then exercise the new organisation flows in Chromium and WebKit before moving work items to `VERIFY`.

### Organisation integration checkpoint after editor recovery

- **Branch/checkpoint:** `main` at `c4095fe`; the recovered working tree contains the bounded organisation UI, hierarchy, archive semantics and browser-fixture compatibility changes. No reset or storage-clearing action was used after the VS Code interruption.
- **Implemented:** Deck and Collection share the indexed query state; desktop and compact search support direct result navigation and keyboard selection; combined filters and explicit clearing persist across those views; 60-item slices bound rich rendering; bulk move/tag/rarity/design/finish/archive actions preserve learner state; imported `Parent::Child` deck paths become validated hierarchy records; archived content is excluded from scheduled queues and reports.
- **Checks:** full unit/domain suite **84/84 passed** and the production build completed on 30 September 2026. The initial bundle is **824.81 kB raw / 186.05 kB estimated transfer**; XLSX, ZIP, SQLite and Anki conversion remain lazy chunks. The warning ceiling is intentionally adjusted to 850 kB from this observed feature baseline rather than hiding a production error.
- **Interruption note:** the earlier 119-test browser run was terminated by the editor crash and is not counted as a completed check. A fresh uninterrupted Chromium/WebKit run is required.
- **Exact next action:** checkpoint the recovered implementation, run the complete browser matrix serially, fix any regression, then reconcile the tracker, capability matrix, architecture and readiness evidence.

### Independent-review correction batch

- **Branch/checkpoint:** implementation checkpoint `20d36bf`; corrections after the independent read-only acceptance review are uncommitted at this handoff line.
- **Corrected:** media hashes are recomputed from bytes before import/restore/deduplication; identical incoming assets deduplicate within the same bundle; Design Studio reuses the retained stable asset ID; ordinary state commits compare metadata keys and do not hydrate or rewrite unchanged payloads. Parent-deck study includes descendants, archived/suspended ancestors consistently hide descendants from Study and the library, the attention filter now uses the latest five active reviews, inactive lifecycle state cannot start a new index build, and large libraries fail visibly if Worker support is absent.
- **Organisation UI:** removable active-filter chips and a full Collection filter disclosure make shared query state visible in both library surfaces. The search input now exposes combobox/listbox ownership and its active descendant.
- **Checks:** unit/domain **88/88 passed** and production build passed at **827.98 kB raw / 188.50 kB estimated transfer**. The first complete browser run after recovery produced **112/119 passed**; all seven failures were investigated. Six were resolved and passed in the focused two-engine rerun; the last WebKit bulk test exposed an ambiguous duplicate-row locator and then passed after targeting the original card by its content. No timeout was increased.
- **Independent review:** the lead accepted and fixed the two high-severity hash/write issues plus same-bundle dedupe, hierarchy/archive, attention, lifecycle, filter-chip and combobox findings. Portable workbook hierarchy/archive fields and broader 10k mutation/media measurements remain explicit limitations for final scope reporting.
- **Exact next action:** checkpoint these corrections, reconcile tracker/architecture/capability/readiness documents, run the fresh full browser suite, then capture final animation-enabled organisation evidence.

### Search, organisation and scalable media final handoff

- **Branch/commits:** `main`; governance `e0f739c`, foundation `c4095fe`, integrated UI/tests `20d36bf`, independent-review corrections `7f7cf3c`, final evidence `c9f7f23`. Nothing is pushed or deployed.
- **Requirement state:** HR-GOV-03, HR-ORG-01–05, HR-ORG-07 and HR-MEDIA-01 are `DONE` with linked evidence in `docs/work-items.md`. HR-ORG-06 remains `VERIFY`: 1k/10k index/query and bounded-render baselines exist, while 10k all-selection mutation, media-resolution and import-to-index latency still need dedicated measurement.
- **Delivered:** accent-insensitive offline search; direct deck/card/tag navigation; shared removable filters and sorting across Decks/Collection; canonical tag rename/bulk changes; validated deck hierarchy and parent study; non-destructive archive; atomic bulk move/tag/rarity/design/finish actions; bounded premium Collection rendering; SHA-256 media dedupe/reference-safe cleanup; split IndexedDB metadata/payload stores without routine byte rewrites.
- **Checks:** unit/domain **88/88 passed**; production build passed at **827.98 kB raw / 188.50 kB estimated transfer**; final stable Playwright run **119/119 passed** in **3.1 minutes** with no skips. A prior 118/119 run found a real lazy-Collection assertion race; the assertion now waits for the owned collection rows and passed in both engines before the stable full rerun. No timeout was increased.
- **Performance:** Node 24.3/macOS observed 1k under the 500/100 ms index/query test budgets and 10k at **777.8/10.9 ms**. Final browser observations: Chromium **1,985/47 ms**, WebKit **1,096/55 ms** for 10k index+render/query+render. These are local desktop baselines, not service-level promises.
- **Visual evidence:** animation-enabled search and filter/navigation recordings for Chromium and WebKit are under ignored `test-results/organisation-HR-ORG-01-*/video.webm` and `test-results/organisation-HR-ORG-02-*/video.webm`.
- **Historical limitation at this checkpoint:** deck-content format v3 flattened hierarchy; the 3 October defect-recovery work supersedes this with format v4 parent/sibling portability while keeping v1–v3 readable. Archive/creation metadata remains full-backup only. Initial web load still hydrates registered media into memory. Native storage, Safari/WKWebView, simulator/device, VoiceOver and macOS packaging remain unverified.
- **Recommended next bounded milestone:** study configuration and review-history management: per-deck queue options with clear precedence, searchable event/correction history and bounded custom-study/practice controls. Do not start it without a new authorization.
- **Exact restart point:** HR-ORG-06 evidence expansion is the only unfinished item in this milestone. For product work, begin from the recommended bounded milestone after authorization; preserve the local search/media contracts and content-format limitation above.

## Charter, import and entitlement milestone tracker

| ID | Status | Acceptance evidence | Remaining issue / exact next action |
| --- | --- | --- | --- |
| HR-GOV-01 | Complete | Charter is authoritative; root guidance links maintained records and applies proportional learning/UI/web+iOS+macOS/portability/entitlement and layout gates. Both repository skills validated and were exercised against the changed import UI/data path. | Keep the capability and platform evidence current. |
| HR-GOV-02 | Complete | Two native Codex delegates performed independent read-only import-integrity/security and UI/platform reviews. The lead fixed binary audio detection, side leakage, Worker lifecycle/path, mapping signature, nested control, 200% layout, entitlement and documentation findings. Shared schema/dependencies/integration stayed lead-owned. | No open important delegate finding; final suite remains lead-owned. |
| HR-IMPORT-01A | Complete for documented local-web scope | A typed lazy Worker owns the existing parser's ZIP/zstd/SQLite/WASM/conversion/media path, honest stages/counts, unique jobs, stale-result suppression, termination and a 45-second deadline. Production emits `worker-UC4EKNLH.js`; both engines keep a 16 ms heartbeat moving and cancel a 10,000-card/249,606-byte package without mutation. | Native URI cancellation and memory-pressure profiling remain pending. |
| HR-IMPORT-01B | Complete for documented local-web scope | Side-specific MP3/WAV refs, durable local assets, explicit accessible controls, editor replacement, lifecycle cleanup, schema-3 migration, ZIP/XLSX/full-backup recovery and real MP3 playback-event checks pass in Chromium/WebKit. | Listening quality, codec/device coverage and native audio interruption remain unverified. |
| HR-IMPORT-01C | Complete for documented local-web scope | Compact mapping disclosure covers front/answer/pronunciation/meaning/notes/media. Named v1 presets use exact canonical field/template/cloze signatures and save atomically; a changed-signature domain check proves incompatible presets are not applied. | Advanced/script templates remain explicitly unsupported. |
| HR-COM-01 | Complete | Central stable capability IDs and allow-all `DevelopmentCapabilityPolicy` are exercised by Import and Design Studio. Isolated policy tests verify unavailable handling and unchanged learning state. It is labelled unverified development access and implements no payment or restriction. | Provider/purchase/restore/refund/offline choices remain future decisions. |
| HR-PLAN-01 | Complete | The product brief now contains a category-spanning stable capability matrix with actual status, evidence/platform scope, acceptance, dependencies and explicitly proposed classifications; Anki import/export, HoloRecall exchange and full backup remain separate. | Keep it current; next recommended bounded milestone is search/organisation/scalable local media indexing. |

### Charter adoption handoff

- Branch/commit: `main` at `958060f`; prior application handoff `5bdf7a4`. The only subsequent change is this tracker reconciliation. Nothing is pushed or deployed.
- Governance: `docs/HoloRecall_Product_Charter_v1.md` now records adopted status and the actual bounded handoff. `AGENTS.md` links the authoritative sources and standing review gates.
- Skills: `.agents/skills/holorecall-ui-platform-acceptance` and `.agents/skills/holorecall-import-integrity` both pass the installed Codex `quick_validate.py`. Their workflows still need to be exercised on the implementation before HR-GOV-01 can complete.
- Delegation: two real read-only subagents are investigating import integrity and UI/platform acceptance. They cannot edit shared files; the lead owns integration and final evidence.
- Checks: both new skills validated; `git diff --check` passed before the checkpoint. No application code or persisted schema changed in this batch.
- Exact next action: implement the lead-owned compatible media/mapping schema and typed Worker boundary, then integrate audio and mapping through the existing parser/editor/renderer.

### Import/audio/mapping implementation handoff

- Branch/commit: this implementation batch was checkpointed on `main` at `52e60f7`; final acceptance is recorded below. Nothing is pushed or deployed.
- Checks: focused unit/domain **37/37 passed**; production build passed at **794.16 kB initial / 180.30 kB estimated transfer** and emitted a distinct lazy Anki Worker; official-fixture mapping/audio passed **2/2** in Chromium/WebKit; 10,000-note responsive cancellation passed **2/2** in Chromium/WebKit. Full unit/browser regression remains next.
- Persistence: migrations retain `migration-v1-original` or `migration-v2-original`; imported content remains atomic and content-only; mapping presets commit together. Reviews, FSRS state and rewards are unchanged by import/capability decisions.
- Cross-platform: desktop Playwright WebKit is browser-engine evidence only. Native picker URI handling, durable media, audio interruption/listening quality, memory pressure, VoiceOver and iOS/macOS packaging remain untested.
- Exact next action: add final signature-change/backup checks, run unit/build and full Chromium/WebKit/phone suites, capture import evidence, reconcile final status and restart the local server.

### Charter/import/entitlement final handoff

- Branch/checkpoints: `main`; charter workflow `958060f`, tracker `bbcc0e4`, core import implementation `52e60f7`, final acceptance and compatibility fixes `3c1246b`. Nothing is pushed or deployed.
- Requirements: HR-GOV-01/02, HR-IMPORT-01A/B/C, HR-COM-01 and HR-PLAN-01 are complete for the documented local-web scope. HR-IMPORT-01 is now complete only for the compatibility subset in `docs/anki-import.md`, not universal Anki parity.
- Final checks: **77/77** unit/domain tests; production build **794.64 kB initial / 180.36 kB estimated transfer**; final combined browser gate **108/108** after the new phone-profile import checks (**48 Chromium, 48 desktop WebKit, 12 WebKit phone profiles**). No skips. The first combined 105-case run had eight stale v2/image-label assertions across engines and one Chromium reward-animation timing flake; corrected v3 assertions passed 10/10, the unchanged animation passed 3/3 isolated, and the uninterrupted rerun passed 105/105. Additional import/theme/text-reflow checks then passed in both engines and all three phone profiles.
- Interoperability: official Anki 26.9.3 legacy `.anki21` and modern `.anki21b` exports contain five notes/seven cards, custom mappings, PNG and MP3. The 10,000-note/card cancellation fixture is 2,572,288 bytes as SQLite and 249,606 bytes compressed. Format-v3 XLSX/ZIP and JSON backup retain audio/mappings; published v1/v2 deck packages remain readable.
- Visual evidence: inspected Chromium/WebKit recordings for mapping/import/audio and Worker cancellation are in ignored `.runtime/evidence/hr-charter-import-20260930/`. Light-to-Dark, 200% reflow and the explicit Collection audio control are exercised; media playback evidence is the browser `playing` state, not listening verification.
- Acceptance fixes: imported binary MP3 headers no longer pass through fatal UTF-8 decoding; Exchange grids reflow based on available text-scaled width; long package names wrap; tiny-screen theme controls stack; the fixed desktop sidebar can scroll in short landscape viewports; the audio control is outside the flippable card surface and stops on lifecycle/navigation changes.
- Cross-platform: Playwright WebKit 26.6 on macOS arm64 is browser evidence. Safari, WKWebView, iOS/macOS native storage/files/audio, simulator/device accessibility, physical speakers and package memory pressure are not tested.
- Exact next action: review this checkpoint locally. The next proposed implementation milestone is search, organisation and scalable local media indexing; it requires separate authorization before work begins.

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
| HR-UX-12 | Complete | `ViewportRevealService` shares one observer per scrolling root between the `hrReveal` directive and Results. Ten targeted Chromium/WebKit and phone-profile checks prove intermediate motion, offscreen waiting, one-shot settlement, dynamic content, focus/lifecycle safety, reduced motion and text zoom. Two cross-page recordings were inspected. | Safari/WKWebView and physical-device compositing remain native verification; ordinary page entrances deliberately have no Skip/Replay UI. |
| HR-UX-13 | Complete | At widths above 820 px, Study reserves a 300–360 px card column and a compact 330–370 px control column. Five rows share fixed number/grade/label/info columns. Material tooltips work by hover, focus and click, dismiss on Escape/outside input and do not submit. Chromium/WebKit geometry and 200% compact WebKit checks pass. | Physical touch/VoiceOver behavior remains native verification. |
| HR-UX-14 | Complete | The saved card is retained through an owned 900 ms maximum feedback run before a 180/260 ms deal. Busy state blocks repeat input; save failures never start feedback. Lifecycle/preferences settle the finite promise, and active/recall measurements stop at submission. Chromium and WebKit sample the old card after 500 ms and see Results only after feedback. | Timing remains eligible for visual product tuning on physical devices. |
| HR-UX-15 | Complete | The Results cosmetics section sequences the real bar to its persisted maximum, completion pulse, HoloRecall sleeve, and actual unlocked card/design. Chromium and WebKit tests earn two real unlocks, advance the ordered Continue queue, inspect both in Recently unlocked and prove the reward array is unchanged by presentation. Skip produces a static summary and Replay is presentation-only. | Physical-device timing and touch remain native verification. |

## Authoring, import, design and game tracker

| ID | Status | Acceptance evidence | Remaining issue / exact next action |
| --- | --- | --- | --- |
| HR-AUTH-01 | Complete | Existing editor now has obvious deck/card entry points, basic/image-first/reversible presets, shared-renderer face preview, atomic Save and add another, draft navigation guard, duplicate, selection and atomic bulk rarity/design/finish assignment. Chromium and WebKit authoring journeys pass; reviews/rewards remain unchanged. | Physical iPhone keyboard and VoiceOver behavior remain native verification. |
| HR-IMPORT-01 | Complete for documented subset | Local `.apkg` Worker analysis, mapping, preview and atomic content-only apply now cover stable IDs, deterministic rarity, Basic/reversed/cloze/image-first, custom fields, PNG/JPEG/WebP and bundled MP3/WAV. Genuine Anki 26.9.3 legacy `.anki21` and modern `.anki21b` fixtures pass domain plus Chromium/WebKit mapping/audio/reload evidence. | Universal templates, TTS, image occlusion, typed answers, Anki history/export/sync and native file/audio verification remain explicitly unsupported or pending; see `docs/anki-import.md`. |
| HR-DESIGN-02 | Complete for the local web scope | Nine distinct finish presets, clean/ornate/showcase layout families, per-rarity overrides, inert raster texture masks and v2 portable fields preserve the seven rarity IDs and existing rewards/scheduling. Chromium/WebKit inspect live renderer attributes; domain ZIP round trips finish/layout/texture. | Physical iPhone/WebKit compositing and performance remain native-only verification. |
| HR-GAME-01 | Complete | Collection derives a compact next-unlock preview and recently-unlocked cards directly from active reward events. Chromium/WebKit verify the real progress block. It adds no score, currency or reward write. | Recently-unlocked display is covered by the same validated event derivation; physical touch remains native verification. |

## iOS-readiness tracker

| ID | Status | Acceptance evidence | Remaining issue / exact next action |
| --- | --- | --- | --- |
| HR-IOS-01 | Complete | Shared Playwright projects run 37 desktop journeys in Chromium 153 and patched WebKit 26.6, plus seven WebKit phone-profile tests. Critical Study, Collection, Results, theme, authoring/media/exchange, page entrances, recovery, save failure and reward paths pass without skips. | Safari/WKWebView/simulator/device verification remains native work. |
| HR-IOS-02 | Complete | Safe-area env values have one owner per edge, `viewport-fit=cover` is enabled, controls retain 44/48 px targets, mobile form text is 16 px, and visual-viewport resize keeps focused editor controls reachable. Compact/large portrait, landscape, touch, 200% text, no-overflow and stable reveal pass in WebKit. | Real notch/home indicator, software keyboard, VoiceOver and Dynamic Type remain untested. |
| HR-IOS-03 | Complete | FSRS/reward/report/exchange rules remain browser-independent. `StudyPersistence`, `AppLifecycle` and `FileDelivery` are narrow seams; package bytes are generated separately from delivery. Web behavior passes in both engines. | Capacitor lifecycle, SQLite/media and Files/share implementations do not exist and never report fake success. |
| HR-IOS-04 | Complete | Atomic persistence is unchanged. Lifecycle interruption checkpoints active time, pauses motion, settles interrupted faces/results, refreshes on resume and cleans listeners/observers/timers. Accepted review/reward arrays survive interruption/reload exactly once in Chromium and WebKit. | Native durable-storage provider and crash/migration tests await a native milestone. |
| HR-IOS-05 | Complete | Local fonts/art remove core runtime network dependencies. Bounded media validation supports a WebKit-safe decode fallback; temporary URLs are revoked. WebKit upload/recovery, XLSX/ZIP, overlays/flips, reduced motion and loaded-page offline study pass. | Cold web start offline is unsupported; native picker/share/URI/cancellation and packaged cold start remain pending. |
| HR-IOS-06 | Complete | `docs/ios-readiness.md` identifies implementation and evidence per platform, the exact engines and native-only gaps. No browser result is labelled iOS verified. | Keep the matrix current on every meaningful future change. |

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

## HR-UX-12 page coverage

- **Dashboard:** heading, study summary, real metrics, deck heading and stable deck tiles.
- **Decks and deck detail:** page heading, deck editor, card authoring, deck panels, filters and stable card rows. The form enters as a section; individual controls do not cascade.
- **Collection:** heading, showcase, owned-card heading and rows, and the labelled sample gallery. Rendered cards retain their own flip and tilt transforms.
- **Progress:** heading/filter/metrics, report sections, tables, charts, deck progress, attention, scheduler, cosmetics and definitions. Progress marks use the shared visibility trigger while their displayed totals remain final data rather than simulated gains.
- **Design Studio:** heading, design editor and live preview panels. The preview card keeps its renderer motion ownership.
- **Import/export:** heading, download/import groups and newly created preview. Busy states, validation failures and recovery actions remain immediate.
- **Settings:** heading, appearance/study panels and cosmetic thresholds.
- **Study:** only suitable supporting content may use the shared pattern. The active deck, reveal/rating controls and card transition are intentionally excluded so review actions never move or replay entrances.
- **Session Complete:** its accurate pre-session-to-final sequence, scroll progress, zero pulse, Skip and Replay remain page-owned, but now use the same observer service. This prevents competing observers while preserving its run state.
- **Component-owned transitions:** Angular Material controls, native disclosure panels and intentionally hidden content are not wrapped in a second entrance. There are no current application dialogs or vertically nested page scrollers; `hrRevealRoot` supports a future explicit nested root without changing the directive contract.

## Current batch handoff

- Branch/commit: `main`; HR-UX-07–11 application and test changes are checkpointed at `268fd78`; nothing is pushed or deployed.
- Relevant worktree: clean after the implementation checkpoint except for this final handoff reconciliation. `git diff --check` passes.
- Checks completed: `npm test` passes **65 tests across six files**; `npm run build` passes without warnings at **716.65 kB initial / 162.57 kB estimated transfer**; the full suite passes **32 Chromium tests** with two workers; `npm audit` reports **0 vulnerabilities**.
- Browser coverage: desktop/mobile, Light/Dark/System startup, keyboard/touch-equivalent pointer interaction, reduced motion, reload recovery, stale-write error handling, offline loaded-page review, all illustrations, uploads/backups, migration, reports and content exchange. Browser emulation is not physical iPhone evidence.
- Visual evidence inspected: centered 390 px Study in Light/Dark, System-theme results at intermediate progress, and a five-second Chromium video covering reveal, rating-4 feedback, results intro, scroll and bar growth. Evidence is under ignored `test-results/hr-ux-07-11-final/` and `test-results/ux-review-video-final/`.
- Current batch: invariant Study stage/control reserve, compact reveal action, five confidence effects, scroll-run results presentation, accurate progress animation, zero glow, Skip/Replay lifecycle, targeted tests and documentation.
- Outstanding product limitations are listed above; there are no known blockers for local review.
- Exact next action: inspect the local application at `http://127.0.0.1:4200/`; future cloud/iOS work remains a separate milestone.

### iOS-readiness batch 1

- Branch/commit: `main`; standing requirements/evidence baseline committed at `5837123`; platform-seam changes are the next checkpoint.
- Changes: safe-area/visual-viewport handling, shared web lifecycle, persistence typing, generated-file delivery port, WebKit-safe raster decoder fallback and cleanup. No schema, seed, scheduling, reward or stored-data migration changed.
- Checks: production build passes at 722.59 kB initial; all 65 unit/domain tests pass; `git diff --check` passes.
- Cross-platform note: the web adapters use standard browser APIs and retain explicit future Capacitor integration points. Keyboard behavior, WebKit layout, page interruption and browser downloads remain pending browser evidence; simulator/physical-device behavior is untested.
- Exact next action: configure the shared Playwright WebKit gate and run the critical journeys, phone layouts and interruption checks.

### iOS-readiness batch 2

- Branch/commit: `main`; runtime seams checkpoint `98600ea`; WebKit gate/lifecycle implementation checkpoint `d97937b`.
- Changes: shared Chromium/WebKit test matrix, compact/large/landscape phone projects, safe-area/text-size/viewport/interruption/offline checks, authoritative flip settlement, Results interruption settlement and visibility-first focus initialization for WebKit.
- Checks: 33/33 Chromium desktop journeys; 33/33 WebKit desktop journeys; 5/5 WebKit phone-profile checks; 65/65 unit/domain tests; production build passed without warnings at 722.70 kB initial / 164.40 kB estimated transfer. No tests were skipped.
- Evidence: patched WebKit 26.6 build 2359 and Chromium 153.0.8010.12 on macOS arm64. Short videos and screenshot are in ignored `test-results/hr-ios-webkit-evidence-20260930/`.
- Cross-platform note: safe-area values remain zero in this desktop-hosted automation, and viewport presets do not emulate WKWebView, hardware cutouts, the iOS keyboard, VoiceOver or Dynamic Type. Native storage, Files/share, lifecycle plugin binding and device profiling remain explicitly unimplemented.
- Exact next action: review this local checkpoint at `http://127.0.0.1:4200/`. The prior local product milestone is complete; the next proposed milestone is a separately authorized minimal Capacitor native-feasibility build with storage/plugin decisions and simulator/device evidence.

### HR-UX-12 shared page-motion batch

- Branch/commits: `main`; shared implementation `dbc4993`; targeted verification `41e4bb8`; nothing is pushed or deployed.
- Changes: reusable `hrReveal` directive, one observer bucket per actual scroll root, common entrance tokens, capped group staggering, focus and lifecycle settlement, and explicit progress/chart presentation hooks. The directive fails open, owns no layout dimensions and cleans observers and Web Animations on removal.
- Checks: **65/65** unit/domain tests; production build without warnings at **728.98 kB initial / 165.81 kB estimated transfer**; final full browser suite **81/81** with no skips (**37 Chromium desktop, 37 WebKit desktop, seven WebKit phone-profile tests**). A prior full run had one existing rating-4 feedback timeout under parallel load; it passed 3/3 in isolation and the complete rerun passed.
- Targeted evidence: **10/10** page-reveal tests cover actual intermediate animation state, offscreen wait/scroll trigger, no replay, every route, stable filtered items, newly focused authoring, background/resume, theme changes, reduced motion/effects disabled, 200% text and landscape. Chromium and WebKit recordings are under ignored `test-results/hr-ux-12-evidence-20260930/` and were inspected as contact sheets.
- Cross-platform note: the implementation uses `IntersectionObserver`, Web Animations and existing lifecycle/preferences behind shared ownership. Desktop-hosted WebKit and touch viewport checks pass; Safari, WKWebView, native lifecycle, physical safe areas, VoiceOver and device performance remain untested.
- Exact next action: review the running application at `http://127.0.0.1:4200/`. Native scaffolding, provisioning, cloud work and deployment remain outside this change.

### Study controls and earned-reveal batch

- Branch: `main`; begins from accepted checkpoint `6274477`. Relevant source, tests and tracker changes are included in the next local checkpoint; nothing is pushed or deployed.
- Diagnosed causes: the final Study CSS override had replaced the wide grid with a vertical flex layout. Rating explanations remained in every button. Review persistence mutated the queue before an independent 760 ms timer mounted feedback, so Angular could render the next card or Results first and the old timeout test could race that lifecycle.
- Changes: stable wide two-column Study workspace at an explicit 820 px breakpoint; configured rating rows; Material tooltip help; retained-card save-gated feedback/deal sequence; interruption settlement; and an event-backed progress/pulse/sleeve/card unlock presentation.
- Checks: targeted Playwright **9/9 passed** across Chromium desktop, WebKit desktop and compact WebKit at 200% text. It samples stable stage geometry, shared columns, hover/focus/click help, persisted-before-feedback ordering, the retained card at 500 ms, last-card ordering, final progress width and Skip/Replay event invariance. Production build passes; the newly used Material tooltip raises the initial bundle above the old 750 kB warning budget, which remains to be reconciled before final verification.
- Cross-platform note: Material tooltip/touch gestures, Web Animations and shared lifecycle APIs run in both browser engines. Native VoiceOver, WKWebView compositing, physical touch dismissal and device timing remain untested.
- Exact next action: improve the existing authoring workflow without changing review history or introducing a second editor.

### Authoring, package import and collectible-design handoff

- Branch/checkpoints: `main`; Study/reward corrections `cb245e6`; authoring acceleration `11852b1`; finish/import/game implementation `036183e`; final recovery and Anki interoperability evidence `14e8d7e`. Nothing is pushed or deployed.
- Authoring: the single existing editor now supplies basic, image-first and reversible presets, shared front/back preview, atomic Save and add another, retained safe defaults, draft guard, duplicate and atomic bulk rarity/design/finish assignment. Chromium and WebKit journeys pass.
- Anki: `.apkg` is selected and analysed in-app through lazy local JSZip, `sql.js` and `fzstd` code. Genuine Anki 26.9.3 legacy and modern exports verify database selection, zstd/protobuf decoding, Basic/reversed/cloze conversion and bundled image media. Stable identity/reimport, deterministic rarity, content-only atomic apply, reload and malformed/backup rejection are tested. Audio, Worker parsing and custom mapping remain deliberately visible in `docs/anki-import.md`, so HR-IMPORT-01 remains partial.
- Designs/game: nine finishes, three frame families, per-rarity finish overrides and static texture masks are versioned through format v2 while v1 stays readable. Collection shows the real next unlock and recent active unlock events. No reward or scheduling rules changed.
- Checks: **70/70** unit/domain tests; production build passes without warnings at **786.32 kB initial** after documenting an 800 kB budget and explicitly allowing the pinned lazy SQLite distribution. The final uninterrupted browser run passed **101/101**: Chromium desktop **46/46**, WebKit desktop **46/46** and WebKit phone profiles **9/9**. Both engines pass the added multi-unlock queue. An earlier combined run had one Chromium page-inventory render race which passed 3/3 serial retries; the final run did not reproduce it. Animation-enabled recordings are under ignored `.runtime/evidence/hr-milestone-{chromium,webkit}/`.
- iOS note: packaged WASM is local and the parser/file delivery remains behind existing browser seams. Desktop WebKit evidence is not WKWebView/iPhone proof; native file selection, URI cancellation, memory pressure and physical compositing remain untested.
- Interoperability fixtures: checked-in, review-history-free exports from official Anki 26.9.3 cover legacy `.anki21` and modern `.anki21b`, four source notes, six generated cards and bundled PNG recovery. The generating script records provenance and keeps its development environment outside the repository.
- Worktree at handoff: clean after this documentation reconciliation; `git diff --check` passes. The local Angular server is verified on `http://127.0.0.1:4200/`.
- Exact next action: add bundled-audio playback and a reusable custom field-mapping step, then move bounded SQLite/decompression work into a cancellable Worker before completing HR-IMPORT-01.
