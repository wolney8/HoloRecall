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

### Answer Support outside the card
Potential sections:
- Explanation
- Literal construction
- Rule / pattern
- Worked example
- Usage / examples
- Memory aid
- Reference / source
- Additional detail

The support layer must not move/recentre the card or interfere with rating.

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

## 11. New open decisions for next design session

### 11.1 JSON authoring scope
Decide:
- whether the JSON import should use a strict official schema only;
- whether HoloRecall should also accept a forgiving "simple JSON list" and map it automatically;
- whether users can save reusable schemas per subject.

### 11.2 Subject-neutral back-face field labels
Because cards will not only be language cards, decide the generic field system.

Candidate approach:
- Primary answer
- Secondary line
- Additional details
- Extra sections

With optional subject presets:
- Languages: Pronunciation / Meaning / Usage
- Maths: Method / Formula / Worked note
- Science: Definition / Rule / Example
- History: Date / Context / Notes

### 11.3 Canva-style round trip depth
Decide whether reimported design templates are:
- full-card flattened art only;
- layered regions with known anchor zones;
- or a hybrid where HoloRecall exports a designed shell and the user edits only the illustration/art panel.

### 11.4 Auto-generation of rarity variants
Decide how much the system should auto-derive from one uploaded base design:
- frame colours
- foil treatments
- chip styles
- card backs
- prestige variants
- seasonal variants

### 11.5 Prestige visual cadence
Now that Prestige is capped at 10, decide whether:
- every level has a visible change,
- or levels are grouped into milestones (for example 1–3 / 4–6 / 7–9 / 10).

### 11.6 Design suite guardrails
Decide how much freedom the user gets before the UI becomes too complex:
- simple mode only
- simple mode + advanced mode
- locked curated templates for most users with deeper controls for power users
