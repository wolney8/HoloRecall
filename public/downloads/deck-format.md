# HoloRecall deck-content format, version 6

This exchange format carries deck content, reusable designs and media references. It never carries learners, reviews, scheduling states, sessions, reward contributions or earned cosmetics. Use the separate full JSON learning-progress backup for those. Importing a rare card makes it studyable immediately; its cosmetic must still be earned locally.

Version 6 adds deck-cover media and versioned inert Anki conversion provenance. Version 5 introduced Anki source identities/import baselines; version 4 introduced deck parents and sibling groups. Versions 1–5 remain readable; missing hierarchy or provenance is treated conservatively and never guessed. Archive state, learner settings and learning progress remain outside deck-content exchange and stay in the separate full backup.

Download the compatible [blank workbook](/downloads/holorecall-blank-v5.xlsx), [16-card Italian example](/downloads/holorecall-italian-v5.xlsx), [portable Italian ZIP](/downloads/holorecall-italian-v5.zip) and [AI generation prompt](/downloads/deck-generation-prompt.md) from Import & export. HoloRecall writes version 6 and continues to read these version 5 examples.

## Workbook contract

Use `.xlsx`. Sheet names and the first-row headers below are exact, case-sensitive and ordered. `Metadata`, `Decks` and `Cards` are mandatory; `Designs` and `Assets` may be omitted when unused. Every present sheet needs its header row. No additional sheets or columns are accepted. Blank trailing rows are ignored. Maximum: 5,000 data rows per sheet, 20,000 characters per cell, 30 MiB compressed per file, 60 MiB expanded per archive, and 1,024 archive entries. Field-specific limits below still apply.

Write literal string/number/boolean cells. Keep IDs as text. Formula cells, shared formulas, formula definitions, named ranges, macros, external workbook links, hyperlinks, dates, rich-text cell objects, embedded worksheet images and drawing objects are rejected. Strings beginning `=`, `+`, `-` or `@` remain literal strings on export; the application never creates formula objects or evaluates formulas. Put actual line breaks in multiline values and preserve Unicode (including `caffè`, `città`, curly apostrophes and accents). Empty optional cells use their documented defaults.

IDs are stable, case-sensitive strings matching `[A-Za-z0-9][A-Za-z0-9._-]{0,99}`. Do not use `constructor`, `prototype` or `__proto__`. Generate a new ID for new content; retain an ID when intentionally updating that content. Duplicate IDs inside one sheet are errors. Deck, card, asset and design IDs have separate namespaces.

### Metadata

```text
key | value
format_version | 6
content_only | true
```

Exactly these two data rows are required, in either order. No other metadata entries are allowed.

### Decks

```text
deck_id | title | description | design_set_id | suspended | parent_deck_id | anki_source | cover_media
```

| Field | Meaning and validation |
| --- | --- |
| `deck_id` | Required stable deck ID. |
| `title` | Required nonblank title, maximum 160 characters. |
| `description` | Optional text, maximum 2,000 characters; defaults to empty. |
| `design_set_id` | Optional ID from Designs or an existing local design; blank uses the application default. |
| `suspended` | Literal `true` or `false`; blank defaults to `false`. |
| `parent_deck_id` | Optional ID of another row in Decks or an existing local deck. Self-reference, missing parents and cycles are rejected. Blank creates a top-level journey. |
| `anki_source` | Optional validated inert JSON written by HoloRecall. It may include stable source identity and conversion provenance; it is never executed. |
| `cover_media` | Optional `asset:` reference for the deck cover. The asset must be included or already exist locally. |

### Cards

```text
card_id | deck_id | card_type | front_text | back_text | pronunciation | meaning | notes | tags | rarity | design_set_id | front_media | back_media | image_description | suspended | finish | front_audio | back_audio | sibling_group_id | anki_source
```

| Field | Meaning and validation |
| --- | --- |
| `card_id` | Required stable card ID. |
| `deck_id` | Required ID in Decks or an existing local deck. |
| `card_type` | Required `text` or `visual`. |
| `front_text` | Required for text cards. For visual cards this can hold author guidance, but the study front remains image-only. |
| `back_text` | Required nonblank answer. |
| `pronunciation` | Optional approximation, separate from the answer; label approximations as such in content or notes. |
| `meaning` | Optional natural English meaning. |
| `notes` | Optional grammar, examples or literal explanation; multiline supported. |
| `tags` | JSON array of up to 30 nonblank strings, each at most 100 characters; e.g. `["Verbs","Essere"]`. Blank means `[]`. Tag order and existing duplicate values are preserved. |
| `rarity` | `common`, `uncommon`, `rare`, `holo-rare`, `ultra-rare`, `secret-rare`, or `relic`; blank means `common`. This is authored rarity, never earned status or scheduling difficulty. |
| `design_set_id` | Optional per-card override; blank inherits the deck design. |
| `front_media` | Optional media reference for text cards; required for visual cards. |
| `back_media` | Optional media reference; blank reuses the front image. |
| `image_description` | Required for visual cards; maximum 1,000 characters. Describe visible shapes/actions without spelling out the Italian answer. |
| `suspended` | `true` or `false`; blank means `false`. |
| `finish` | Optional card-level override: `matte`, `metallic`, `holographic`, `prismatic`, `etched`, `starfield`, `crystal`, `gilded`, or `aurora`. |
| `front_audio` | JSON array of up to eight `asset:` references. These controls are available before reveal. Blank means `[]`. |
| `back_audio` | JSON array of up to eight `asset:` references. These controls remain hidden until the answer is revealed. Blank means `[]`. |
| `sibling_group_id` | Optional stable ID shared by cards generated from the same note, such as reversed or cloze siblings. It carries content relationships only, never review history. |
| `anki_source` | Optional validated inert JSON written by HoloRecall. It may include stable note/template identity, source fingerprint, versioned conversion contract and per-field accepted baselines. It is never rendered or executed. |

