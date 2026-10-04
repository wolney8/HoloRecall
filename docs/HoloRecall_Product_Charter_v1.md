# HoloRecall — Product Charter and Delivery Contract

**Version:** 1.1
**Recorded:** 30 September 2026; platform contract confirmed 4 October 2026
**Product director:** Will
**Planning and architecture:** ChatGPT
**Implementation and engineering coordination:** Codex

**Document status:** Adopted as the repository's authoritative product-direction and delivery-contract baseline on 30 September 2026. Implementation status and evidence remain in `docs/project-status.md`; this charter does not itself prove that a capability exists. Commercial and implementation choices labelled proposed remain unapproved policy.

**Current handoff:** Recover the exact current state from `docs/project-status.md`; never reset to a checkpoint recorded in this charter. The confirmed targets are Web, iOS/iPadOS, Android and Apple-silicon Mac. Intel Mac and AnkiWeb Sync are not planned.

## 1. Product definition — confirmed direction

HoloRecall is a configurable spaced-repetition learning application for **Web, iPhone, iPad, Android phones/tablets and Apple-silicon Macs**, with the functional ambition of Anki and an original collectible-card presentation inspired by the tactile appeal of trading-card games. Intel/older Mac support is **not planned**.

It must be a capable learning tool, not a decorative flashcard demonstration. Users should be able to create and organise decks, configure study, import and export content, inspect their learning history, and carry their collection between supported platforms. Cards also belong in a visually rich collection: rarity organisation, reusable designs, foil and sparkle finishes, earned cosmetic reveals and progress toward future unlocks.

The product has three equal obligations: dependable learning, satisfying collection presentation, and trustworthy ownership/portability. Animation cannot compensate for missing study controls or unsafe data handling. Advanced capability should sit behind progressive disclosure rather than overwhelm the everyday interface.

Trading-card games are visual inspiration, not a requirement for combat mechanics, trading economies, branded artwork or copied card layouts. HoloRecall keeps its own identity.

### Product reference model

- **Anki is the functional reference.** Use its current documented capabilities to guide scheduling, learning configuration, authoring/templates, organisation/search, review history, imports/exports, backup and study controls. HoloRecall does not copy Anki's visual design, import authoritative Anki scheduling state or operate as an AnkiWeb client. **AnkiWeb Sync is not planned.**
- **Duolingo is the qualitative interaction reference.** Learn from its tactile pacing, restrained haptics, concise mobile surfaces, progress feedback and post-study/reward choreography without copying its assets, sounds, branded layouts or proprietary animation work.
- **Collectible card games are the collection reference.** Use their premium tactility, rarity, finishes, inspection and reveal qualities without copying copyrighted frames, characters, trademarks or layouts.
- **HoloRecall remains the product identity.** Its five-confidence FSRS workflow, original artwork, Material 3 interface, collectible presentation and trustworthy local-first data model remain authoritative.

## 2. Authority and responsibilities

| Role | Responsibility | Decision boundary |
|---|---|---|
| Will — product director and owner | Sets product intent, audience, desired experience, commercial preferences and priorities; accepts or rejects the delivered experience. | Final authority over product direction, paid commitments, commercial scope and releases. Does not need to supply implementation details. |
| ChatGPT — product/technical planner | Turns direction into architecture, coherent milestones, tracked requirements, acceptance criteria and focused Codex briefs. Challenges weak assumptions, exposes trade-offs, and reviews returned evidence. | Prioritises and recommends within Will's mandate; does not silently redefine the product or claim repository changes without performing or inspecting them. |
| Codex — engineering coordinator and implementer | Inspects the repository, creates an executable plan, delegates suitable work, implements, integrates, tests, documents and reports. | Makes routine engineering decisions within the authorised scope; escalates genuine blockers, destructive choices, new expenditure and external publication. |

ChatGPT's planning role and Codex's execution-coordination role are complementary, not competing product ownership. Codex retains responsibility for integrating delegated work. A subagent's completion message is not final acceptance evidence.

