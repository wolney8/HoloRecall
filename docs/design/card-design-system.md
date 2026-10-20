# HoloRecall — Card Design System Decisions

**Status:** Living design brief
**Purpose:** Capture Will's confirmed card-design, progression, collection, and interaction decisions before producing a lean Codex implementation prompt.

## Confirmed product principles

- HoloRecall must work across many learning domains, not only languages.
- Learning clarity comes first; collectibility and spectacle sit around the learning interaction.
- Rarity, finish, frame, artwork, mastery, and entitlement are separate concepts.
- The same learning card should remain one learning object even as its collectible presentation evolves.

## Confirmed rarity / finish model

**Decision: Hybrid model (C).**

- Authored rarity remains stable.
- Finish/frame treatment is technically separate from rarity.
- Higher rarities unlock access to more extravagant treatment pools.
- New finishes do not require new rarity tiers.
- Mastery/Prestige can enhance presentation without silently rewriting the authored rarity.

Examples:
- Rare + Gloss
- Rare + Holographic
- Rare + Borderless Prismatic
- Rare + Etched Showcase

## Confirmed Design Set inheritance

**Decision: cards follow their deck/set Design Set until manually overridden.**

Inheritance:
1. Global HoloRecall defaults
2. Deck / set Design Set
3. Rarity-compatible variant inside the Design Set
4. Per-card override

Rules:
- New cards inherit the active deck/set Design Set automatically.
- Compatible Design Set updates flow through to cards that still inherit from the set.
- Manually overridden cards keep their override until the learner chooses to return to inherited styling.
- Design changes never alter scheduling, content identity, or review history.

## Confirmed mastery / Prestige direction

- A card's rarity presentation may begin locked.
- Genuine eligible mastery activity unlocks the card's rarity presentation.
- Continued mastery after the rarity presentation is unlocked should not become a dead end.
- Once a card reaches its current mastery ceiling, it may enter **Prestige**.
- Prestige resets only the cosmetic/mastery progression loop for the next prestige cycle.
- Prestige must never reset FSRS state, review history, due dates, actual learning progress, content, or deck membership.
- Prestige should visually evolve the existing card rather than invent endless higher rarity tiers.
- Prestige is implemented as ten event-derived cosmetic cycles. The authored-rarity unlock is the mastery ceiling; only later eligible scheduled reviews contribute to Prestige.
- Cycle thresholds for P1–P10 are 3, 3, 4, 4, 5, 5, 6, 6, 7 and 8 qualifying days. They are a versioned product constant (`prestige-days-v1`), not scheduler mathematics.
- Anki Mode and Mastery Mode use genuine scheduled review events and are eligible. Free Revision is practice-only and ineligible.

Possible prestige rewards:
- prestige star / pip / crest
- upgraded edge treatment
- richer foil response
- subtle frame evolution
- alternate accent treatment
- prestige stamp
- advanced Collection inspection animation
- special card-back treatment

## Confirmed card content hierarchy

### Source semantics and card title
- A source-visible title/category may appear above the recall target when template evidence supports it; deck Topic/Lesson metadata is not promoted merely because it exists.
- Top-left chrome resolves in this order: a safe explicit title, one unambiguous short source-backed contextual value, then the current leaf deck/subdeck name. The deck fallback remains presentation-only and follows deck moves/renames. Capability, note-model/template, answer and prompt values never substitute for a title; capabilities remain in bottom chrome.
- Source learning semantics override decoration. Text-first cards use material, frame, typography, rarity and restrained motifs without repeating their prompt as generated artwork.
- Design Sets style learning content; they do not invent learning meaning. Native Image Occlusion uses its masked/revealed image as the task and may have no textual answer.

### Recall face
- Primary question / prompt / recall target is dominant.
- Artwork or visual panel supports the prompt rather than replacing it.
- Optional concise context and answer-choice chips may appear as supporting elements.
- Lesson/topic/type metadata should not dominate.

