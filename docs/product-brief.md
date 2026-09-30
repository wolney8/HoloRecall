# Product brief

HoloRecall is a visual flashcard app for web and iOS. Its core loop is: choose a deck, attempt recall, reveal the answer, rate the attempt, save the review and receive the next due card. Progress survives restart. Animation makes that loop enjoyable without delaying grading or obscuring content.

## Current local web milestone

The first local study loop is retained and extended with real Angular Material 3 theming, Roboto, persisted Light/Dark/System choices, all 16 Italian illustrations, complete basic authoring, reusable design sets, seven authored rarities, auditable cosmetic unlocks, tactile collection inspection, versioned XLSX/ZIP exchange and real Progress reports. Local organisation now includes indexed global search, hierarchy-aware decks, canonical tags, combined filters/sorts, atomic bulk changes, bounded 60-card rendering and a hash-verified media registry. The working agreement permits autonomous implementation, tests, fixes and starting the local server through this milestone.

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

Review history is reconstructable and immutable during normal operation, with identity, content revision, previous-state version, original rating, mapped grade and resulting state. Undo records a correction/reversal so history, analytics and future rewards agree. Content and each learner's scheduling state are separate.

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

Provide documented JSON export/restore before substantial real study, including media packaging or resolvable references. Versioned XLSX is content/reference exchange only; portable ZIP adds media and design definitions. Preview new, changed and duplicate content before an atomic import that preserves history. Reject formulas and unsupported embedded worksheet images explicitly. Later CSV import needs validation and duplicate handling. Anki `.apkg` import is a later subset-based compatibility feature, not permission to execute arbitrary templates or a promise of AnkiWeb sync.

Analytics must distinguish review counts, self-reported recall success, model retrievability and a defined mastery criterion. Include sample size and time window; a confidence average is not measured retention. Provide accessible chart summaries and only add a chart library for actual data needs. Synthetic histories belong in labelled development previews, never real analytics.

## Capability roadmap matrix