## 3. Product scope and Anki capability mapping

**Confirmed ambition:** comparable user-facing learning capability to Anki, including configuration, authoring, organisation, imports and exports. **Not a current claim:** complete Anki parity or universal compatibility.

Anki's own documentation is the reference for a maintained capability inventory, not an instruction to copy its entire interface. Its documented surface includes media, configurable card layouts, deck options and scheduling, while exported deck and collection packages have different meanings. [S1–S3]

The inventory should cover authoring/note models and templates; basic/reversed/cloze and visual/audio cards; deck hierarchy, tags, search and bulk management; scheduling and per-deck options; study controls and review history; statistics; import/export; backup/restore; and cross-device continuity. Inspect the relevant current official documentation before turning any category into an exact parity claim.

Each capability needs an ID, source/version reference where relevant, intended HoloRecall behaviour, current status, platform evidence, acceptance criteria and proposed free/paid treatment. An intentional difference is recorded and approved, not quietly removed from the ambition.

Keep current FSRS behaviour and the established five-confidence-level mapping intact. Do not manufacture a fifth FSRS grade, apply irrelevant legacy settings, or alter review outcomes to improve reward eligibility.

Anki add-ons and executable custom templates are separate compatibility questions. Safe functional equivalents may be appropriate; arbitrary imported code execution is not implicitly authorised. Unsupported features must be visible in the compatibility matrix and import preview.

**Import and export are separate capabilities.** The current `.apkg` import task does not establish `.apkg` export, full Anki round trips, AnkiWeb interoperability, or review-history migration. Track those separately rather than treating a HoloRecall ZIP as an Anki export.

The existing default remains **content-only Anki import**. A later migration of a learner's own history would need explicit opt-in, provenance, mapping, backup and validation. It must never grant fabricated HoloRecall rewards or silently inherit another person's study history.

## 4. Cross-platform contract

Web, iOS/iPadOS, Android and Apple-silicon Mac are product targets for every meaningful change. They share learning semantics, stable data contracts and portable content; they do not need identical platform-specific implementations. Web remains a first-class product developed alongside the native applications.

**Existing direction retained:** Angular and Angular Material/Material 3 for the shared application; Capacitor for normal iOS/iPadOS and Android native delivery; local-first operation; Vercel/Neon/authentication/sync as previously discussed future architecture, not authorised deployments. A Capacitor shell is a legitimate native-store delivery architecture, but generated projects alone do not prove native quality. [S4]

**Apple-silicon Mac route:** first target the compatible iPhone/iPad application made available on Apple-silicon Macs, subject to actual Mac acceptance for resizing, keyboard/pointer, storage, Files/share, lifecycle and plugins. Intel Mac support is not planned. Capacitor itself is not represented as a standard macOS target.

**Supported-OS policy:** support the oldest OS/API level safely supported by the selected maintained Capacitor stack and required plugins. With Capacitor 8 the current expected baselines are iOS/iPadOS 15+ and Android minSdk 24 (Android 7+), with Android compile/target SDK matching Capacitor 8 requirements. Do not lower framework versions to support obsolete systems or raise minimums without evidenced technical, plugin or security need and a recorded product decision. Maintain a matrix of minimum, target/tested versions, Simulator/emulator evidence, physical-device evidence and known limitations.

Keep scheduling, rewards, import conversion, session metrics and schemas independent of browser/native APIs. Reuse narrow persistence, lifecycle, asset, file-delivery and interaction-feedback boundaries. Capacitor APIs belong in platform adapters rather than domain logic or scattered components. Every meaningful feature assesses persistence, filesystem, lifecycle, offline behavior, touch, keyboard/pointer, safe/system areas, haptics, motion, accessibility, file sharing/import, performance and permissions across all confirmed targets.

Local study, interruption-safe persistence and full backups remain priorities. Loaded-tab offline operation, offline cold start, native offline startup and synchronisation are different capabilities. Record each independently.