### Answer face
- Primary answer is dominant.
- Domain-specific secondary cues may follow (for example pronunciation, formula, unit, definition, syntax cue).
- Short interpretation/meaning may remain on-card when useful.
- Longer supporting material should normally move outside the card into progressive disclosure.
- Concise text answers use an answer-first showcase: source-backed context moves to the small top chrome, a decorative spark and optional category chip remain restrained, and the unboxed primary answer becomes the strongest central element with its secondary cue directly beneath in a palette-derived accent. Ornament and answer share one body-stage grid: the ornament stays near the stage top without reserving a separate content block, while primary and secondary content centre as one group against the complete usable body. Adaptive-short and ordinary short answers use untransformed rendered-font metrics to prefer a one-line fit, then a modest reduction, then balanced wrapping at safe word or hyphen boundaries; emergency token breaking is reserved for content that cannot fit at the accessible floor. Redundant revealed guidance and repeated panel headings are omitted.
- Visual answers, instructional images, Image Occlusion, genuinely long or multi-block answers, and explicit Design Studio composition previews retain their specialist compositions.

### Card Details outside the card
The collectible Answer face remains concise: primary answer first, then an optional subject-neutral secondary cue, concise example or short interpretation. Meaningful extended source material lives outside the physical card in a lazy Card Details surface.

Potential sections:
- Natural English / interpretation
- Explanation or literal construction
- Rule / pattern or forms to notice
- Method or worked solution
- Usage / examples
- Memory aid
- Reference / source
- Additional or original card detail

Structured headings, paragraphs, lists, tables and code remain semantically structured. Unknown but safe meaningful source material is retained under a collapsed `Original card details` fallback rather than discarded. The support layer appears only after reveal and must not move/recentre the card, move desktop rating controls, or break the compact rating dock.

## Card interaction and confirmed later Collection decisions

The card interaction decisions are implemented by the shared renderer and Study host; Collection ownership/progress remains deferred:
- user-facing supporting content is named **Card Details**;
- Study uses **Check answer**, with keyboard-capable web/desktop guidance for `Space or Enter to flip and recall`, `1–5 rate your recall` and conditional `Z to inspect image`;
- imported non-empty clues are presumed useful. After ten active, settled Recall seconds, Study unfurls a card-edge **Need a clue?** fabric pennant using the application type system. Opening it attaches a content-driven palette-aware paper sticker inside the card transform; its clipped sheet exposes card surface beneath a separately lifted reverse-face corner, and content expands without nested scrolling. The entire sticker is one accessible removal control. Its lifted region leads the sheet/body peel, and the pennant returns only after removal settles, with no second delay. Content-aware image/choice/text safe zones and the Image Occlusion target side guide placement. Lifecycle inactivity, inspection and owned card motion pause only the first delay, and clue viewing/removal never changes learning state. Reduced Motion preserves the resting peel and uses fade state changes;
- top chrome contains the resolved source/context/deck title plus rarity. Bottom chrome contains derived capability indicators and a small accessible face marker. Static open/resolved material geometry distinguishes Recall from Answer without redundant visible face words;
- native iOS and coarse-pointer layouts omit keyboard prose. Expand/Z reuse image inspection and are unavailable during owned card motion;
- pointer input sets a target surface orientation. One damped render state drives tilt, ambient glare and rarity shimmer through entry, movement and neutral settlement; pressure remains an independent continuous depth value and never resets the current orientation;
- compact Study context uses one display-only hierarchy rule: a trustworthy course ancestry becomes `Lesson N · cleaned current topic`, direct lesson-parent study uses its cleaned parent subject, and ordinary decks use the cleaned current leaf. Date/version noise and numeric child prefixes are removed even when parent and child names arrive in one combined hierarchy value. Stored deck names and imported hierarchy remain unchanged;
- the browsable Collection contains unlocked cards; its default prioritises unlocked and near-unlock progress, while deck/set views may show locked silhouette slots;
- Collection progress is collectible-only: unlocked/total, rarity distribution and Prestige, without due/FSRS scheduling data. Near unlock ranks locked cards by remaining qualifying days, completion ratio, then stable source order.

### Collection ownership and locked slots

