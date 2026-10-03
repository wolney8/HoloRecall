# Prompt: generate a HoloRecall version-4 deck

Create a HoloRecall deck-content workbook for **[subject and learner level]** using the attached blank workbook and `deck-format.md` specification. Return a real `.xlsx` file, not a Markdown table renamed to `.xlsx`.

- Keep the exact sheet names and ordered header rows. Required sheets: Metadata, Decks, Cards. Metadata has exactly `format_version=4` and `content_only=true`. Optional Designs and Assets sheets use the specified headers.
- Use literal cell values only. No formula cells, named ranges, hyperlinks, rich-text cell objects, dates, macros or embedded worksheet images. Preserve Unicode accents and actual newlines.
- Use stable unique IDs matching `[A-Za-z0-9][A-Za-z0-9._-]{0,99}`. Retain supplied IDs only when updating the same learning task. Each card references a supplied deck ID. Use `parent_deck_id` for an intentional hierarchy and `sibling_group_id` for cards generated from one note; never infer either from title punctuation. Never include learner state, reviews, scheduling, XP or unlocks.
- Write short recall tasks that test one thing. `card_type` is `text` or `visual`. A text card needs front_text; every card needs back_text. Keep pronunciation, meaning and notes separate. Mark pronunciation approximations as approximate, not IPA.
- Store tags as a JSON array of strings. Rarity is one of `common`, `uncommon`, `rare`, `holo-rare`, `ultra-rare`, `secret-rare`, `relic`; default to `common` unless requested. Authored rarity never proves knowledge or grants earned status.
- For visual cards, provide a relevant illustration reference and an answer-safe image_description. Do not place the answer in the picture or the front description. Use the same picture on the back by leaving back_media blank unless a distinct image is necessary.
- Media references must be an exact allowlisted bundled `/art/...svg` path, or `asset:<asset_id>` with actual matching PNG/JPEG/WebP bytes. Do not invent downloadable images, use unrelated illustrations or treat an external URL as a bundled file.
- If supplying new media or designs, also return a portable ZIP with exactly `deck.xlsx`, `designs.json` and the declared `media/` files. `designs.json` must match the Designs sheet. Images must decode, match their declared dimensions, be 16–4096 pixels per side and at most 5 MiB each. Recommend transparent PNG frames. No uploaded SVG, HTML, CSS, JavaScript or active content.
- If media is unavailable, produce appropriate text cards and state that limitation. Never label placeholders as finished illustrations.
- Validate required fields, IDs, references, allowed rarity/type/fit values and all supplied assets before delivering. Maximum 5,000 rows per sheet; see the specification for exact field and archive limits.

Deliver the workbook (and ZIP if media is included) with a short count of decks/cards, any limitations, and whether the file is new content or an intended stable-ID update. Do not fabricate learning history or claim the deck has been studied.