Commercial labels below are proposals for product planning, not enforced policy or verified ownership. Data recovery, learning integrity and accessible study remain independent of future entitlement decisions. Anki behavior is scoped against the official [packaged deck](https://docs.ankiweb.net/importing/packaged-decks.html), [media](https://docs.ankiweb.net/media.html) and [template field](https://docs.ankiweb.net/templates/fields.html) documentation.

| Stable ID | Category / intended behaviour | Actual status and platform evidence | Acceptance criteria | Dependencies | Proposed classification |
| --- | --- | --- | --- | --- | --- |
| HR-CAP-AUTH-01 | Basic, image-first and reversible card/deck authoring | Complete for local web; Chromium/WebKit create/edit/duplicate/draft checks | Structured fields, preview, validation, no history changes | Current renderer and IndexedDB | Core/free |
| HR-CAP-AUTH-02 | Rich reusable templates without executing imported code | Partial: safe Anki template subset and field mappings; no HoloRecall template editor | Versioned safe template model, conditional/reverse/cloze coverage, migration tests | Schema/design review | Undecided |
| HR-CAP-MEDIA-01 | Durable image and explicit side-specific audio | Complete for local web: IndexedDB metadata/payload registry, verified hashes, dedupe, safe cleanup and raster/MP3/WAV reload/backup/portable evidence | Native provider and device-scale profiling | Native media storage later | Core/free |
| HR-CAP-ORG-01 | Decks, subdeck identity, tags, suspend/archive and bulk content/presentation edits | Complete for current local-web scope; schema-4 hierarchy, canonical tags and atomic bulk preservation pass domain and browser checks | Carry hierarchy/archive in a future deck-exchange format; native read-back | Current local index/store | Core/free |
| HR-CAP-ORG-02 | Search, combinable filters, sorting and organisation views | Complete for local query/filter/sort and Collection presets; no named saved-view feature | Maintain responsive indexed search and stable filter navigation at larger real libraries | Current Worker/index boundary | Proposed full-license candidate remains undecided |
| HR-CAP-STUDY-01 | Five-point UI with real FSRS scheduling | Complete for local web; domain plus Chromium/WebKit persistence/dedup/undo evidence | Mapping/version/state/history invariants and interruption recovery | Native durable storage for apps | Core/free |
| HR-CAP-STUDY-02 | Study limits and configuration | Partial: daily new/review limits and timezone exist; no deck-option parity claim | Per-deck/global rules with queue tests and clear precedence | Product configuration decisions | Core/free baseline; advanced undecided |
| HR-CAP-HISTORY-01 | Reconstructable reviews, session summaries and undo | Complete for local web; persisted immutable/reversal events | Filters/export and correction semantics remain auditable | Current event model | Safety baseline/core |
| HR-CAP-STAT-01 | Honest progress and report metrics | Complete for current local metrics; no Anki-statistics parity claim | Defined sample/time windows, accessibility, practice/undo exclusions | More real usage evidence | Core/free baseline; advanced undecided |
| HR-CAP-IMPORT-ANKI-01 | Content-only `.apkg` import | Complete for documented subset; real Anki 26.9.3 legacy/modern fixtures in domain and both browser engines | Compatibility matrix, Worker cancellation, mapping/audio/reimport/security tests | Ongoing format fixtures | Core portability |
| HR-CAP-EXPORT-ANKI-01 | Export back to `.apkg` | Not started and separate from import | Defined supported loss model and genuine Anki reopen evidence | Format/product decision | Undecided |
| HR-CAP-EXCHANGE-01 | HoloRecall XLSX and portable ZIP deck exchange | Complete format v3; v1/v2 remain readable; unit/browser round trips | Atomic preview/apply, literal cells, bundled advertised media, no history grants | Current exchange boundary | Core portability |
| HR-CAP-BACKUP-01 | Full learner JSON backup and safe restore | Complete locally with schema 1–4 migration and media/mapping/reward/history/hierarchy | Recovery drill, nonempty-profile protection and native read-back | Native store later | Safety baseline/core |
| HR-CAP-COLLECT-01 | Seven rarities, designs, finishes and earned cosmetics | Complete for local web scope; both engines cover renderer/rewards | Content/rarity/finish/earned/scheduling stay separate | Physical performance testing | Ordinary collection core; advanced studio proposed full-license candidate |
| HR-CAP-CONT-WEB-01 | Responsive local web application | Complete for loaded-page local prototype in Chromium/WebKit; cold offline start unsupported | Supported-browser matrix, recovery/export, release accessibility review | Hosting/release approval later | Core/free |
| HR-CAP-CONT-IOS-01 | Packaged iOS application with native durability/files | Pending; browser WebKit and phone viewports are readiness evidence only | Authorized shell, storage/files/lifecycle adapters, simulator and device tests | Capacitor decision, Xcode/signing | Proposed full licence/app access; undecided |
| HR-CAP-CONT-MAC-01 | Supported macOS application | Architecture decision unresolved; Mac browser evidence only | Choose browser/PWA/native shell and verify keyboard, files, purchases and supported OS | Product/distribution decision | Proposed full licence/app access; undecided |
| HR-CAP-SYNC-01 | Authenticated multi-device continuity | Not started | Owned API, outbox/idempotency, conflicts, deletion/media recovery and offline visibility | Auth/API/Neon/object storage decisions | Commercial/cloud allowance proposed; undecided |
| HR-CAP-ENT-01 | Central product-access policy | Foundation complete: allow-all unverified development policy used by Import and Design Studio | Provider-neutral verified adapter, restore/refund/offline/account conflict design before enforcement | Purchase model and account decision | No restrictions in prototype |

The recommended next bounded milestone is **study configuration and review-history management**. It would add per-deck study options with clear global precedence, a searchable review-history/correction view and bounded custom-study/practice controls, giving learners practical control after importing and organising large decks. It depends on the existing event model, hierarchy-aware queue and local index; cloud, payment and native provisioning are not required.

## Delivery checkpoints

1. Isolated checkout and concise project documentation.
2. Working local study, editing, persistence and reviewable visual treatments.
3. Cloud foundations: authenticated ownership, Neon migrations, media, export and tested sync boundaries.
4. iOS: an early feasible native build, then callbacks, lifecycle/storage and opt-in motion checks.
5. Rewards/release: audited unlocks, analytics, packs, real-device performance and reviewable release configuration.

Use focused tests for rating mapping, scheduler persistence, repeated submission, undo and day boundaries. Add reward deduplication when rewards exist, and API ownership/stale-version tests with the API. Browser checks cover create/open/reveal/rate/reload and offline recovery. Native authentication, motion and lifecycle need real devices. Report only evidence actually obtained.