Normal Collection surfaces render the shared card only for an earned authored-rarity collectible. Global search and practice are restricted to those owned cards. Near-unlock and scoped-set locked positions use a dedicated card-back silhouette whose input contains only set/deck identity, authored rarity, stable position and derived progress; prompt, answer, cues, source media and source details never enter its DOM or accessible name. A scoped set preserves stable source order, mixing owned rendered cards with lightweight locked slots. Prestige remains a layer on an owned card and never increases set completion beyond one card.

### Physical card presentation scales

Physical card objects use one shared motion viewport that contains transformed paint without changing page scroll bounds. A focal collectible is used for Study, inspection and earned reveals. A mini collectible uses a real 2:3 layout box, normally 210–230 px wide on desktop, for grids and summaries; it is not a transformed focal card. Owned minis use the shared renderer. Locked minis use a separate privacy-safe physical shell with only rarity, position and progress inputs. Review history, search results and progress statistics remain metadata rows.

## Confirmed uploaded-art integration direction

Uploaded artwork should not feel pasted onto a template.

Design Studio should integrate it compositionally using declarative controls such as:
- crop / focal point
- contain / cover / full bleed
- masked artwork window
- edge bleed / background extension
- blur / sampled-colour / gradient extension
- vignette / edge fade
- tint / duotone / colour harmonisation
- texture blend
- rarity overlay
- protected text-safe zones
- optional foreground/background depth layers

HoloRecall should derive a small palette from uploaded artwork to harmonise:
- background gradients
- frame accents
- chips
- dividers
- recall/answer panel tints
- glow / shine accents

The original source asset remains unchanged and exportable.

## Confirmed Collection Desk direction

HoloRecall should have an optional tactile tabletop collection mode alongside a practical Binder/Grid mode.

### Collection Desk interactions
- deck/set stacks shown as physical-looking piles
- expand/fan/spread a deck
- unlocked cards visible
- locked/unknown cards shown as card backs/silhouettes/obscured slots
- shuffle animation
- deal/throw cards onto the desk
- drag/rearrange cards
- overlap and spatially organise cards
- pick up a card to inspect
- tilt/parallax inspection
- flip front/back
- return card to desk/deck
- tidy/regroup/reset layout

### Safety boundary
The desk is exploratory/cosmetic. Moving cards must not change:
- FSRS
- ratings
- rarity
- mastery
- deck membership unless an explicit management action is used

### Accessible parallel view
Maintain a Binder/Grid view that is:
- searchable
- filterable
- keyboard accessible
- screen-reader friendly
- suitable for large collections

## Confirmed deck/set collectibility direction

Decks may behave like collectible sets with:
- set icon
- card numbering (for example 12/42)
- unlocked count
- mastered count
- Prestige count
- rarity distribution
- completion percentage
- missing/locked silhouettes
- featured/chase card(s)
- set-specific Design Set/frame family
- Collection Desk stack

Set completion and learning/scheduling state remain separate concepts.

## Open decisions

1. Prestige cadence and maximum Prestige level.
2. Exactly which Study Modes advance rarity unlock, mastery, and Prestige.
3. How much locked cards reveal.
4. How deep/physical Collection Desk interactions should be.
5. Whether desk layouts persist between sessions.
6. Whether opening a deck is a simple fan, shuffle/deal, or box/sleeve/binder presentation.
7. How automatic user-created Design Set generation should be.
8. Whether a learning card has one collectible visual state at a time or a gallery of unlocked visual variants/editions.
9. Whether set-level completion can unlock special frame families/card backs/table surfaces.
10. Whether Prestige should be visually cumulative or reset to a cleaner 'Prestige edition' each cycle.

## 10. Additional confirmed decisions — 11 October 2026 (evening)

### 10.1 Design Suite direction — CONFIRMED

The Design Suite must be:

- responsive
- interactive
- very simple to use
- fast to understand for non-designers
- suitable for both deck authors and ordinary learners

The workflow should support **two equally valid creation paths**:

#### Path A — Structured content-first authoring
The user can add card content in a simple structured format before choosing designs.

Example content model:
- front title / prompt / instruction / clue
- back primary answer
- back secondary answer field such as pronunciation, formula name, symbol name, or equivalent subject-specific subtitle
- back additional details
- optional tags / category / difficulty / source / notes

This should support:
- manual entry in-app
- paste/import of a simple JSON-style list
- safe batch creation for many cards at once

