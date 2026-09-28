# Product brief

HoloRecall is a visual flashcard app for web and iOS. Its core loop is: choose a deck, attempt recall, reveal the answer, rate the attempt, save the review and receive the next due card. Progress survives restart. Animation makes that loop enjoyable without delaying grading or obscuring content.

## First local web milestone

Deliver a responsive Angular UI with real local dashboard counts, due cards and session progress; an original Italian demonstration deck; basic card creation/editing; scheduled study; persistent card content, review history and FSRS state; image cards; and four visual treatments. Start the local development server and verify that it responds. Exercise the core flow in a browser where tools permit, including a review followed by reload.

Use bundled original assets, so external services cannot block the prototype. Identify local-only storage clearly. Do not simulate successful authentication, sync, earned cosmetics or activity. The collection preview demonstrates labelled sample treatments separately from real learner data. Full rewards, packs, cloud accounts, native packaging, device motion, advanced shaders and production deployment remain later work.

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

## Challenge appearance and collection

| Challenge presentation | Concept | Treatment |
| --- | --- | --- |
| Common / Standard | Established, easier material | Matte |
| Uncommon / Foil | Material needing more effort | Metallic foil |
| Rare / Holo | Repeated retrieval difficulty | Holographic shimmer |
| Secret Rare / Relic | Persistent leech across separate sessions | Gold/obsidian border, optional aura |

These are learner-specific, reversible challenge states. Before enabling automatic tiers, document a policy based on recent outcomes, lapses and difficulty estimates, minimum evidence and distinct promotion/recovery thresholds. Use a neutral state when evidence is insufficient. Author difficulty tags are not measured performance. One accidental tap must not create a lasting leech; recovery should offer editing, splitting or suspension. Do not use an `ease < 1.3` rule with FSRS.

Permanently earned cosmetics are separate. Sustained improvement across spaced sessions can unlock variants; dramatic failure appearance must not itself grant valuable rewards. Review this design before implementing rewards to avoid rewarding intentional failure. XP must not depend on self-awarded high confidence. Deduplicate/cap awards and exclude practice farming; recovery bonuses require separated successes.

Later rewards may include levels, streaks, mastery badges, a Collector's Codex and skippable booster-pack reveals. Missed days never remove learned progress or earned cosmetics. Packs may suggest new cards within daily limits; required content remains directly accessible. No paid random packs are in scope.

## Accessibility and interaction

Begin with readable static cards; then add CSS flip/foil effects. Keep shimmer behind text with constrained blending and static fallbacks. Reveal has a visible button and keyboard control; double-tap is only an optional enhancement. Only the visible face is accessible. Prevent rapid taps from recording duplicate ratings.

Pointer shimmer is supported on web. Respect system reduced motion and a user effects switch. Native motion is later, opt-in and user-triggered, with graceful denial/absence handling and listener cleanup. Physical phone flipping is outside the MVP. Lottie/Jitter, particles, counters and packs require compatible runtimes, licence checks, skippable interaction and a measured performance budget on a named iPhone. WebGL requires a demonstrated benefit.

Use original artwork, names, borders and effects. Collectible trading cards are inspiration only; do not reproduce Pokémon assets, logos, characters or proprietary layouts.

## Trust, portability and analytics

Cloud work retains the authenticated API, Neon, proposed Auth0 and owned object-storage architecture described in [architecture](architecture.md). Before sync, define outbox delivery, idempotency, conflict resolution and clock-skew behaviour. Stale concurrent reviews must retain pending progress and surface the conflict rather than silently use last-write-wins.

Provide documented JSON export/restore before substantial real study, including media packaging or resolvable references. Later CSV import needs validation and duplicate handling. Anki `.apkg` import is a later subset-based compatibility feature, not permission to execute arbitrary templates or a promise of AnkiWeb sync.

Analytics must distinguish review counts, self-reported recall success, model retrievability and a defined mastery criterion. Include sample size and time window; a confidence average is not measured retention. Provide accessible chart summaries and only add a chart library for actual data needs. Synthetic histories belong in labelled development previews, never real analytics.

## Delivery checkpoints

1. Isolated checkout and concise project documentation.
2. Working local study, editing, persistence and reviewable visual treatments.
3. Cloud foundations: authenticated ownership, Neon migrations, media, export and tested sync boundaries.
4. iOS: an early feasible native build, then callbacks, lifecycle/storage and opt-in motion checks.
5. Rewards/release: audited unlocks, analytics, packs, real-device performance and reviewable release configuration.

Use focused tests for rating mapping, scheduler persistence, repeated submission, undo and day boundaries. Add reward deduplication when rewards exist, and API ownership/stale-version tests with the API. Browser checks cover create/open/reveal/rate/reload and offline recovery. Native authentication, motion and lifecycle need real devices. Report only evidence actually obtained.