Synchronisation is not backup. Future sync requires conflict handling, deletion semantics, media recovery and multi-device review reconciliation. Native storage, packaging and device verification remain unfinished until supported by evidence.

## 5. Learning, collecting and monetisation stay separate

Preserve independent concepts for:

| Concept | Meaning |
|---|---|
| Learning content | Notes, prompts, answers, media and deck organisation. |
| Scheduling/history | The learner's review events and scheduler state. |
| Authored rarity | The tier assigned to a card by its creator or import policy. |
| Design and finish | Reusable frames, backgrounds, textures and application-controlled effects. |
| Earned cosmetic state | The learner's actual eligible progress and unlocks. |
| Product entitlement | Access to paid application capabilities. |

Buying the full product is not the same as earning every cosmetic. An imported high-rarity card remains studyable before its premium presentation is earned. Paying never improves a scheduler grade or fabricates learning progress.

Preserve the existing seven rarity identifiers and their data meanings. Expand the richness of finishes and design families without conflating every finish with a new rarity. Collection views should support useful rarity/design/earned-state organisation and inspection.

Gamification must acknowledge honest effort, including low-confidence reviews. Use real progress and restrained celebrations. Do not introduce paid random packs, punitive streak systems, unverifiable mastery claims or another score merely to make the interface busier.

## 6. Commercial direction and decisions still open

**Will's preference:** a generous free web edition and a possible one-time purchase that provides the full paid-edition feature set and app access.

**Working interpretation to confirm through the eventual feature matrix:** approximately 75–80% of capabilities in the free web experience, rather than a literal quota of 75–80 features. “Full after purchase” means included paid-edition functionality without a further software subscription, not a promise that all future resource-consuming services are unlimited forever.

### Proposed tiering — not approved restrictions

| Edition | Proposed purpose |
|---|---|
| Free web | A useful standalone learning product: everyday study, creation, organisation, essential progress, ordinary collection presentation and dependable data export. |
| One-time full licence | The complete defined software feature set, including the agreed advanced collection/design/productivity features and access across the supported apps and web. |
| Future metered services, only if needed | Separately costed hosting, unusually large storage or paid AI services; no commitment to such a tier or subscription now. |

Do not weaken scheduling correctness, accessibility, failure recovery or data ownership in the free edition. Do not retrofit restrictions onto Will's current prototype while pricing remains undecided.

**Recommended principle:** one product licence recognised across supported platforms rather than charging the same person separately for each screen. The precise free/paid matrix, price, purchase surface, family policy, upgrade policy and cloud allowance require Will's approval.

Apple offers universal purchase across related Apple-platform apps, but this does not automatically provide a website entitlement. Apple's payment rules distinguish digital unlocks, multiplatform services and storefront-specific exceptions. The final purchase flow requires a fresh review of the applicable rules. [S5–S6]

A paid-up-front Apple app and a free app with a permanent in-app unlock are separate delivery models. Do not implement both by accident. Keep this choice open until receipt/transaction verification, account linking, restore behaviour and web access have been designed together.

### Proposed entitlement boundary

Application features should ask a central capability/entitlement policy whether access is allowed; they should not scatter payment-provider checks through components. Reuse an existing boundary if one exists. Purchase adapters, verified ownership, account association, refunds/revocations and restore state must remain separate from learning progress.

A client-side `isPaid` flag is not sufficient production proof of ownership. Production design must account for purchase verification, duplicated/delayed events, pending/cancelled payments, restored purchases, refunds, offline access and account conflicts. A preview/demo entitlement must be visibly non-production and must not be exported as proof of purchase.

Restoring a purchase must not reset cards or earned progress. Losing a premium entitlement must not delete user content; preserve access to data export and a documented safe fallback presentation. Proposed offline licence behaviour and any limits require explicit design rather than silently blocking study on a temporary network failure.

**Not authorised by this charter:** live checkout, payment-provider accounts, Apple provisioning, real transactions, external publication, production authentication or cloud deployment.

## 7. Portability and ownership

