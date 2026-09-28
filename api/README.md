# Planned API boundary

No API server is implemented in this local milestone. The Angular application persists through its browser storage adapter; it does not simulate an authenticated account or synchronisation.

The future small TypeScript API will initially target Vercel Functions and access Neon PostgreSQL. It owns credential validation, identity derivation, resource ownership checks, schema validation, scheduling/conflict validation and idempotent review/reward processing. Never trust a client-supplied learner ID, XP value or final scheduling state.

Keep server code, database credentials and privileged storage keys out of web/native bundles. Add migrations and API ownership/stale-version tests with the implementation. Media uploads require a selected provider, owned metadata, validated type/size and defined deletion behaviour. See [architecture](../docs/architecture.md) for identity, sync and media decisions still required.
