# Anki import compatibility

HoloRecall imports learning content from an `.apkg` in the browser. It never replaces the local collection and does not adopt Anki scheduling, review history, difficulty, mastery or reward state. Parsing is lazy-loaded; SQLite and zstd runtime assets are packaged locally. The conversion result passes through the same preview and atomic content-import transaction as XLSX/ZIP.

| Package / content | Status | Evidence and limit |
| --- | --- | --- |
| Legacy `collection.anki2` package | Supported | Schema-11-style `col`, `notes` and `cards` fixture covers Basic, reversed and cloze conversion. |
| Legacy `collection.anki21` package | Parser path implemented | Database selection is covered by detection logic; a genuine Anki-exported interoperability fixture is still required. |
| Modern v3 `collection.anki21b` | Parser path implemented | Metadata detection, zstd database decompression and protobuf note-type/template fields are implemented. Modern protobuf media maps and a genuine current Anki export remain unverified, so this variant is not yet claimed interoperable. |
| Basic and reversed templates | Supported | Each Anki card/template row keeps a stable source identity; field substitution, `FrontSide` and common conditionals are converted to inert text. |
| Standard cloze | Supported for ordinary text clozes | Card ordinal selects the deletion. Nested/overlapping cloze edge cases need real-export coverage. |
| PNG, JPEG, WebP | Supported for legacy JSON media maps | Files become durable local assets with bounded byte/dimension checks and collision-safe stable IDs. |
| Bundled audio | Deferred | Reported and excluded. HoloRecall does not silently discard it or claim support. |
| Script/CSS-dependent templates, typed answers, image occlusion, active SVG, remote resources and fonts | Unsupported | Counted with examples; import requires explicit acceptance of exclusions. No imported active content executes. |
| Collection backups | Rejected | Files named as collection/backup packages receive guidance to export a deck; no destructive collection replacement exists. |

Limits are 30 MiB compressed, 60 MiB expanded database/archive data, 10,000 notes, 1,000 media items, 5 MiB per supported image, 4,096 px per image side and 100,000 characters per source field. Cancellation is checked between bounded stages. The current parser runs after a yield in a lazy chunk, but SQLite work is still on the browser thread; a Worker is the next performance step for large accepted packages.

The deterministic styling policy hashes the stable Anki note GUID plus template/cloze ordinal, then proposes: Common 55%, Uncommon 20%, Rare 12%, Holo Rare 7%, Ultra Rare 4%, Secret Rare 1%, Relic 1%. Actual counts are shown before import. These are authored presentation tiers only and do not unlock cosmetics.

Dependencies: `sql.js` 1.14.2 (MIT) and `fzstd` 0.1.1 (MIT). Format behavior was based on Anki’s public source definitions for [package metadata](https://github.com/ankitects/anki/blob/main/proto/anki/import_export.proto), [package selection](https://github.com/ankitects/anki/blob/main/rslib/src/import_export/package/meta.rs), [note types](https://github.com/ankitects/anki/blob/main/proto/anki/notetypes.proto) and [database schema](https://github.com/ankitects/anki/tree/main/rslib/src/storage).