#### Path B — Template export and reimport workflow
The user can export a card template, take it into a design tool such as Canva, add artwork, and then reimport it.

Requirements:
- exported template must preserve safe zones, crop/bleed guidance, and placement anchors
- reimport should reconnect the designed artwork to the card/template cleanly
- the system must then still allow HoloRecall rarity, finish, animation, and effect layers to be applied or mixed in after reimport
- this must not feel like the imported image is merely pasted on top of the card

### 10.2 Uploaded-art integration — CONFIRMED DIRECTION

If a user uploads artwork for a card design (for example a plain white background with a smiley-face emoji), HoloRecall should integrate it **into** the card design rather than looking like a flat sticker floating above the surface.

Desired visual qualities:
- embossed / ironed-in / printed-into-the-card feeling
- harmonious integration with the card frame and surface
- palette-aware blending
- proper crop/focal placement
- optional texture interaction
- controlled highlights/shadows
- compatibility with rarity and finish overlays

The uploaded art should be able to participate in:
- foil or gloss response
- frame masking
- borderless or framed variants
- subtle depth separation
- rarity-specific treatment layers

The goal is that uploaded art feels natively authored within the HoloRecall card system.

### 10.3 Prestige cap — DECIDED

Prestige is now capped at **10 levels** for the initial product design.

Implications:
- Prestige 1 through Prestige 10 should each feel meaningfully different.
- The visual system must be designed so later Prestige levels remain aspirational without becoming visually chaotic.
- After Prestige 10, the card should stop Prestige progression unless a future explicit extension is designed.

### 10.4 Locked-card reveal philosophy — DECIDED

Locked cards should use a **teaser silhouette** approach.

Recommended reveal contents:
- locked card back or obscured front
- set slot / numbering
- teaser silhouette
- possibly rarity-coded hinting or frame family hinting
- no revealing of the actual learning answer

This is meant to create curiosity and completion motivation without leaking the educational content.

## 11. Design Suite foundation decisions — CONFIRMED 11 October 2026

### 11.1 JSON authoring

HoloRecall supports both a versioned official structured schema and a friendly JSON list that normalises into that schema. Both paths validate completely before an atomic apply. Subject-specific reusable schemas remain a future option.

### 11.2 Subject-neutral learning fields

The domain uses **Primary answer**, **Secondary line**, **Short interpretation**, and labelled **Supporting sections**. Friendly subject presets may label those concepts as Pronunciation/Meaning/Usage, Formula/Method/Worked note, Definition/Rule/Example, Date/Context/Notes, or Syntax/Explanation/Example. Legacy language fields remain readable compatibility aliases; the renderer and new authoring contracts do not assume a language subject.

### 11.3 External artwork round trip

V1 exports an artwork-region guide rather than a flattened editable learning card. The guide communicates exact 2:3 dimensions, bleed, safe zones, focal/art region and protected content regions. Reimport supplies a source artwork asset; HoloRecall continues to own learning content, frame, rarity, finish, motion and accessibility layers.

### 11.4 Rarity variants

One base Design Set derives a coherent family across all authored rarities through declarative frame, accent, material/finish, texture and effect-intensity differences. A user may supply a bespoke asset override for an individual rarity. Rarity variants must remain recognisably part of one set rather than seven separate designs.

### 11.5 Layout and generated-art templates

The curated initial composition family is Full Bleed, Framed Art, Illustration Window, Split Art / Content, Typographic Showcase, Minimal Prestige, Diagram / Technical, Photo Focus, and Symbolic / Generated Art. A Design Set may lock one layout or permit a deterministic suggestion that the learner can override. Media-free art is local, deterministic, portable and derived from stable card/deck/topic/type/rarity/Design Set inputs; it is not generic network AI clip-art.

Typographic Showcase is an intentionally centred composition. Its primary prompt, concise cue, situation/context, guidance and hint share the same content axis and compatible maximum width; symmetric rules may separate context without shifting it. Split Art / Content, Diagram / Technical and image-led compositions retain alignment suited to their own structure.

### 11.6 Design Suite guardrails

