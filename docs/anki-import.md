# Anki import compatibility

HoloRecall imports learning content from an `.apkg` locally. It never replaces the local collection and does not adopt Anki scheduling, review history, difficulty, mastery or reward state. A lazy Web Worker runs the single shared converter, then the result passes through the ordinary preview and atomic content-import transaction. Cancel is available only during analysis; after Apply begins, the atomic commit either succeeds or reports failure.

This matrix follows Anki's official guidance for [packaged decks](https://docs.ankiweb.net/importing/packaged-decks.html), [media references](https://docs.ankiweb.net/media.html) and [field/template substitution](https://docs.ankiweb.net/templates/fields.html).

| Package / content | Status | Evidence and limit |
| --- | --- | --- |
| Legacy `collection.anki2` package | Supported for the documented subset | Synthetic bounded/security fixtures cover database selection, Basic, reversed and cloze conversion. |
| Legacy `collection.anki21` package | Supported for the documented subset | A genuine Anki 26.9.3 legacy export covers Basic, reversed, two-deletion cloze, image-first content, custom fields, PNG and MP3. |
| Modern v3 `collection.anki21b` | Supported for the documented subset | A genuine Anki 26.9.3 modern export covers metadata v3, zstd database/media decoding, protobuf note types/templates/media entries, the same card types, PNG and MP3. |
| Basic, reversed and optional reversed templates | Supported where exported card rows exist | Each source note/card-template row retains stable GUID-plus-ordinal identity. `FrontSide`, ordinary field substitution and common conditionals are converted to inert content. No nonexistent optional reverse card is invented. |
| Standard cloze | Supported for ordinary text deletions | Each exported deletion ordinal becomes its own card. Nested/overlapping clozes, typed answers and special add-ons remain unsupported. |
| Custom note fields | Supported through reviewed mappings | Front, answer, pronunciation, meaning, notes, front media and answer media can be mapped. Presets are named and saved against a canonical versioned field/template/cloze signature; a schema change does not silently reuse one. Unmapped fields remain inert source metadata. |
| PNG, JPEG, WebP | Supported | Legacy JSON and modern protobuf maps become durable local assets with byte/dimension/collision limits. Remote images and active SVG are never fetched or rendered. |
| MP3, WAV | Supported as bundled audio | Sound references retain their intended front/answer side, allow multiple explicit clips and survive reload, duplication, portable ZIP and full backup. Browser playback-event evidence exists for fixture MP3; listening quality, every codec profile and native playback remain unverified. |
| Anki text-to-speech directives | Unsupported | TTS is reported separately and never invokes a network or speech service. |
| Script/CSS-dependent templates, typed answers, image occlusion, active SVG, remote resources/fonts | Unsupported | Affected content is counted with examples. Script-dependent templates need an explicit safe field mapping or exclusion; imported active content never executes. |
| Collection backups | Rejected | Collection/backup naming receives guidance to export the intended deck. HoloRecall never destructively replaces its local collection. |

The importer selects the database named by detected package metadata rather than a compatibility placeholder. Unknown metadata/schema variants fail visibly. This is not universal Anki template support, Anki export, AnkiWeb sync, review-history migration or a lossless Anki round trip.

## Mapping and identity

The preview reports source-note and generated-card counts separately. Reusable mapping presets use `anki-model-v1-…`, a deterministic hash over cloze type, ordered field names and ordered template names/content. A later package with the exact signature gets the saved suggestion; a changed source schema is marked for review. Changing a mapping previews stable existing card identities, so applying updates can preserve local edits according to the selected conflict policy without resetting history or rerolling authored rarity.

The styling policy hashes the stable note GUID plus template/cloze ordinal, then proposes Common 55%, Uncommon 20%, Rare 12%, Holo Rare 7%, Ultra Rare 4%, Secret Rare 1%, Relic 1%. Actual counts appear before import. This is authored presentation only and never unlocks cosmetics.

## Worker, limits and security

The worker reports honest stages—archive, database, content and media—and row/file counts when known. It owns archive expansion, SQLite/WASM work, conversion and media indexing. Requests use unique IDs; repeated selection, Cancel and navigation terminate the Worker, release temporary state and ignore stale replies. A 45-second deadline fails safely. Worker startup/runtime failure never falls back to unbounded main-thread parsing.

Limits are 30 MiB compressed input, 60 MiB expanded database/archive data, 10,000 notes, 25,000 generated cards, 1,000 media items, 5 MiB per media item, 4,096 px per image side and 100,000 characters per source field. Paths, formulas/active content, malformed SQLite, oversized zstd output and missing media fail or are reported before commit. Current snapshot persistence still holds imported media in one IndexedDB state object, so very large accepted audio collections need native/media-store profiling before production scale.

Dependencies are pinned: `sql.js` 1.14.2 and `fzstd` 0.1.1 (MIT), JSZip 3.10.2 (MIT). Their runtime/WASM assets and notices are packaged locally. A production build emits a distinct lazy Anki Worker and local SQL WASM asset; heavy imports do not enter the initial route path.

## Fixture provenance and evidence

`e2e/fixtures/anki-26.9.3-legacy.apkg` and `e2e/fixtures/anki-26.9.3-modern.apkg` are review-history-free exports made with the official Anki 26.9.3 Python package. Each contains five source notes generating seven cards: Basic, reverse, two cloze deletions, image-first PNG and a custom-field card with side-specific bundled MP3. `scripts/generate-anki-fixtures.py` records the content and export settings; its development environment is excluded.

Domain checks cover both real exports, stable identity, mapping, media recovery, malformed/backup rejection and deterministic styling. Chromium and Playwright WebKit run package analysis → mapping → preview → import → explicit audio playback event → reload. A 10,000-note/card synthetic fixture (2,572,288-byte SQLite database; 249,606-byte compressed package) proves the page event loop continues ticking during analysis and Cancel leaves state byte-for-byte unchanged. Portable-format tests round-trip accents, multiline content, rarities, designs, images and audio. These browser results are not Safari, WKWebView, native iOS/macOS or physical-speaker verification.