Maintain distinct exchange contracts for deck content/designs/media and for a full learner backup containing settings, history and earned state. Neither should export production credentials, payment secrets or transferable proof of paid ownership.

Use stable identities, durable asset references, schema versions and documented migration behaviour. Imports preview changes and preserve existing learning history. Exports include actual media where advertised; external links are not bundled assets.

Anki interoperability must state supported package versions, note/template conversion, media support, omissions and reimport behaviour. Standard formats may not represent HoloRecall cosmetics; document losses explicitly rather than implying an Anki package can carry all HoloRecall state. [S3]

**Proposed commercial safeguard:** users should not have to pay merely to recover or leave with their own learning data. Paid authoring conveniences may differ, but data release, backups and safety should not become a hostage mechanism.

## 8. Application-wide design and accessibility contract

**Design target:** Material 3 through supported Angular Material APIs, with original HoloRecall collectible styling and appropriate iOS/iPadOS, Android and Apple-silicon Mac behavior. **Accessibility target:** WCAG 2.2 AA for the web interface, plus platform accessibility verification for shipped native apps. Targets are not claims of conformance. [S7–S9]

WCAG is not a complete layout specification and does not impose a blanket ban on centred text. HoloRecall therefore needs its own stricter alignment rules alongside accessibility requirements. [S7]

| Area | HoloRecall rule |
|---|---|
| Text in repeated columns | Start-align labels and prose. In English this normally means left alignment. Use shared column tracks, not independently centred row contents. |
| Numeric comparisons | End-align comparable numeric values where useful; retain clear headings and units. |
| Deliberate focal content | Centring is allowed for a short card prompt, primary standalone action or reward reveal when it supports the composition. |
| Repeated controls | Shared spacing, sizing, padding and baselines. Long labels wrap without shifting neighbouring columns unpredictably. |
| Responsive Study | Right-hand interaction panel on adequate widths; intentional compact layout on small screens. Revealing answers must not jolt the card stage. |
| Typography and copy | Contemporary, readable hierarchy. No decorative slogans. Advanced help is collapsed or contextually available without hiding essential instructions/errors. |
| Theme/effects | Light, Dark and System are complete themes. Surface effects cannot obscure text or input; decorative overlays remain non-interactive. |
| Motion | Reuse the established reveal/motion infrastructure. Learning feedback has a defined completion sequence; generic page entrances do not interfere. Honour reduced motion and effect preferences. |
| Inputs | Keyboard, touch and pointer access. No hover-only essential help; no nested buttons; focus remains visible and meaningful. |
| Mobile/native readiness | Safe areas, text enlargement, keyboard resizing, orientation and background/resume behaviour are assessed. Never disable zoom to conceal layout defects. |

Use existing shared tokens and reusable components instead of arbitrary one-off offsets. Public theming APIs are preferred over private Material DOM/CSS overrides. [S8]

Verification includes contrast, keyboard/focus behaviour, semantics, target sizes, text resizing/reflow, motion controls and non-colour cues. Automated checks alone do not establish complete WCAG conformance, VoiceOver support or physical-device usability. [S7, S9]

## 9. Agentic delivery contract

OpenAI documents persistent `AGENTS.md` instructions, reusable skills and delegated subagents. Their availability must still be checked in the actual Codex environment; this charter does not assume a particular installed version or fabricate agent activity. [S10–S12]

**Workflow ownership:** one lead Codex agent owns the live plan, tracked IDs, integration and final report. Use specialised agents for genuinely independent investigations, isolated implementations and review where supported. Prefer bounded work over an unbounded agent swarm.

Each delegated task has an owner, input context, allowed scope/files, expected output, acceptance checks and dependencies. Parallel writers must not compete over shared files. Use supported isolation where appropriate, and integrate dependencies deliberately.

Suggested responsibilities are learning/data integrity, interface/accessibility, platform compatibility, and independent verification. These are responsibilities, not a requirement to spawn four agents for every change. Small work can remain serial; record that choice honestly. Parallel workflows may use more tokens, so use them where they improve speed or review quality rather than as theatre. [S12]