### Designs

```text
design_set_id | name | background | frame | common_frame | uncommon_frame | rare_frame | holo_rare_frame | ultra_rare_frame | secret_rare_frame | relic_frame | background_fit | background_position_x | background_position_y | frame_fit | credit | source | license | base_finish | rarity_finishes | layout | texture
```

`design_set_id` and nonblank `name` (maximum 160 characters) are required. `background`, `frame`, `texture` and tier-specific frame columns are optional media references. An absent tier frame falls back to `frame`, then the application frame. `background_fit` is `cover` (default) or `contain`; `frame_fit` is `contain` (default) or `cover`. Position coordinates are numbers 0–100, default 50. `base_finish` uses a finish ID above; `rarity_finishes` is a JSON object from rarity ID to finish ID; `layout` is `clean`, `ornate` or `showcase`. Attribution fields are optional plain text. Designs remain declarative: HTML, JavaScript, CSS, active SVG and custom animation code are unsupported.

### Assets

```text
asset_id | file | name | mime | width | height | credit | source | license
```

Each asset row declares one inert media file. `asset_id`, `name` and `mime` are required. `file` is required for portable ZIPs and must end in `.png`, `.jpg`, `.jpeg`, `.webp`, `.mp3` or `.wav`; filenames use letters, digits, dots, underscores and hyphens. MIME and signatures must match: `image/png`, `image/jpeg`, `image/webp`, `audio/mpeg` or `audio/wav`. Raster assets require integer `width` and `height` from 16–4096 pixels; audio leaves both cells blank. Limit: 5 MiB per asset. Optional attribution fields are at most 2,000 characters. Stored bytes and IDs are durable; temporary object URLs are never saved.

## Media portability

Media references are `asset:<asset_id>` for uploaded/packaged raster assets, or an exact bundled path from this allowlist:

```text
/art/limone.svg  /art/caffe.svg  /art/casa.svg  /art/libro.svg
/art/tavolo.svg  /art/mela.svg   /art/libri.svg /art/mani.svg
/art/sono.svg    /art/sei.svg    /art/siamo.svg /art/ho.svg
/art/ha.svg      /art/abbiamo.svg /art/parlo.svg /art/parliamo.svg
/art/italian-still-life.svg
```

These allowlisted SVGs ship with the application and are trusted original project artwork. Uploaded SVG files are never accepted. External image URLs, data URLs in media-reference cells and unknown bundled paths are rejected; an external link is not a bundled asset. Embedded worksheet images are explicitly unsupported and block import rather than being silently dropped.

XLSX alone carries references only. Its `asset:` references must already exist in the receiving browser; use the portable ZIP to share uploads with another browser. A portable ZIP has this exact layout:

```text
deck.xlsx
designs.json
media/<asset filename>.png  (or .jpg/.jpeg/.webp/.mp3/.wav)
```

`designs.json` is a JSON array of design objects, including an empty `[]` when unused. Each object uses the app keys `id`, `name`, optional `background`, optional `frame`, `frames` (object from hyphenated rarity IDs to media references), `backgroundFit`, `backgroundPositionX`, `backgroundPositionY`, `frameFit`, `credit`, `source`, `license`. It must match the workbook Designs sheet after defaults, optional blank omission and object-key ordering normalization. Do not add executable fields. All declared media must be present; extra files, unsafe paths, encrypted archives, multi-volume archives and ZIP64 are unsupported. The exporter converts trusted bundled SVG illustrations to PNG and replaces their references, making its ZIP self-contained. Media is encoded once and reused by ID. An asset ID collision with different bytes is an error: use a new ID for replacement media.

## Preview and atomic updates

Import first reads and validates the entire file, then shows new, updated and unchanged duplicate cards, deck/design changes, bundled asset count and blocking errors. Matching IDs update content; identical content is a no-op. Content revisions increase only for a changed existing card. Omitted cards/decks are never deleted. Updates preserve saved scheduling state, review history, current session and rewards. New cards receive no imported learning state and no unlocks. Applying is one IndexedDB transaction checked against the exact local version observed during preview. If local data changes, inspect the file again; no partial import is saved.

Changing an existing card's meaning substantially while retaining its ID preserves its old review history by design. Prefer a new card ID when it becomes a different learning task.

## Implementation references

The implementation uses pinned ExcelJS 4.4.0 and JSZip 3.10.2. It uses ExcelJS's supported `Workbook`, `xlsx.load`, `xlsx.writeBuffer`, worksheet/cell APIs and JSZip's supported asynchronous read/write APIs. See the [ExcelJS v4.4.0 documentation](https://github.com/exceljs/exceljs/blob/v4.4.0/README.md), [JSZip loadAsync](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html) and [JSZip generateAsync](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html). Limits are checked before decompression, and browser image decoding is required before application.

Regenerate checked-in templates/examples with the repository workbook generator after dependencies and the project Playwright Chromium are installed. The generator writes only the documented public downloads and build scratch files.
