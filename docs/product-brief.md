# Product brief

HoloRecall is a visual flashcard app for web and iOS. Its core loop is: choose a deck, attempt recall, reveal the answer, rate the attempt, save the review and receive the next due card. Progress survives restart. Animation makes that loop enjoyable without delaying grading or obscuring content.

## Current local web milestone

The local study loop is retained and extended with real Angular Material 3 theming, persisted themes, all 16 Italian illustrations, authoring, reusable designs, seven authored rarities, auditable cosmetic unlocks, collection inspection, portable exchange and real Progress reports. Local organisation includes indexed search, hierarchy-aware decks, tags, combined filters/sorts, atomic bulk changes and a hash-verified media registry. Schema 5 adds reusable Study presets, per-deck/today overrides, supported FSRS controls, deterministic queue policy, sibling/leech management, reviewer preferences and truthful review/management history.

Design Studio separates background, learning illustration, rarity frame, effects and protected text/control areas. Whole-card movement wraps those layers. Reuse named designs across decks with optional per-card overrides; accept validated raster assets and settings only. Use a 2:3 portrait guide, transparent PNG frames, attribution, fit/crop controls, theme/tier previews and durable local media references. Never execute uploaded HTML, CSS, JavaScript or SVG.

Use bundled original assets. Identify local storage clearly; do not simulate authentication, sync or learning outcomes. Samples demonstrate all tiers without adding synthetic events. Cloud, native packaging, advanced shaders, device motion, XP, packs and production deployment remain later work.

## Learning content

The data model supports other subjects as well as Italian. Text cards and visual cards use structured fields, not a large rich-text editor. A visual question shows an image without the target answer; its answer side uses the same image, Italian term/phrase and a separate English-friendly pronunciation approximation. Label approximations as approximate, and keep IPA distinct. Optional fields cover natural English meaning, literal explanation, grammar, examples and audio.

Keep tasks short and focused on one recall target. The original seed deck includes concrete nouns with articles, simple noun patterns and exceptions, plus individual examples for `essere`, `avere` and a regular `-are` verb. Do not copy coursebook pages. Support creating, editing, tagging and suspending cards and decks as the product grows. Accessible image descriptions must support the prompt without exposing its target answer before reveal.

## Recall ratings and history

Use maintained, pinned `ts-fsrs` through a domain adapter. HoloRecall's proposed five-button interface maps onto four native FSRS outcomes:

| Rating | Meaning after attempting recall | FSRS outcome |
| --- | --- | --- |
| 1 | Forgot, incorrect, or needed the answer | Again |
| 2 | Correct, with substantial effort | Hard |
| 3 | Correct, with some hesitation | Good |
| 4 | Correct and confident | Good |
| 5 | Correct immediately and effortlessly | Easy |

Preserve the original rating for analytics. This is HoloRecall's proposed mapping, not a validated Brainscape equivalent. Validate wording with users. A wrong or unrecalled answer must not become Hard because it feels familiar after reveal. No copied Anki source or invented SM-2/FSRS hybrid is needed.

Keep scheduling separate from effects and rewards. Save all required scheduler state and versioned parameters. Store UTC instants; use a configurable IANA zone, initially `Europe/London`, for days and streaks. Inject clocks and control randomness in tests. Prioritise due work and make review/new-card limits configurable. Practice is distinct from scheduled study.

Review history is reconstructable and immutable during normal operation, with identity, content revision, previous-state version, original rating, mapped grade, applied preset/parameters and resulting state. Undo records a correction/reversal so history, analytics and future rewards agree. Manual scheduling changes are separate management events and never count as recall outcomes. Content and each learner's scheduling state are separate.

## Rarity, learning difficulty and collection

The current authored tier set is Common, Uncommon, Rare, Holo Rare, Ultra Rare, Secret Rare and Relic. Each has a label, symbol, frame treatment and restrained effects profile. An imported high-rarity card remains immediately studyable. Its premium cosmetic is separate from the content and unlocks through local study; Design Studio and Collection can show explicitly labelled unearned previews.

