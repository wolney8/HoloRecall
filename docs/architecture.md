# Architecture

## Decision 001: a local web milestone first

Recorded 28 September 2026 as the bootstrap architecture decision. Build one strict TypeScript, standalone Angular application, with shared domain modules and persistence behind an adapter. Use Tailwind and scoped CSS. Keep the future API boundary in `api/`; no API, authentication or cloud sync is implemented for this milestone.

Pin Angular, CLI and build tooling to **21.2.24**, TypeScript to **5.9.3**, and the existing Node **24.3.0** / npm **11.4.2** toolchain. Angular 21 is supported LTS through June 2027 and supports Node 24.3.0. Angular 22 requires a newer Node patch; choosing 21 avoids changing the global machine toolchain. Recheck support before release. Exact application dependencies are in `package.json`; retain `package-lock.json` for reproducibility. [Angular compatibility](https://angular.dev/reference/versions), [Angular support schedule](https://angular.dev/reference/releases).

Use **ts-fsrs 5.4.2** behind a pure TypeScript adapter. Ratings 1, 2, 3, 4 and 5 map to Again, Hard, Good, Good and Easy. Preserve the original five-point value and scheduler/configuration version on each review. Inject review time; disable fuzz for deterministic tests. Due dates are model estimates. Retain the dependency's licence and required notices in its distributed package. [ts-fsrs repository and licence](https://github.com/open-spaced-repetition/ts-fsrs), [API documentation](https://open-spaced-repetition.github.io/ts-fsrs/).

Pin transitive Vite to **7.3.6**, the exact version required by Angular build 21.2.24 and within Vitest 4.1.0's supported range. This avoids npm 11.4.2's observed optional-peer resolver crash through Vite 8's devtools dependency graph without disabling peer validation or upgrading the global machine. Reassess this override with a future toolchain update. [Upstream resolver issue](https://github.com/npm/cli/issues/9787), [npm overrides](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides).

Use an IndexedDB snapshot store for this small local dataset. Commit content, learner state and review events together in one transaction, with version checks and unique event IDs. Events retain their study-session IDs; the current queue and session counter are ephemeral UI state and restart on reload. This is a reversible simplification for the prototype; the adapter can evolve without coupling scheduling to Angular. Store media references to bundled original assets. Browser storage can be cleared or evicted and is not a guaranteed durable native database or a cloud backup.

The domain layer is in `src/domain`; `src/app/data` implements the IndexedDB adapter and Angular signal store. Schema version 1 is checked on load. Unsupported or malformed data is reported without reset. Atomic compare-and-swap rejects stale tab writes and leaves the unsubmitted card on screen; there is no durable pending-event outbox yet. A versioned migration must precede future incompatible changes. JSON export/restore is described in the README and tested in both domain and browser checks. The FSRS MIT notice is preserved in `docs/third-party/ts-fsrs-LICENSE.txt` and the Angular production build's `3rdpartylicenses.txt`.

## Data and scheduling boundaries

Card/deck content is separate from learner progress. Each learner/card state has a concurrency version. Review events retain their event, learner, card and session IDs; content revision; UTC timestamp; original rating; mapped FSRS grade; previous state version; resulting state; and scheduler/configuration version. Normal reviews are immutable. Undo appends a reversal and updates the current state atomically; it must not silently remove history.

Default day boundaries use `Europe/London`, independent of UTC storage. Day and streak logic must handle daylight-saving transitions. Prioritise due reviews, respect daily new/review limits, and keep practice separate from scheduled reviews. Rapid submissions and duplicate event delivery must not create extra reviews or rewards.

The local prototype has one local learner. It does not establish cloud identity, remote ownership or cross-device conflict resolution. Collection samples have no effect on progress or rewards. A future learner-specific challenge policy needs minimum evidence, separate promotion/recovery thresholds and an explanation; cosmetic unlocks are a separate system.

## Preserved cloud direction

- **Web/API:** Vercel-hosted built web assets plus a small TypeScript API. Server-only code and database credentials stay outside browser and native bundles. Check current Vercel limits and configuration before deployment.
- **Database:** Neon PostgreSQL through the API, with migrations, foreign keys, ownership constraints, unique event IDs and due-queue indexes. Do not add an overlapping database service without a recorded decision. Preserve study history during schema changes.
- **Identity:** Auth0 is proposed, not selected through implementation. Validate the current Angular/Capacitor SDK compatibility, Google/Apple setup and service limits before commitment. The server must validate credentials and derive learner identity from them, then check resource ownership.
- **Native identity:** Plan separate browser/native callbacks, authorization code with PKCE where appropriate, verified deep links, logout and suitable token storage. Browser success does not verify native login. [Auth0 Angular/Capacitor guide](https://auth0.com/docs/quickstart/native/ionic-angular).
- **Media:** Object storage holds bytes; PostgreSQL holds owned metadata and references. Select an adapter/provider and document current costs, limits, upload validation, size restrictions and deletion behaviour before enabling cloud uploads. Bundled assets need no external account.
- **Sync:** Define a durable outbox, unique event IDs, acknowledgements, retries and visible pending/error states. The server validates submitted events and calculates resulting scheduling/rewards; it must not trust client-supplied XP or final state. Detect stale state versions, retain pending work and surface conflicts. Define resolution and clock-skew handling before claiming multi-device offline sync.
- **Portability:** A versioned JSON export/restore contract must include content, review history, scheduling/configuration state and packaged media or resolvable references. Validate imports and avoid silent replacement. Add CSV validation/duplicate handling later; Anki `.apkg` support needs an explicit supported subset. No AnkiWeb sync is promised.

## Native feasibility

Capacitor remains the iOS direction. Current stable Capacitor **8.5.2** requires Node 22+, full **Xcode 26+**, and supports **iOS 15+**. Swift Package Manager is the default native dependency manager; CocoaPods is optional. [Environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [iOS requirements](https://capacitorjs.com/docs/ios).

The environment check found Command Line Tools but no working full Xcode installation. No native build or physical-device test has run. Keep the native feasibility build as the next iOS task when Xcode is available; it does not block this local web milestone. Packaged iOS must contain built web assets, use the hosted API and never depend on a development-server URL.

Device motion remains opt-in future work, with user-triggered permission, denial/absence handling and inactive-listener cleanup. Native authentication, lifecycle/storage and motion require real-device evidence. CSS effects come first; WebGL requires measured benefit and device profiling. No microservices, Nx, Kubernetes, GraphQL or large state framework is currently justified.
