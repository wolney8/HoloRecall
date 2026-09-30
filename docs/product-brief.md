# Product brief

HoloRecall is a visual flashcard app for web and iOS. Its core loop is: choose a deck, attempt recall, reveal the answer, rate the attempt, save the review and receive the next due card. Progress survives restart. Animation makes that loop enjoyable without delaying grading or obscuring content.

## Current local web milestone

The first local study loop is retained and extended with real Angular Material 3 theming, Roboto, persisted Light/Dark/System choices, all 16 Italian illustrations, complete basic authoring, reusable design sets, seven authored rarities, auditable cosmetic unlocks, tactile collection inspection, versioned XLSX/ZIP exchange and real Progress reports. The working agreement permits autonomous implementation, tests, fixes and starting the local server through this milestone.

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

## Delivery checkpoints

1. Isolated checkout and concise project documentation.
2. Working local study, editing, persistence and reviewable visual treatments.
3. Cloud foundations: authenticated ownership, Neon migrations, media, export and tested sync boundaries.
4. iOS: an early feasible native build, then callbacks, lifecycle/storage and opt-in motion checks.
5. Rewards/release: audited unlocks, analytics, packs, real-device performance and reviewable release configuration.

Use focused tests for rating mapping, scheduler persistence, repeated submission, undo and day boundaries. Add reward deduplication when rewards exist, and API ownership/stale-version tests with the API. Browser checks cover create/open/reveal/rate/reload and offline recovery. Native authentication, motion and lifecycle need real devices. Report only evidence actually obtained.