The previous four treatments were presentation samples, not stored learner achievements. Their appearance evolves into the seven-tier renderer without inventing past unlocks or altering review history. Learning difficulty remains FSRS state and an explained recent-failure indicator; it does not select authored rarity or award cosmetics. Automatic challenge/leech classification remains deferred pending evidence thresholds and recovery policy. Never use an SM-2 ease-factor rule for FSRS.

The user-authorized cosmetic policy uses high-confidence scheduled ratings 4/5, distinct study dates and at least 20 elapsed hours between contributions. Default thresholds are 1, 2, 3, 5, 8, 12 and 20 qualifying days, configurable in strictly increasing order. This is a motivational policy based on self-report, not a claim of knowledge or mastery. Maintain idempotent contribution/unlock events and reversal evidence; undo reverses its contribution and dependent unlocks, while later forgetting preserves earned cosmetics. Imports, flips, previews, practice and duplicate delivery cannot farm rewards. Scheduling is unchanged.

Later XP must remain independent of self-awarded high confidence. Levels, streaks, mastery badges and skippable booster packs require separately reviewed rules. Missed days never remove learned progress or earned cosmetics. Packs may suggest new cards within daily limits; required content remains directly accessible. No paid random packs are in scope.

## Accessibility and interaction

Begin with readable static cards; then add CSS flip/foil effects. Keep shimmer behind text with constrained blending and static fallbacks. Reveal has a visible button and keyboard control; double-tap is only an optional enhancement. Only the visible face is accessible. Prevent rapid taps from recording duplicate ratings.

Pointer shimmer is supported on web. Respect system reduced motion and a user effects switch. Native motion is later, opt-in and user-triggered, with graceful denial/absence handling and listener cleanup. Physical phone flipping is outside the MVP. Current motion uses CSS and the Web Animations API with finite entry effects and sparse decorative particles. Lottie, counters and packs require a suitable licensed asset/runtime and a measured performance budget on a named iPhone before introduction. WebGL requires a demonstrated benefit.

Use original artwork, names, borders and effects. Collectible trading cards are inspiration only; do not reproduce Pokémon assets, logos, characters or proprietary layouts.

## Trust, portability and analytics

Cloud work retains the authenticated API, Neon, proposed Auth0 and owned object-storage architecture described in [architecture](architecture.md). Before sync, define outbox delivery, idempotency, conflict resolution and clock-skew behaviour. Stale concurrent reviews must retain pending progress and surface the conflict rather than silently use last-write-wins.

Provide documented JSON export/restore before substantial real study, including media packaging or resolvable references. Versioned XLSX is content/reference exchange only; portable ZIP adds media and design definitions. Preview new, changed and duplicate content before an atomic import that preserves history. Reject formulas and unsupported embedded worksheet images explicitly. Anki `.apkg` is a content source: supported notes/cards/media/tags/decks become native HoloRecall content, enter New under the selected HoloRecall preset and retain HoloRecall state on reimport. Anki scheduling, review history, deck options, FSRS parameters and AnkiWeb account data are not adopted.

Analytics must distinguish review counts, self-reported recall success, model retrievability and a defined mastery criterion. Include sample size and time window; a confidence average is not measured retention. Provide accessible chart summaries and only add a chart library for actual data needs. Synthetic histories belong in labelled development previews, never real analytics.

## Capability roadmap matrix