Future task briefs should carry a bounded outcome, traceable requirements, documented sources, delegated scopes where useful, evidence expectations, safety limits and a durable handoff requirement. The repository supplies standing rules so every prompt does not have to repeat the entire charter.

Use real reusable skills for repeated jobs such as UI consistency review, data/import integrity and platform verification when they fit the available tooling. Merely naming an agent or creating an instruction file is not evidence that a delegated workflow actually ran.

After each coherent batch, update the status and restart handoff. Record branch/commit, relevant uncommitted work, completed/partial/blocked requirements, checks actually run and the next unfinished action. Recover from actual files after an interruption; do not reset to a remembered commit.

## 10. Documentation ownership and acceptance

Integrate this charter into the existing repository documentation after the current task returns. Avoid a competing documentation tree. `AGENTS.md` should stay concise and direct Codex to the authoritative records.

| Record | Purpose |
|---|---|
| Product charter | Vision, roles, decision authority, confirmed principles and explicitly proposed commercial choices. |
| Capability/roadmap matrix | Anki mapping, platform scope, tracked status, acceptance criteria and proposed free/paid classification. Reuse an existing equivalent. |
| Existing architecture/design documentation | Platform decisions, domain boundaries, shared UI rules, data and future entitlement contracts. |
| Existing readiness documentation | Web, iOS/iPadOS, Android and Apple-silicon Mac evidence/gaps, retaining the existing Apple history. |
| Existing deck-format/import specifications | Versioned interoperability, media, losses, migration and round-trip evidence. |
| Existing project-status/handoff | Current task truth, change IDs, executed checks, evidence paths, limitations and restart context. |

A capability is not “complete” merely because code exists or an agent says so. Record whether evidence is a Codex report, direct code inspection, executed automated check, browser visual observation, simulator run or physical-device verification. Keep unsupported, partial and blocked states visible.

For each meaningful change, review learning integrity, UI consistency, cross-platform behaviour, portability, entitlement impact and documentation. Test actual alignment and intermediate motion where visuals matter; record failures, flakes and reruns rather than hiding them.

### Pending decisions, not blockers to the running task

The detailed Apple-silicon Mac release acceptance; the exhaustive Anki capability inventory and prioritisation; the commercial feature split and price; paid download versus permanent in-app unlock; cross-platform licence linking; cloud/sync allowances; family/upgrade policy; and future Anki export/history-migration scope remain explicit decisions. Intel Mac and AnkiWeb Sync are not planned.

**Immediate boundary:** implement only the currently authorised bounded milestone. This charter neither cancels already-authorised work nor authorises the whole long-term product in one run.

## Official references

Sources checked on 30 September 2026. Use documentation matching installed versions; recheck purchase rules before implementation/release. Source material explains external capabilities and constraints. HoloRecall-specific rules above are product decisions or labelled recommendations, not statements those sources mandate.

- **S1 — Anki overview:** https://apps.ankiweb.net/
- **S2 — Anki deck options:** https://docs.ankiweb.net/deck-options.html
- **S3 — Anki exporting:** https://docs.ankiweb.net/exporting.html
- **S4 — Capacitor documentation:** https://capacitorjs.com/docs
- **S5 — Apple universal purchase:** https://developer.apple.com/help/glossary/universal-purchase
- **S6 — Apple App Review Guidelines, section 3.1:** https://developer.apple.com/app-store/review/guidelines/
- **S7 — WCAG 2.2:** https://www.w3.org/TR/WCAG22/
- **S8 — Angular Material theming, official source:** https://github.com/angular/components/blob/main/guides/theming.md
- **S9 — Apple Human Interface Guidelines, accessibility:** https://developer.apple.com/design/human-interface-guidelines/accessibility
- **S10 — Codex project instructions:** https://developers.openai.com/codex/guides/agents-md/
- **S11 — Codex skills:** https://developers.openai.com/codex/skills/
- **S12 — Codex subagents:** https://developers.openai.com/codex/multi-agent/
