# HoloRecall

A local visual flashcard prototype: study an original Italian deck, reveal an answer, rate recall and keep the resulting FSRS schedule between browser reloads. The first milestone includes a dashboard, deck/card editing, image cards and a clearly labelled collection preview.

**Local prototype:** this application uses this browser's IndexedDB. There is no cloud account, authentication or synchronisation. Storage belongs to the browser profile and origin; clearing browser data can remove it. Keep a backup before relying on the prototype for substantial study. The public repository must not contain private study data, credentials, `.env` files or personal exports.

## Run locally

Use Node **24.3.0** and npm **11.4.2**. From the HoloRecall project directory:

```sh
npm ci
npm start
```

Open **http://127.0.0.1:4200/**. Use the same address consistently: `localhost` and `127.0.0.1` have separate browser storage. The server binds to the local machine only. The application has no cloud service prerequisites.

```sh
npm run build
npm test
npm run test:e2e
```

The browser suite expects the development server to be running in another terminal. Chromium was installed in this checkout's ignored `.runtime/playwright` directory. On a fresh checkout, install it with the pinned project CLI:

```sh
PLAYWRIGHT_BROWSERS_PATH=.runtime/playwright ./node_modules/.bin/playwright install chromium
```

Actual build and test results are recorded in [project status](docs/project-status.md).

## Study and visual behaviour

Start a session from the dashboard or deck library. Attempt recall before revealing the answer, then choose one of five ratings. A failed or unrecalled answer is rating 1; familiarity after reveal is not a successful recall. Ratings 3 and 4 deliberately share FSRS's Good outcome. Scheduling estimates are not guaranteed retention or exact optimal dates.

Visual cards have an image-only question face and the same image on the answer side, with the Italian answer and separately labelled approximate pronunciation. Matte, foil, holo and relic samples demonstrate presentation only; they are not earned rewards or fabricated learning results. Effects must remain readable and respect reduced motion.

The initial queue contains up to 10 new cards, with due reviews prioritised and a total limit of 100 scheduled reviews per day. Both limits and the `Europe/London` day boundary are configurable in Study settings. Space reveals; keys 1–5 grade after reveal. Each card appears once in the current session; check for due cards again to pick up short-term repeats. Reloading preserves study data but starts a new session view.

## Back up and restore

Study settings can download a private JSON backup. The envelope is `{ format: 'holorecall-backup', version: 1, exportedAt, state }`; the state includes decks, cards, preferences, immutable review/reversal events, learner scheduling state and the full versioned scheduler configuration. Dates are UTC ISO instants. Original illustrations use bundled `/art/*.svg` references and resolve in the same app version; no external media bytes are needed.

Restore validates the schema, scheduler version, references, event IDs and state history, with a 5 MB limit. It only writes into an untouched local workspace. An existing edited or studied workspace is refused, preserving its data. Use a fresh browser profile to restore a backup. There is no destructive reset, merge, CSV import or Anki import in this milestone.

## Project notes

- [Product brief](docs/product-brief.md): milestone scope and retained product requirements.
- [Architecture](docs/architecture.md): pinned toolchain, data boundaries and future API/native direction.
- [Project status](docs/project-status.md): actual evidence, limitations and one next action.
- [API boundary](api/README.md): planned server responsibilities; no server is implemented yet.

The remote was empty when cloned. Bootstrap deliberately started on unborn `main`, then created the initial local commit using the existing configured Git identity. The lockfile is included. No `origin/main` commit was assumed, no remote branch was created, and nothing has been pushed. Publishing remains a separate action.