The default Design Suite is content-first and progressively disclosed. Design identity, Artwork, Layout, Rarity variants and Preview form the primary path. Composition/material controls are grouped behind Advanced disclosure. The UI exposes declarative product choices rather than raw CSS.

### 11.7 Printed-surface composition

Artwork, generated motifs, frame, protected learning copy and inert chips share one palette-derived material family. The default artwork treatment is a restrained printed blend: source pixels remain unchanged while tint, edge transition, surface texture and shallow relief integrate them with the card. Prompt and answer surfaces may carry that material response, but their contrast and hierarchy take precedence over decoration. Rarity changes the accent/finish response without creating a disconnected visual layer. Reduced Motion and Effects Off suppress decorative texture/motion while retaining readable static composition.

## 12. Remaining open decisions

1. How much locked teaser silhouettes reveal beyond numbering/frame hints.
2. Collection Desk interaction depth and whether desk layouts persist.
3. Whether one learning card can retain a gallery of unlocked editions or only one active collectible presentation.
4. Whether set completion unlocks special frames, card backs, or future desk surfaces.

## 13. Prestige visual cadence — implemented 11 October 2026

Prestige is a cumulative enhancement after Design Set, rarity variant and finish. P1–P2 strengthen the edge and add the compact `P I`/`P II` crest. P3–P4 enrich frame detail and foil response. P5 is the midpoint treatment with a stronger material line and reflection profile. P6–P7 deepen that same family. P8–P9 add the premium static edge-light response. P10 is the capstone double-line material treatment and `P X` crest. These are bands of one coherent design family, with the numeral providing an exact non-colour distinction at every level.

Effects Off and Reduced Motion retain the crest, numeral and static material border while suppressing decorative response. The shared renderer receives only the derived level; it does not own progression rules. Study keeps ratings and recall content dominant, while Collection and Results show the full milestone treatment.

## 14. Subject presentation and Study artwork — implemented 12 October 2026

The generic learning card remains subject-neutral. A presentation profile may interpret retained source content for a subject without replacing the authoritative prompt or answer. The first profile is `language`: its recall face prioritises the concrete retrieval task, then a natural-language cue and concise grammatical/situational guidance. Its answer face keeps the target answer dominant, pronunciation secondary and a short meaning/interpretation on-card; long labelled sections stay in Card Details.

In wide Study, Card Details belongs to the complete revealed-answer stage: card and rating controls form the first row and support spans beneath both. Compact Study orders card, rating controls, then support. This keeps ratings immediately reachable while giving reference prose, lists and tables a readable width outside the collectible object.

Inspectable Collection cards use the shared card interaction contract. They start on Recall, toggle through click/tap or focused Enter/Space, and treat pointer movement past the shared gesture threshold as tilt rather than a flip. Turning a card is presentation state only and never writes reviews, scheduling, mastery, Prestige, rarity or content. Accessible names expose Recall versus Answer even when redundant visible side labels are omitted.

Artwork has a non-destructive Study role: `instructional`, `supportive`, `decorative` or `hidden`. The source asset and Anki provenance remain stored for every role. Study artwork policy inherits from Design Set to deck to card override and offers Auto, Image first and Text first. Auto uses image-first only for instructional art; supportive/decorative language art uses the Typographic Showcase while retaining the same Design Set, rarity, finish, printed material and Prestige layers. Text-first is a collectible composition, not a plain application panel.

## 15. Revealed Study and Results inspection — implemented 12 October 2026

Card Details is the reference layer for the whole revealed Study stage. On wide layouts the collectible answer and rating controls share row one, with support close beneath both; compact layouts stack card, ratings and support. Recognised term/role pairs and tables retain their semantic relationships, readable line structure and local overflow instead of becoming a text dump. Pronunciation or another semantic secondary line inside a table cell renders beneath the primary term with the same subordinate accent treatment used by the Answer face. Section spacing and grouped row surfaces provide rhythm; rules are reserved for meaningful major boundaries rather than every source block.

Once Answer is revealed, activating the card may show Recall for approximately 2.5 seconds before returning to Answer. This Recall Peek is presentation-only: rating controls remain available and the session never becomes unrevealed. Results collectibles follow the same pure inspection contract as Collection—Recall by default, click/tap/Enter/Space to toggle—and retain real Design Set, rarity and Prestige treatment. Animation-only replay is not part of Results navigation.