Commercial labels below are proposals for product planning, not enforced policy or verified ownership. Data recovery, learning integrity and accessible study remain independent of future entitlement decisions. Anki behavior is scoped against the official [packaged deck](https://docs.ankiweb.net/importing/packaged-decks.html), [media](https://docs.ankiweb.net/media.html) and [template field](https://docs.ankiweb.net/templates/fields.html) documentation.

| Stable ID | Category / intended behaviour | Actual status and platform evidence | Acceptance criteria | Dependencies | Proposed classification |
| --- | --- | --- | --- | --- | --- |
| HR-CAP-AUTH-01 | Basic, image-first and reversible card/deck authoring | Complete for local web; Chromium/WebKit create/edit/duplicate/draft checks | Structured fields, preview, validation, no history changes | Current renderer and IndexedDB | Core/free |
| HR-CAP-AUTH-02 | Rich reusable templates without executing imported code | Partial: safe Anki template subset and field mappings; no HoloRecall template editor | Versioned safe template model, conditional/reverse/cloze coverage, migration tests | Schema/design review | Undecided |
| HR-CAP-MEDIA-01 | Durable image and explicit side-specific audio | Complete for local web: IndexedDB metadata/payload registry, verified hashes, dedupe, safe cleanup and raster/MP3/WAV reload/backup/portable evidence | Native provider and device-scale profiling | Native media storage later | Core/free |
| HR-CAP-ORG-01 | Decks, subdeck identity, tags, suspend/archive and bulk content/presentation edits | Complete for current local-web scope; aggregate parent journeys, scoped subdeck Study, schema hierarchy, canonical tags and atomic bulk preservation pass domain and browser checks | Native read-back; archive portability remains full-backup only | Current local index/store | Core/free |
| HR-CAP-ORG-02 | Search, combinable filters, sorting and organisation views | Complete for local query/filter/sort and Collection presets; no named saved-view feature | Maintain responsive indexed search and stable filter navigation at larger real libraries | Current Worker/index boundary | Proposed full-license candidate remains undecided |
| HR-CAP-STUDY-01 | Five-point UI with real FSRS scheduling | Complete for local web; domain plus Chromium/WebKit persistence/dedup/undo evidence | Mapping/version/state/history invariants and interruption recovery | Native durable storage for apps | Core/free |
| HR-CAP-STUDY-02 | Study presets, workload, supported FSRS policy and queue order | Complete for the documented local-web scope: reusable presets; deck/today limits; retention/max interval/same-day steps; supported order policies; sibling/leech rules; reviewer preferences | Preserve deterministic queue/state/history invariants; native read-back remains pending | Schema 5 and `ts-fsrs` 5.4.2 | Core/free baseline; advanced undecided |
| HR-CAP-STUDY-03 | Custom Study and non-rewarding focused practice | Complete for local web: quick Focus actions, advanced criteria/order/limit, saved presets, Collection/Progress entry points, separate Practice events/results and genuine Scheduled eligibility | Native lifecycle/read-back; early scheduled review remains intentionally unsupported | Schema 6, local index and current scheduler | Core/free learning control |
| HR-CAP-HISTORY-01 | Reconstructable reviews, session summaries, undo and management history | Complete for local web: truthful card/global timeline, distinct scheduling-management events and exact valid single/bulk administrative undo | Native durability/read-back; snapshot-free legacy management records remain intentionally non-undoable | Current event model | Safety baseline/core |
| HR-CAP-STAT-01 | Honest progress and report metrics | Complete for current local metrics; no Anki-statistics parity claim | Defined sample/time windows, accessibility, practice/undo exclusions | More real usage evidence | Core/free baseline; advanced undecided |
| HR-CAP-IMPORT-ANKI-01 | Content-only `.apkg` import normalized to HoloRecall study | Complete for documented subset; preset selection, New-state initialization and progress-preserving reimport join real Anki 26.9.3 legacy/modern fixture evidence | Maintain exact compatibility matrix and genuine fixtures | Ongoing format fixtures | Core portability |
| HR-CAP-EXPORT-ANKI-01 | Export back to `.apkg` | Not started and separate from import | Defined supported loss model and genuine Anki reopen evidence | Format/product decision | Undecided |
| HR-CAP-EXCHANGE-01 | HoloRecall XLSX and portable ZIP deck exchange | Complete format v4 with explicit hierarchy/sibling identity; v1–v3 remain readable; unit/browser round trips | Atomic preview/apply, literal cells, bundled advertised media, no history grants | Current exchange boundary | Core portability |
| HR-CAP-BACKUP-01 | Full learner JSON backup and safe restore | Complete locally with schema 1–6 migration and media/mapping/reward/history/preset/focus/hierarchy state | Recovery drill, nonempty-profile protection and native read-back | Native store later | Safety baseline/core |
| HR-CAP-COLLECT-01 | Seven rarities, designs, finishes and earned cosmetics | Complete for local web scope; both engines cover renderer/rewards | Content/rarity/finish/earned/scheduling stay separate | Physical performance testing | Ordinary collection core; advanced studio proposed full-license candidate |
| HR-CAP-CONT-WEB-01 | Responsive local web application | Complete for loaded-page local prototype in Chromium/WebKit; cold offline start unsupported | Supported-browser matrix, recovery/export, release accessibility review | Hosting/release approval later | Core/free |
| HR-CAP-CONT-IOS-01 | Packaged iOS application with native durability/files | PARTIAL: pinned Capacitor 8 SPM shell, production-asset sync, lazy App lifecycle and Cache/Share export adapters, injectable persistence and fixture-tested migration contract | Full Xcode; Simulator build/launch/Study/offline/files/media/accessibility; vetted SQLite proof; physical device and signing later | Xcode 26+, native-store selection and Apple release decisions | Proposed full licence/app access; undecided |
| HR-CAP-CONT-MAC-01 | Supported macOS application | Route evaluated: same iPad-capable iOS app on Apple-silicon Mac is recommended first candidate; no native execution evidence | `My Mac (Designed for iPad)` resizing/input/files/storage/plugin gate; Intel support remains a separate product decision | Full Xcode and product/distribution approval | Proposed full licence/app access; undecided |
| HR-CAP-SYNC-01 | Authenticated multi-device continuity | Not started | Owned API, outbox/idempotency, conflicts, deletion/media recovery and offline visibility | Auth/API/Neon/object storage decisions | Commercial/cloud allowance proposed; undecided |
| HR-CAP-ANKIWEB-01 | AnkiWeb account/sync-protocol interoperability | **NOT PLANNED by product decision.** HoloRecall converts supported packages into native study data and is not an AnkiWeb client. | Not applicable | None; future HoloRecall sync is separate | Not applicable |
| HR-CAP-ENT-01 | Central product-access policy | Foundation complete: allow-all unverified development policy used by Import and Design Studio | Provider-neutral verified adapter, restore/refund/offline/account conflict design before enforcement | Purchase model and account decision | No restrictions in prototype |

### Study settings and review-management comparison

Statuses describe implemented HoloRecall behavior, not visual similarity to Anki. Official comparison source: current Anki Manual [deck options](https://docs.ankiweb.net/deck-options.html), [studying](https://docs.ankiweb.net/studying.html), [preferences](https://docs.ankiweb.net/preferences.html) and [browsing](https://docs.ankiweb.net/browsing.html).

| Capability | Status | HoloRecall boundary / evidence |
| --- | --- | --- |
| Reusable presets | DONE | Balanced/Light/Intensive defaults plus create, duplicate, rename, restore, referenced replacement/delete and bounded deck assignment UI |
| New/review limits; per-deck and today-only limits | DONE | Persisted branch-attributed usage; selected-parent aggregate cap; intermediate/leaf descendant caps; direct-child isolation; distinct new/review ledgers; visible apply/clear |
| Learning and relearning steps | DONE | Strict 1–4 same-day `m`/`h` steps; long or ambiguous tokens rejected |
| Gather/sort, new-v-review and review order | DONE | Deck/position/random; gathered/random; before/mixed/after; due/random/FSRS most-at-risk |
| Sibling burying; manual bury; suspend | DONE | Stable imported/native sibling groups; learner-day auto expiry; archive remains distinct |
| Audio behavior; recorded/on-screen timers; counts and interval previews | DONE | Preset preferences with lifecycle cleanup and accessible manual audio fallback |
| Auto Advance | DONE | Optional/default-off preset control auto-reveals after a bounded question delay, pauses on lifecycle/audio interruption, requires an intentional confidence rating, and retains the existing feedback/deal sequence in Scheduled and Practice modes. Configured answer time is a minimum revealed-card dwell after the rating is saved; it never supplies a rating. |
| Easy Days | PLANNED — evaluated | Installed `ts-fsrs` 5.4.2 exposes interval fuzzing and history rescheduling, but no sanctioned weekday workload-distribution input. HoloRecall will not hide due cards or post-process due dates independently of FSRS. Dependency: a scheduler-supported weekday distribution strategy with state-valid deterministic tests. |
| Desired retention and maximum interval | DONE | Validated per-home-deck settings apply to future reviews; history is not rewritten |
| Low-level FSRS parameters / optimization | PARTIAL | Raw weights remain hidden; installed library has no trustworthy optimizer, so no fake Optimize action exists |
| Legacy SM-2 ease/bonus/graduating-interval settings | NOT APPLICABLE | HoloRecall is FSRS-only |
| Leech handling | DONE | Real-failure threshold; default flag, optional suspend; no rarity/reward coupling |
| Card/review history and date filtering | DONE | Persisted values only; historical retrievability says unavailable |
| Set due, reset/forget, suspend, bury and reposition | DONE | Atomic management events remain outside review/reward statistics. New operations retain grouped before/after projections; valid single/bulk actions undo through immutable reversal records, while stale and legacy snapshot-free actions remain visibly non-undoable. |
| Search/filter by scheduling state | DONE | New, learning, review, due, overdue, suspended, buried, leech/attention and recently reviewed |
| Anki scheduling/history/options/parameter import | NOT PLANNED | `.apkg` is a content source; HoloRecall owns post-import learning state |
| AnkiWeb Sync | **NOT PLANNED** | HoloRecall does not intend to operate as an AnkiWeb client |
| Future HoloRecall-owned sync | PLANNED | Separate authenticated outbox/conflict architecture decision |

### Custom Study / Filtered Deck capability comparison

HoloRecall implements these capabilities as a non-destructive **Focused Session** that references original cards. Cards retain their real deck/subdeck identity; no temporary deck object is created. Official comparison source: current Anki Manual [filtered decks](https://docs.ankiweb.net/filtered-decks.html), [studying](https://docs.ankiweb.net/studying.html) and [searching](https://docs.ankiweb.net/searching.html).

| Capability | Status | HoloRecall boundary / evidence |
| --- | --- | --- |
| Increase today's new limit | DONE | Scoped today-only override followed by genuine Scheduled Study |
| Increase today's review limit | DONE | Scoped today-only override; history is unchanged |
| Review forgotten cards | DONE | Confidence 1 Today or configurable recent learner-calendar days; defaults to Practice |
| Review ahead | PARTIAL | Practice for 1/3/7/custom future days; early scheduled rescheduling is intentionally absent because `ts-fsrs` exposes no sanctioned early-review operation |
| Preview new cards | DONE | Practice only; cards remain New and do not consume allowance |
| Study by scheduling state or tag | DONE | Reuses the indexed query/filter domain, including due/overdue/attention/leech and explicit suspended Practice opt-in |
| Arbitrary filtered selection | DONE | Branch + query + tags + state + date criteria, current Collection results or explicit selection |
| Selection limit and ordering | DONE | Bounded 1–10,000; deck/due/overdue/risk/lapses/oldest/recent/random orders backed by persisted data |
| Saved/reusable selections | DONE | Versioned stable-ID Focus presets rerun current criteria; they do not duplicate cards |
| Rescheduling arbitrary filtered cards | NOT PLANNED for Focus | Scheduled Focus only intersects genuinely eligible cards; Set Due remains a distinct administrative action |
| Preserve home-deck identity | DONE | Focus queues retain original card/deck IDs and parent/subdeck semantics |
| Practice results | DONE | Separate events, time, confidence distribution, recall samples and low-confidence follow-up; no FSRS/cosmetic claims |

The recommended next bounded milestone is **native iOS/macOS feasibility**, limited to toolchain confirmation, one reviewable shell/build path and evidence for storage, lifecycle, files, audio and accessibility risks. Provisioning, signing, cloud services and release work remain separate decisions.

## Delivery checkpoints

1. Isolated checkout and concise project documentation.
2. Working local study, editing, persistence and reviewable visual treatments.
3. Cloud foundations: authenticated ownership, Neon migrations, media, export and tested sync boundaries.
4. iOS: an early feasible native build, then callbacks, lifecycle/storage and opt-in motion checks.
5. Rewards/release: audited unlocks, analytics, packs, real-device performance and reviewable release configuration.

Use focused tests for rating mapping, scheduler persistence, repeated submission, undo and day boundaries. Add reward deduplication when rewards exist, and API ownership/stale-version tests with the API. Browser checks cover create/open/reveal/rate/reload and offline recovery. Native authentication, motion and lifecycle need real devices. Report only evidence actually obtained.
