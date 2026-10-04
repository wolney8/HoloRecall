# HoloRecall

A local Angular flashcard application with FSRS scheduling, original Italian illustrations, reusable card designs and earned cosmetics. The current milestone adds Material 3, Light/Dark/System themes, Design Studio, seven rarities, content exchange and event-based Progress reports.

**Local prototype:** all learning data and uploaded artwork live in this browser's IndexedDB. There is no cloud authentication or synchronisation. Use the same origin and browser profile, and download private backups before relying on substantial study history.

## Run and verify

Use Node **24.3.0** and npm **11.4.2** from the project directory:

```sh
npm ci
npm start
```

Open **http://127.0.0.1:4200/**. `localhost` and `127.0.0.1` have separate storage. The server binds only to this Mac. No external service account is required.

```sh
npm run build
npm test
npm run test:e2e
```

The browser tests expect the server to be running. On a fresh checkout, install the pinned test browser locally:

```sh
PLAYWRIGHT_BROWSERS_PATH=.runtime/playwright ./node_modules/.bin/playwright install chromium
```

Actual results and limitations are in [project status](docs/project-status.md).

The reviewable iPhone/iPad shell uses pinned Capacitor 8 and the same production Angular output:

```sh
npm run native:sync:ios
npm run native:open:ios
```

`native:sync:ios` always rebuilds the web application before copying assets. Full Xcode 26+ is required to open, compile and run it; this Mac currently has Command Line Tools only, so Simulator execution remains blocked. The committed configuration contains no development-server URL. See [Apple-platform readiness](docs/ios-readiness.md) for exact evidence and limitations.

## Study, design and collect

Start or resume a session from Dashboard or Decks. Study hides the application chrome, keeps the scheduler-ordered card in front of a concealed deck stack, and offers a persistent End session action. Attempt recall, reveal, then rate 1–5. A wrong or unrecalled answer is 1. The FSRS mapping remains Again / Hard / Good / Good / Easy. Space reveals; keys 1–5 grade. The selected queue, revealed face, saved reviews and session progress survive reload. Animation never shuffles the scheduler's order.

Natural completion and early end both produce a persisted results screen. It separates review count from unique cards, reports event-based active time and self-reported confidence, and shows recall speed only for reviews with a focused question-to-reveal measurement. Cosmetic progress comes from the same idempotent reward events used by Collection; replaying or refreshing results cannot add rewards. Partial sessions are labelled. Undo reverses the review contribution and reopens that card.

The original Italian deck contains 16 individually illustrated tasks covering nouns, articles, exceptions, essere, avere and parlare. Visual fronts hide the answer; text prompts retain their cloze task. The answer side reuses the illustration, with pronunciation and meaning separate. Decks supports creation, editing, tags, uploaded images, suspension, authored rarity and design overrides.

Design Studio saves named backgrounds and frames independently of learning content. Upload PNG/WebP/JPEG (4 MB, 16–4096 px per side), adjust fit/crop, preview both themes and seven rarities, and assign one reusable design to multiple decks. Optional card overrides take priority. Transparent PNG frames are recommended. Download the 1000 × 1500 px (2:3) guide and transparent starter from the studio. Uploads contain no executable code; missing images have a visible fallback.

Collection supports enlarged front/back inspection, pointer/touch tilt, click/tap and keyboard flipping, attribution, unlock progress and seven labelled design samples. The shared 760 ms card turn swaps content edge-on to prevent mirrored text; reduced motion changes the face immediately. Foil, shimmer and glints cross the whole card face above its surfaces while readable text and focus indicators remain above them. Samples never create learning or reward history. Effects respect reduced motion and the Settings switch, and stop offscreen or in background tabs.

Cosmetics require scheduled ratings 4/5 across distinct study days with at least 20 elapsed hours between contributions. Defaults are **1 / 2 / 3 / 5 / 8 / 12 / 20** qualifying days for Common through Relic. Settings permits strictly increasing thresholds. Later forgetting retains earned cosmetics; undo reverses its contribution and dependent unlocks. Rarity and rewards never change FSRS intervals. Self-reported confidence is not independently verified knowledge.

Progress uses real persisted events, excludes undone reviews, separates practice, and explains each metric and sample size. Active study time counts focused, visible interaction, with an idle cutoff and a two-minute cap per card. Session time checkpoints every five seconds; abrupt closure can lose the last few seconds, never duplicate a review.

## Content exchange and private backups

**Import / export** provides a blank XLSX, the populated Italian example, a portable illustrated ZIP, import preview and atomic content updates. XLSX contains structured content and references; ZIP packages media and design definitions. Formula cells, embedded worksheet images and uploaded SVGs are rejected explicitly. Importing content never imports reviews or grants cosmetics. See the exact [format specification](docs/deck-format.md) and [AI generation prompt](docs/deck-generation-prompt.md).

**Settings → Full progress backup** downloads a private JSON envelope: `{ format: 'holorecall-backup', version: 2, exportedAt, state }`. It includes cards, decks, designs, uploaded raster bytes, sessions, immutable review/reversal events, rewards, learner states and versioned scheduler parameters. Bundled `/art/*.svg` paths resolve against the original assets shipped with HoloRecall. Persisted instants use UTC.

Validated restore accepts version 1 or 2 and writes only into untouched local storage; use a fresh browser profile to avoid replacing existing work. JSON input is limited to 100 MB, with an aggregate embedded-media bound. Schema-1 browser data migrates atomically and retains its exact original snapshot in the existing database. Neither migration nor restore fabricates earned rewards. Export files can contain personal learning data: keep them out of this public repository.

## Project documentation

- [Product brief](docs/product-brief.md): current scope and retained requirements.
- [Architecture](docs/architecture.md): decisions, pinned dependencies, storage, rewards and cloud/native boundaries.
- [Project status](docs/project-status.md): actual verification and next action.
- [Deck format](docs/deck-format.md): workbook fields, validation and media portability.
- [API boundary](api/README.md): future server responsibilities.

No history was reset. No push, deployment, paid resource, signing/provisioning or cloud work is part of this milestone.