## Image Occlusion presentation

Image Occlusion is a specialist learning composition within the same Design Set family. Header and the masked source image dominate Recall; Answer reveals the active target according to the source mode, with concise Back Extra on-card only when it remains readable and extended material in Card Details. Rarity, finish, frame and Prestige may surround the task, but they must not cover or visually compete with masks. Mask state is communicated with contrast plus accessible authored text, never animation or colour alone. Collection and Results flips are pure presentation and use the same masked/revealed renderer.

The task-first composition gives the uncropped, contained source image the main usable card area. A fallback instruction may be a compact overlay on Recall but must not displace the diagram; visual-only Answer has no empty copy panel. Finish motion is suppressed over the occlusion task while the Design Set material, frame, rarity and Prestige identity remain.

Meaningful card images expose one explicit Expand image control. The shared Material inspection dialog preserves the opening Recall/Answer face, uses the same declarative occlusion geometry, traps/restores focus and blocks underlying interaction. It supports bounded 1×–5× explicit zoom/reset, wheel zoom, pointer/touch pan and two-pointer pinch; image and masks transform as one viewport. Study pauses Auto Advance while it is open and inspection never changes reveal, rating, FSRS, review, reward or queue state. Compact landscape reduces the viewport rather than hiding controls; Reduced Motion avoids decorative spatial transitions.

## Production collectible interaction model

The shared card renderer owns one cached surface state for tilt and `pressProgress`. Ambient glare, grazing reflection and rarity interference derive from that state. Common has no persistent spectral film; Holo Rare and Ultra Rare add progressively deeper theme-aware interference while retaining the authored Design Set, frame, finish, background and texture. Card Effects controls decorative material layers and fragments. Motion independently uses System, Full or Reduced; static rarity and face identity remain when motion is reduced or effects are off.

Recall uses the quiet unresolved echo signature. Answer uses only a broad, diffuse luminance and tone wash: it has no ring, central icon, bloom or other recognizable watermark object competing with the answer. The treatment is further restrained for visual answers. A one-line textual answer of at most four Unicode grapheme clusters may enter adaptive-short presentation: the renderer measures the actual font, fits within 74% of the answer region, caps the size and falls back to ordinary short layout below the accessible minimum. Semantic pronunciation uses palette-derived subordinate type and presentation-only curly quotes; generic secondary cues remain unquoted.

In Study, the transformed card and deck shadows live inside a fixed padded paint envelope with clipped overflow. The envelope reserves the approved tilt, shadow and attached-control margin without changing the card's layout footprint; shortcut guidance remains outside it. Card tilt and material motion must not change page scroll dimensions or position.

Study clues retain the ten-second active Recall threshold. Availability unfurls an attached pennant. Opening places a compact card-bound sticker with attached front, visible underside, exposed surface and separation shadow at an 18% resting peel. GSAP advances one normalized peel value; removal completes before the pennant returns, with no second delay. Reduced Motion uses short fades. Rating acknowledgement stays on the retained card and scales from no facets at ratings 1–2 to restrained local facets at 3–5.

Collection Desk presents top-level sets as lightweight card-back stacks and places owned or privacy-safe locked mini collectibles in a finite table world clipped by a stationary viewport. Empty-surface drag pans a clamped camera; owned and locked cards retain world coordinates and remain keyboard movable. Desk translation and restrained placement rotation belong to an outer positioning layer; shared card tilt, lighting and face presentation remain on the inner collectible. Selection may lift the outer object without changing its content. A fixed stack dock renders exactly one real owned or privacy-safe locked top card matching the next deal item, deals one item per activation, and accepts loose cards returned by drag or controls. Owned cards may flip; locked cards never do. Large sets instantiate progressively rather than mounting every interactive card at once.

Earned authored rarity uses a deterministic card-back rise, edge/turn reveal, resolved face, rarity bloom and local facets. It has no pack or random-reward metaphor. Prestige promotion keeps the existing card visible and applies the crafted Roman-mark stamp/material acknowledgement instead of the earned-card reveal.
