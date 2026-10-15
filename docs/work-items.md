# Canonical work-item tracker

Updated: 15 October 2026. This file is the canonical local execution tracker. The product charter sets direction, `product-brief.md` records long-range capability coverage, and `project-status.md` is the current restart handoff. GitHub Issues are not in use; if introduced later, they must mirror this tracker rather than form a second source of truth.

## Lifecycle

`BACKLOG` → `PLANNED` → `IN_PROGRESS` → `VERIFY` → `DONE`.

Exceptional states are `BLOCKED`, `DEFERRED`, and `CANCELLED`. Completed items remain in this file with their evidence and commits.

## Active prototype milestone — HR-VISUAL-EFFECTS-LAB-01

Authorised 15 October 2026. This isolated developer lab evaluates a GSAP-driven peel model and surface-linked card lighting before any production integration.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-VISUAL-EFFECTS-LAB-01A | Unlinked developer effects view | VERIFY | `#effects-lab` opens a clearly labelled, state-free local preview without appearing in normal navigation. |
| HR-VISUAL-EFFECTS-LAB-01B | Layered GSAP clue peel | VERIFY | One normalized progress value drives attached sheet, underside, exposed card and moving shadow from an already-peeled resting state. |
| HR-VISUAL-EFFECTS-LAB-01C | Surface-linked reflection prototypes | VERIFY | Shared tilt state continuously drives restrained Common, Holo Rare and Ultra Rare reflections with Effects Off and reduced-motion handling. |
| HR-VISUAL-EFFECTS-LAB-01D | Face and secondary-cue samples | VERIFY | The lab previews a resolved Answer halo without an X and distinguishes quoted pronunciation from an unquoted generic secondary cue. |
| HR-VISUAL-EFFECTS-LAB-01E | Isolation and verification | VERIFY | Production clue, shimmer, face signature and pronunciation remain unchanged; focused browser tests and production build pass before publication. |

Implementation evidence: the development-only hash screen remains absent from primary and secondary navigation and owns no learner-state service. GSAP core 3.15.0 drives a 520 ms boundary peel from an 18% resting lift; Reduced Motion dissolves without geometric travel. The same normalized surface input controls tilt and opposing specular position for three rarity samples. Focused Chromium/WebKit coverage passes **12/12**, unit/domain passes **271** with three opt-in package suites skipped, and production builds with the lab in a **97.38 kB lazy chunk**. Production Study/card rendering files remain unchanged. Manual visual approval is pending.

## Previous corrective milestone — HR-STUDY-CLUE-MATERIAL-04

Authorised 15 October 2026. This presentation-only correction makes the existing card-owned clue a smaller, content-driven adhesive sticker with an already-peeled corner and one whole-sticker removal surface.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-STUDY-CLUE-MATERIAL-04A | Content-driven sticker sizing | VERIFY | Short clues occupy less card area while long clues expand without clipping, nested scrolling or an inaccessible type reduction. |
| HR-STUDY-CLUE-MATERIAL-04B | Partially peeled resting construction | VERIFY | A cut-away sheet exposes card surface beneath a separately lifted reverse-face flap with local adhesion shadow. |
| HR-STUDY-CLUE-MATERIAL-04C | Whole-sticker removal | VERIFY | The sticker is one keyboard/touch/pointer removal control with no nested fold-only action and no card flip propagation. |
| HR-STUDY-CLUE-MATERIAL-04D | Layered peel and return | VERIFY | The lifted region advances before the sheet/body follows; the pennant returns only after removal settles and remains immediately reusable. |
| HR-STUDY-CLUE-MATERIAL-04E | Responsive/accessibility verification | VERIFY | Reduced Motion, 200% text, browser and available native Simulator gates preserve clue readability, focus and Study-state safety. |

Implementation evidence: the transparent whole-sticker button owns a clipped sheet, separate resting peel and readable clue copy without nested controls. Short clues use fit-content bounds; long clues expand without nested scrolling. Pointer activation on the centre or clue text and Enter/Space all start the same layered removal without flipping or learning mutation; the pennant waits for settlement and returns immediately. Unit/domain **271 passed, 3 opt-in suites skipped**; focused Chromium/desktop-WebKit/compact-WebKit Study and answer-showcase coverage **16/16**; coarse-pointer compact/large/landscape coverage **3/3**; production and packaged iPhone 17 Pro / iPad Pro 11-inch (M5) smokes pass. Physical-device touch, VoiceOver and Dynamic Type remain unverified.

## Previous corrective milestone — HR-STUDY-PRESENTATION-03

Authorised 15 October 2026. This presentation-only correction replaces the geometric clue treatment with an organic HoloRecall-native object and normalises compact Study titles when imported hierarchy text is combined.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-STUDY-PRESENTATION-03A | Organic clue pennant | VERIFY | Use system typography, fabric-like asymmetric geometry and deterministic separation from image inspection while retaining the accessible control. |
| HR-STUDY-PRESENTATION-03B | Organic clue sticker | VERIFY | Use natural paper geometry, a lifted interactive corner and readable content without nested scrolling or clipping. |
| HR-STUDY-PRESENTATION-03C | Staged corner-first peel | VERIFY | Fold lift and adhesive separation precede body release; the reusable pennant appears only after removal settles, with a reduced-motion equivalent. |
| HR-STUDY-PRESENTATION-03D | Study title normalisation | VERIFY | Combined and separate course hierarchies resolve to Lesson N plus the cleaned current topic without mutating stored names. |
| HR-STUDY-PRESENTATION-03E | Regression and platform verification | VERIFY | Existing timer/state safety, answer showcase, responsive/accessibility, browser/build and available native Simulator gates remain intact. |

Implementation evidence: system typography and asymmetric CSS material replace the serif/geometric clue treatment; long clues expand without a nested scrollbar; the fold and sticker body run separate corner-first removal stages before the reusable pennant returns. Combined hierarchy tests cover internal dates and numeric leaf prefixes without changing stored names. Unit/domain **271 passed, 3 opt-in suites skipped**; exact Lesson 1, Lesson 2, combined 254-card Italian and bBarryy gates **4/4**; focused Chromium/desktop-WebKit/compact-WebKit Study and answer-showcase coverage **16/16**; coarse-pointer compact/large/landscape coverage **3/3**; packaged iPhone 17 Pro and iPad Pro 11-inch (M5) smokes pass. Production build succeeds with the existing 900.49 kB warning. Physical-device touch, VoiceOver and Dynamic Type remain unverified.

## Previous corrective milestone — HR-STUDY-PRESENTATION-02

Authorised 15 October 2026. This bounded milestone replaces Study's detached clue controls with one card-owned physical interaction and derives a concise, display-only Study context label without changing source data or learning state.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-STUDY-PRESENTATION-02A | Card-owned clue pennant | VERIFY | After ten active settled Recall seconds, an accessible medieval pennant unfurls from a deterministic card-edge position without colliding with image inspection. |
| HR-STUDY-PRESENTATION-02B | Attached clue sticker and safe placement | VERIFY | Opening the pennant produces a readable card-transform-owned sticker using a content-aware safe zone; it never flips or mutates learning state. |
| HR-STUDY-PRESENTATION-02C | Peel and immediate reavailability | VERIFY | The folded-corner removal affordance completes its peel/fade before the pennant returns, supports repeat use without another delay, and restores focus predictably. |
| HR-STUDY-PRESENTATION-02D | Motion, lifecycle and answer safety | VERIFY | Existing active-time pauses remain authoritative; Reduced Motion preserves the sequence; Answer/card/session transitions clear clue UI and Recall Peek cannot restore it. |
| HR-STUDY-PRESENTATION-02E | Concise Study context label | VERIFY | One pure helper derives Lesson N plus cleaned leaf/parent topic for trustworthy course hierarchies and a cleaned current-deck fallback otherwise. |
| HR-STUDY-PRESENTATION-02F | Regression and platform verification | VERIFY | Answer showcase, imported package presentation, responsive layouts, accessibility, browser/build and available native Simulator gates are verified before publication. |

Implementation evidence: the clue lifecycle is card-owned and presentation-only, with timer/modal/lifecycle pauses, deterministic image-control separation, content-aware sticker placement, folded-corner removal, immediate repeat availability, Reduced Motion and keyboard/focus coverage. Unit/domain **268/268** pass; exact Lesson 1, Lesson 2, combined 254-card Italian and bBarryy gates pass **4/4**; the full Chromium/desktop-WebKit/compact-large-landscape-WebKit matrix passes **295** with **10** exact-package conditionals separately exercised. Production builds at **899.87 kB raw / 217.79 kB estimated transfer**. Packaged iPhone 17 Pro and iPad Pro 11-inch (M5) Study/navigation smokes pass **1/1** each. Physical-device touch, VoiceOver and Dynamic Type remain unverified.

## Previous corrective milestone — HR-ANSWER-FACE-HIERARCHY-01

Authorised 15 October 2026. This bounded presentation correction makes concise semantic Answers dominant while preserving specialized visual and complex compositions.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANSWER-FACE-HIERARCHY-01A | Concise Answer composition | VERIFY | Put source-backed context in top chrome, retain concise category decoration, and make primary Answer plus optional secondary cue the dominant Answer-face hierarchy. |
| HR-ANSWER-FACE-HIERARCHY-01B | Composition safety | VERIFY | Apply the hierarchy through the shared presentation system only when semantics fit; preserve Recall, Image Occlusion, instructional-image, multi-block and long-answer compositions. |
| HR-ANSWER-FACE-HIERARCHY-01C | Material layering and fit | VERIFY | Keep the central spark above inner rules, remove redundant revealed guidance, and avoid internal scrolling when responsive type and spacing can fit safely. |
| HR-ANSWER-FACE-HIERARCHY-01D | Cross-subject and platform verification | VERIFY | Verify language and non-language examples, exact Lesson 1–3 and bBarryy regressions, responsive/accessibility states, production build and packaged iPhone/iPad smoke. |

Implementation evidence: the exact Lesson 2 `cestino` card retains its Recall stimulus, task and CE/CI/CHE/CHI choices; its Answer now uses source panel title `C and CH sounds` in chrome, keeps only the spark and `C/CH` chip as ornament, and promotes `CE` plus `cheh-STEE-noh` to the central hierarchy. The rule is subject-neutral, omits an absent secondary slot, adapts medium/long concise answers, and leaves image, Image Occlusion and explicit Design Studio compositions unchanged. Unit/domain **263/263**, focused hierarchy **5/5**, and the complete Chromium/desktop-WebKit/compact-large-landscape-WebKit matrix **303/303** pass. Production builds at **899.88 kB raw / 217.33 kB estimated transfer**. Packaged iPhone 17 Pro and iPad Pro 11-inch (M5) Study/navigation smokes pass **1/1** each. Physical-device contrast, VoiceOver and Dynamic Type remain unverified.

## Previous corrective milestone — HR-ANKI-FIDELITY-04

Authorised 15 October 2026. This bounded correction preserves structured semantics inside imported Prompt HTML and distinguishes choice, pronunciation/naming and visual response modes during template-level translation audit.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANKI-FIDELITY-04A | Structured Prompt subroles | VERIFY | Safely map source `.instruction`, `.focus` and `.clue` blocks to guidance, Recall stimulus/context and the delayed clue system without flattening or executing source code. |
| HR-ANKI-FIDELITY-04B | Source-app guidance filtering | VERIFY | Retain learning instructions while classifying Anki UI directions as non-learning metadata. |
| HR-ANKI-FIDELITY-04C | Response-aware translation audit | VERIFY | Treat explicit multi-choice and source-backed pronunciation/naming stimuli correctly while continuing to block real answer leakage and lost choice structure. |
| HR-ANKI-FIDELITY-04D | Conditional sound-review semantics | VERIFY | One template-owned declarative `review_sound_` variant promotes the source Pronunciation response for matching cards; ordinary cards remain on the default mapping. |
| HR-ANKI-FIDELITY-04E | Exact-package and regression verification | VERIFY | Audit all 135 Lesson 2 cards plus Lesson 1, bBarryy and configured Italian regressions before publication. |

Evidence: exact package SHA-256 `b2f3d0f09338442c850d4beacae0ebb392f8ef45c9859bf592d2788ec3df1e13` produces **135 Ready with simplification, 0 Needs review, 0 Cannot import**. The 123-card main profile and 12-card extended profile reconcile all source blocks; the latter applies one `ID starts-with review_sound_` pronunciation-response variant to **4** cards and leaves **8** on its default answer mapping. Lesson 1 remains **44/44** importable and bBarryy remains **58** safe cards plus three source-incomplete exclusions. Unit/domain passes **263/263**; the complete Chromium/desktop-WebKit/compact-large-landscape-WebKit matrix passes **298/298**; production build and packaged iPhone 17 Pro / iPad Pro 11-inch (M5) Exchange-navigation smokes pass **1/1** each. Physical-device file import, touch and assistive-technology behavior remain unverified.

## Previous corrective milestone — HR-ANKI-SAFE-SCRIPT-01

Authorised 14 October 2026. This bounded correction distinguishes provably presentation-only Anki template scripts from scripts that may alter learning semantics, without executing imported code.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANKI-SAFE-SCRIPT-01A | Exact-package script trace | VERIFY | Trace both Lesson 1 templates through safe rendering, issue classification, template audit and Exchange counts before changing policy. |
| HR-ANKI-SAFE-SCRIPT-01B | Conservative safe omission | VERIFY | Omit only provably presentation-only scripts; semantic, network and executable behavior remains review-required and is never run. |
| HR-ANKI-SAFE-SCRIPT-01C | Script/media provenance | VERIFY | Record safe simplification evidence and distinguish referenced media from unreferenced package assets without filename guessing. |
| HR-ANKI-SAFE-SCRIPT-01D | Real-package and security regression | VERIFY | Prove Lesson 1, bBarryy, prior Italian, generic executable-script, and orphan-media behavior across domain and Exchange gates. |

Evidence: SHA-256 `8e8323d2f00a835f9d4d994b7480bbe807f95c7686ad1bb57514172f3cb5a81e` produces **44 Ready with simplification, 0 Needs review, 0 Cannot import** across two automatic clean Conversion Profiles. The shared script only shortens the visible Deck hierarchy label; it remains inert in retained provenance and is absent from native cards. The package has 0 referenced media and 19 ignored unreferenced PNG assets; its safe HTML `Image` panels remain instructional art with native choices. Unit/domain passes **261/261** with Lesson 1, bBarryy and the prior Italian package configured; complete browser/profile coverage passes **296/296**; production build and packaged iPhone/iPad Exchange-navigation smokes pass **1/1** each. The initial concurrent domain run exceeded two unchanged performance thresholds; both passed unchanged in isolation and in the complete rerun.

## Previous corrective milestone — HR-ANKI-FIDELITY-03

Authorised 14 October 2026. This bounded correction adds source-backed conditional semantic variants within one exact Anki note type/template Conversion Profile.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANKI-FIDELITY-03A | Trace stable real-source discriminator | VERIFY | Exact package fields/templates and neighboring cards establish a structured, source-authored discriminator before projection changes. |
| HR-ANKI-FIDELITY-03B | Conditional semantic variants | VERIFY | One serialisable template-owned rule selects per-card semantic overrides without IDs, executable predicates or per-card mappings. |
| HR-ANKI-FIDELITY-03C | Variant-aware translation audit | VERIFY | Every generated card is audited under its selected variant; unmatched, ambiguous or changed source structure reopens template review. |
| HR-ANKI-FIDELITY-03D | Review and persistence | VERIFY | Normal review describes affected variants without predicate syntax; confirmed rules persist through update/repair while v1/v2 profiles remain readable. |
| HR-ANKI-FIDELITY-03E | Exact-package and generic verification | VERIFY | The Italian classification family uses the real Answer field, default Italian answers remain unchanged, and bBarryy plus subject-neutral fixtures do not regress. |

Evidence: the exact Italian template conditionally renders non-empty `Answer` before its default `Italian` answer region. Conversion Profile v3 applies that source-backed variant to **64** cards and leaves **190** on the default projection; all **254** pass the variant-aware audit. `spaghetti` remains Recall stimulus and `GHE · hard G` is the primary Answer. Subject-neutral fixtures cover selection, approval, persistence and changed-discriminator review. The exact bBarryy package remains **58** safe cards with unchanged Basic, Cloze and native Image Occlusion audits. Unit/domain passes **257/257**, focused conditional-review Chromium/WebKit **14/14**, the complete browser/profile matrix **294/294**, production build, and packaged iPhone/iPad smokes **1/1** each. Detailed limitations remain in `project-status.md`.

## Previous corrective milestone — HR-ANKI-FIDELITY-02

Authorised 14 October 2026. This bounded milestone separates title fallback from capabilities and adds one deterministic note-type/template translation audit before Anki acceptance.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANKI-FIDELITY-02A | Source-safe chrome title fallback | VERIFY | Explicit presentation title wins, followed by one unambiguous short source-backed contextual label, then the current leaf deck name; capability/model/template/answer/prompt values never substitute for a title. |
| HR-ANKI-FIDELITY-02B | Template translation audit | VERIFY | Each exact note type and template receives a versioned deterministic audit covering semantic blocks, sides, media, behavior and projected destinations before acceptance. |
| HR-ANKI-FIDELITY-02C | Suspicious conversion gate | VERIFY | Lost, duplicated, wrong-side, leaked, fake-art, malformed support and unsupported behavior findings block the affected template rather than individual cards. |
| HR-ANKI-FIDELITY-02D | Summary-first review UX | VERIFY | Clean templates retain the Ready fast path; review-required templates show affected counts, representative Recall/Answer previews and concise reasons while full coverage remains advanced. |
| HR-ANKI-FIDELITY-02E | Generic and real-package acceptance | VERIFY | Subject-neutral fixtures plus bBarryy and Italian exact-package gates cover Basic, reversed, rich, cloze and visual-answer behavior without changing learner state or importer identity. |

Evidence: unit/domain **254/254** with both exact packages configured. The bBarryy source produces **58** safe cards and three clean audited template profiles (Basic, Cloze and 26 visual-answer Image Occlusion cards); its three source-incomplete cards remain excluded. The Italian **254-card** profile retains its projection but is now review-required because the safe front and projected primary answer are unexpectedly equivalent while the source Answer field contains different learning content. The complete browser/profile matrix is **286 passed with 4 package-conditional skips**; those exact bBarryy cases pass separately **4/4** in Chromium/WebKit. Production build and packaged iPhone 17 Pro / iPad Pro 13-inch (M5) smokes pass **1/1** each. Physical-device accessibility and a corrected user-confirmed mapping for the newly exposed Italian template mismatch remain unverified.

## Previous milestone — HR-STUDY-CARD-CHROME-01

Authorised 14 October 2026. This bounded milestone replaces redundant card-face chrome, adds a delayed state-safe clue interaction, clarifies Study controls and reuses the existing image-inspection boundary without changing learning semantics.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-STUDY-CARD-CHROME-01A | Shared card chrome | VERIFY | Title or an informative behaviour label occupies the top-left; rarity remains top-right; derived capabilities and an accessible non-text face marker replace Front/Answer footer copy across shared renderer surfaces. |
| HR-STUDY-CARD-CHROME-01B | Recall/Answer material signatures | VERIFY | Static, low-opacity open/resolved geometries distinguish faces beneath protected content with Effects Off and Reduced Motion and do not obscure Image Occlusion masks. |
| HR-STUDY-CARD-CHROME-01C | Active-view clue interaction | VERIFY | A real non-empty clue produces an attached flag only after ten active settled Recall seconds; lifecycle, modal/inspection and motion pauses preserve elapsed time; reveal is presentation-only and clears on answer/card change. |
| HR-STUDY-CARD-CHROME-01D | Study control copy and contextual shortcuts | VERIFY | `Check answer` replaces Reveal answer; desktop guidance reflects the active face and optional Z inspection while native iOS/coarse-pointer presentations omit keyboard copy. |
| HR-STUDY-CARD-CHROME-01E | Motion-safe image inspection | VERIFY | Z and the Expand control preserve the settled face; the control is non-interactive during owned deal/flip/settle animation and nested actions cannot also flip, reveal or rate. |
| HR-STUDY-CARD-CHROME-01F | Accessibility and verification | VERIFY | Face/capability/clue state remains announced, focus is predictable, 200% and representative rarity/Design Set contrast remain usable, and requested browser/native/build gates pass before publication. |

Evidence: unit/domain **243 passed, 2 opt-in package suites skipped**; both configured exact-package domain gates **2/2** and bBarryy Chromium/WebKit acceptance **4/4**; complete browser/profile matrix **286 passed, 4 expected exact-package skips**; packaged iPhone 17 Pro and iPad Pro 11-inch (M5) inspection smokes **1/1** each in portrait and landscape. Production is **896.74 kB raw / 216.43 kB estimated transfer**. Physical-device VoiceOver, touch timing and contrast measurement across every custom Design Set remain unverified.

## Previous milestone — HR-CARD-INSPECTION-01

Authorised 13 October 2026. This bounded milestone preserves verified Anki projection while improving task-first Image Occlusion composition and adding one shared, state-safe expanded inspection surface for meaningful card images.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-CARD-INSPECTION-01A | Verify real occlusion semantics | VERIFY | Real bBarryy and controlled fixtures prove Recall/Answer mask state for both native modes before importer changes are considered. |
| HR-CARD-INSPECTION-01B | Task-first occlusion composition | VERIFY | Source image uses the collectible card's available study area without cropping; generic fallback copy does not displace the task or create an empty answer panel. |
| HR-CARD-INSPECTION-01C | Shared expanded inspection | VERIFY | Study, Collection/review and Creator preview reuse one accessible Material dialog preserving the opening face and focus. |
| HR-CARD-INSPECTION-01D | Zoom, pan and responsive input | VERIFY | Bounded explicit zoom/reset and pointer/touch pan preserve image/mask geometry; pinch support uses native pointer gestures without a new dependency. |
| HR-CARD-INSPECTION-01E | Study-state safety | VERIFY | Inspection pauses/resumes Auto Advance without reveal, rating, FSRS, review, reward, queue or face mutation. |
| HR-CARD-INSPECTION-01F | Accessibility and platform verification | VERIFY | Dialog/face/mask/zoom semantics, keyboard/focus, compact WebKit and packaged iPhone/iPad smokes pass before publication. |

Evidence: the unchanged real-package projector produces **26** safe visual-answer cards: **4 Hide All, Guess One** and **22 Hide One, Guess One**, with the expected masked Recall/revealed Answer shape sets. Unit/domain passes **244/244** with both real-package paths configured; the complete browser/profile matrix passes **283/283**, the cross-profile inspection rerun passes **22/22**, and the final shared-service exact-package Chromium/WebKit rerun passes **18/18**. Packaged iPhone 17 Pro and iPad Pro 11-inch (M5) / iOS 26.5 modal smokes pass **1/1** each in portrait and landscape. Physical-device pinch/pan, VoiceOver and large-diagram memory pressure remain unverified.

## Previous milestone — HR-ANKI-CONVERSION-PROFILES-01 + HR-CREATOR-SEMANTICS-01

Authorised 13 October 2026. This bounded milestone adds template-scoped conversion behaviour/presentation above existing Mapping Profiles, visual-only native Image Occlusion answers, subject-neutral Creator Studio semantics and template-level suspicious-conversion review. Card chrome, clue animation, Collection redesign/Desk and APKG output remain excluded.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANKI-CONVERSION-PROFILES-01A | Add title/category semantic and Card Details copy | VERIFY | Optional presentation title derives only from template-visible evidence; rich support remains outside the collectible face under Card Details. |
| HR-ANKI-CONVERSION-PROFILES-01B | Versioned template Conversion Profiles | VERIFY | Each model/template composes its Mapping Profile, supported behaviour adapter, presentation policy and review status without duplicating source snapshots. |
| HR-ANKI-CONVERSION-PROFILES-01C | Source semantics override decoration | VERIFY | Text/basic cards default text-first, instructional media may be image-first, occlusion is task-first, and generated art cannot duplicate learning text. |
| HR-ANKI-CONVERSION-PROFILES-01D | Visual-only Image Occlusion answer | VERIFY | Imported and creator occlusion use one declarative masked/revealed renderer without a fabricated textual answer; Basic still requires an answer. |
| HR-ANKI-CONVERSION-PROFILES-01E | Derived capabilities | VERIFY | One derived model reports occlusion, cloze, clue, audio and choices for review/Creator/debug use without persisted booleans. |
| HR-ANKI-CONVERSION-PROFILES-01F | Template-level review and suspicious blocking | VERIFY | Review groups exact model/template cards, shows representative Recall/Answer/Card Details, and blocks affected profiles until material sanity issues are approved/corrected. |
| HR-ANKI-CONVERSION-PROFILES-01G | Real-package and compatibility matrix | VERIFY | bBarryy safe Basic/occlusion projections and configured Italian package pass; supported/adapted/review/unsupported feature classes remain explicit. |
| HR-CREATOR-SEMANTICS-01A | Creator Studio semantic parity | VERIFY | Existing authoring exposes title, Recall, Answer, Card Details and supported feature semantics without Anki-first language. |
| HR-CREATOR-SEMANTICS-01B | Additive persistence and migration | VERIFY | Existing state/mappings/snapshots/learning data remain readable; any schema bump migrates atomically and portable v10 remains readable. |
| HR-CREATOR-SEMANTICS-01C | Settled later decisions documented only | VERIFY | Card interaction/clue/chrome and Collection decisions are recorded without implementing those later milestones. |
| HR-ANKI-CONVERSION-PROFILES-01H | Verification and publication | VERIFY | Unit, package, browser, production and relevant native gates pass before clean preflight and normal non-force push. |

Evidence: state schema 10 additively stores template-scoped Conversion Profiles while retaining Mapping Profiles, source snapshots and portable v10 compatibility. The exact bBarryy package produces 58 safe cards, including 26 visual-answer Image Occlusion cards, while the configured 254-card Italian package retains automatic profiles. Unit/domain passes **241/241**; the complete Chromium/desktop-WebKit/compact-large-landscape-WebKit matrix passes **268/268**; packaged iPhone 17 Pro and iPad Pro 11-inch (M5) / iOS 26.5 smokes each pass **1/1**. Production is **886.11 kB raw / 214.34 kB estimated transfer** (+5.12 kB / +0.98 kB from 880.99/213.36); Exchange (**90.36 kB**) and the Anki Worker (**60.18 kB**) remain lazy. Physical-device touch, VoiceOver, Dynamic Type and real-device large-package performance remain unverified.

### Corrective milestone — HR-ANKI-CONVERSION-PROFILES-01A

| Requirement | Status | Acceptance boundary |
|---|---|---|
| Static template provenance and coverage | VERIFY | Meaningful safe literal blocks receive auditable classifications; noise is ignored and ambiguity blocks the exact template. |
| Static heading title inference | VERIFY | Only strong semantic heading evidence becomes a subject-neutral card title; field titles remain supported. |
| Real Italian source trace | VERIFY | The exact source contains no day-of-week/Thursday/giovedì content, so none is fabricated; a valid static-heading fixture proves the generic path. |
| Visual-answer accessibility | VERIFY | Image Occlusion reveal has a meaningful announcement without an empty or fabricated textual answer. |
| Regression, build and publication | VERIFY | Both real-package domain gates, relevant Chromium/WebKit and packaged iPhone/iPad smokes pass; publication remains subject to final preflight. |

Evidence: unit/domain **244/244** with both exact packages configured; relevant Chromium/desktop-WebKit/compact-WebKit **23/23**, including explicit visual-answer live-region coverage, plus bBarryy exact import **2/2**. Packaged iPhone 17 Pro and iPad Pro 11-inch (M5) smokes pass **1/1** each. Production is **886.36 kB raw / 214.41 kB estimated transfer** (+0.25/+0.07 kB from the preceding milestone). Physical-device VoiceOver, Dynamic Type and native-picker package import remain unverified.

## Previous milestone — HR-UI-IDENTITY-01

Authorised 13 October 2026. This bounded corrective milestone scopes primary-navigation CSS, standardises the Exchange destination name and replaces the casino-adjacent mark with one cross-platform Knowledge Stack source.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-UI-IDENTITY-01A | Scope navigation CSS | VERIFY | Sidebar and mobile navigation own their layout rules; generic `nav` and `nav button` rules no longer alter peer subviews or unrelated navigation. |
| HR-UI-IDENTITY-01B | Preserve platform subview pattern | VERIFY | Web Decks/Search and Exchange controls are compact horizontal tabs; native iPhone/iPad retain segmented presentation at every width/orientation. |
| HR-UI-IDENTITY-01C | Canonical Exchange naming | VERIFY | Primary/mobile navigation, context, heading, placeholders and accessible labels use Exchange; explanatory prose may describe import/export actions. |
| HR-UI-IDENTITY-01D | Canonical Knowledge Stack mark | VERIFY | One geometric SVG source defines a teal, cream three-sheet stack with a small four-point recall spark and no casino cues. |
| HR-UI-IDENTITY-01E | Derived platform assets | VERIFY | Web/sidebar/favicon, opaque 1024 px iOS AppIcon and existing Android launcher/adaptive resources visibly derive from the same mark. |
| HR-UI-IDENTITY-01F | Accessibility and verification | VERIFY | Decorative semantics, keyboard/ARIA, 200% containment, browser/native navigation, asset dimensions and build/bundle evidence pass without timeout inflation. |
| HR-UI-IDENTITY-01G | Publication gate | VERIFY | Normal secret/artifact preflight found no probable credentials or runtime/build output; publish with a normal non-force push after confirming origin has not diverged. |

## Previous milestone — HR-NAVIGATION-01

Authorised 13 October 2026. This bounded navigation milestone gives the Decks/Card search and Exchange peer views one shared, platform-adaptive subview control without changing primary navigation or unrelated screens.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-NAVIGATION-01A | Shared peer-subview control | VERIFY | One small shared control owns items, current selection, change events, accessible labelling and keyboard behaviour. |
| HR-NAVIGATION-01B | Web compact tabs | VERIFY | Browser peer views use left-aligned, content-width Material tabs with one selected state and meaningful URL/history where supported. |
| HR-NAVIGATION-01C | Native iOS segments | VERIFY | Capacitor iOS uses the segmented presentation on iPhone and iPad at every width and orientation, without viewport inference. |
| HR-NAVIGATION-01D | Decks / Search cards | VERIFY | Deck hierarchy and the existing search/filter/result tools become peer views; Decks is default and search state survives temporary navigation. |
| HR-NAVIGATION-01E | Import / Export / Templates | VERIFY | The settled Exchange routes retain their state and content while replacing the wide local controls with shared subview navigation. |
| HR-NAVIGATION-01F | Accessibility and responsive gate | VERIFY | Keyboard/ARIA selection, focus, 200% text, safe areas and overflow pass the requested browser/native viewport matrix. |
| HR-NAVIGATION-01G | Publication gate | VERIFY | Verification, tracked-content preflight and non-force publication of clean `main` must succeed before push. |

Evidence: one semantic tablist implementation renders compact content-width tabs on web and segmented controls only when the official Capacitor runtime reports native iOS. Decks/Search retain hash history and search state; Exchange retains its established child routes. Unit/domain passes **237/237**; the complete browser/profile matrix passes **264/264**; packaged iPhone 17 Pro and iPad Pro 11-inch (M5) / iOS 26.5 navigation smokes each pass **1/1**, including landscape. Production is **880.95 kB raw / 213.39 kB estimated transfer** (+5.78 kB / +1.86 kB from 875.17/211.53). Physical-device VoiceOver, Dynamic Type and touch remain unverified.

## Previous milestone — HR-REGRESSION-STABILITY-01

Authorised 13 October 2026. This bounded stabilization milestone resolves the complete browser-matrix regressions after the Exchange and deck-deletion changes without adding product scope.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-REGRESSION-STABILITY-01A | Full-matrix triage | VERIFY | Classify every baseline failure as product regression, settled-UX assertion, harness/environment issue or decision blocker before changing code. |
| HR-REGRESSION-STABILITY-01B | Exchange regression alignment | VERIFY | Preserve Import / Export / Templates and progressive Advanced mapping while replacing assertions tied to the former combined page. |
| HR-REGRESSION-STABILITY-01C | Compact-width containment | VERIFY | Remove whole-page overflow at 1024 px, compact WebKit, phone portrait/landscape and 200% text using intrinsic sizing/wrapping rules. |
| HR-REGRESSION-STABILITY-01D | Deterministic page/reveal coverage | VERIFY | Assert settled reveal ownership and current page structure without depending on superseded block counts or transient animation samples. |
| HR-REGRESSION-STABILITY-01E | Deck-delete regression gate | VERIFY | Reprove deletion scopes, immutable historical attribution, backup/reference integrity, responsive layout and dialog accessibility. |
| HR-REGRESSION-STABILITY-01F | Publication gate | VERIFY | Run the complete verification matrix, scan tracked content, and push `main` only if no unexplained failures remain. |

Baseline: **236 passed, 2 skipped, 14 failed**. Classification: 2 real compact-width product defects (Exchange file-input intrinsic width), 11 obsolete assertions after the settled Exchange IA change (9 journey assertions and 2 reveal-inventory counts), 1 WebKit harness/timing failure caused by rapid sample selection during smooth inspection scrolling, and 0 product-decision blockers.

Evidence: the native file control now has explicit shrink containment; the current summary-first Anki journey, nested Advanced mapping and focused Exchange reveal inventory have direct assertions. Collection rarity sampling uses keyboard activation and confirms selected state, removing its scroll-position race without changing timeouts. Unit/domain passes **236/236** with both real-package gates enabled; the complete browser/profile matrix passes **254/254** with no skips; deck deletion/migration passes **9/9**; packaged iPhone 17 Pro / iOS 26.5 Deck and Exchange smoke passes **2/2**. Production remains **875.17 kB raw / 211.53 kB transfer** (change: 0.00 kB raw, +0.03 kB estimated transfer from the prior rounded report); Exchange is **86.52 kB**, the Anki Worker **57.06 kB**, and the deck dialog **27.11 kB**, all lazy. Physical-device touch/VoiceOver remains unverified.

## Previous milestone — HR-DECK-MANAGEMENT-01

Authorised 12 October 2026 and resumed 13 October 2026 after the historical-attribution decision. This bounded milestone adds safe permanent deck deletion and repairs the Deck management layout without beginning Collection Desk or unrelated features.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-DECK-MANAGEMENT-01A | Separate permanent Delete action | VERIFY | A Material 3 Danger Zone distinguishes irreversible deletion from Pause and reversible Archive. |
| HR-DECK-MANAGEMENT-01B | Delete this deck only | VERIFY | Delete directly owned cards/state, preserve descendants and promote direct children to the deleted deck's parent or root. |
| HR-DECK-MANAGEMENT-01C | Delete deck branch | VERIFY | Delete the selected deck, descendants and branch-owned learner/presentation/source state without affecting unrelated content. |
| HR-DECK-MANAGEMENT-01D | Scoped confirmation | VERIFY | Dialog reports actual deck/subdeck/card/review scope, offers Archive context and keeps destructive confirmation from initial focus. |
| HR-DECK-MANAGEMENT-01E | Imported-source cleanup | VERIFY | HoloRecall deletion never mutates the APKG; retained sources/assets are removed only when no surviving reference exists. |
| HR-DECK-MANAGEMENT-01F | Responsive Deck management layout | VERIFY | Form/action area and subordinate preview use responsive grid/flex tracks with no overlap or horizontal overflow. |
| HR-DECK-MANAGEMENT-01G | Bounded Design Preview | VERIFY | Preview retains aspect/design accuracy with screen-local size bounds and does not change Study/Collection sizing. |
| HR-DECK-MANAGEMENT-01H | Action hierarchy and accessibility | VERIFY | Save is primary, Pause/Archive secondary and Delete isolated; keyboard order and dialog focus follow Material/WCAG patterns. |
| HR-DECK-HISTORY-01 | Immutable historical deck attribution snapshot | VERIFY | Review-time deck IDs/names/path validate independently of live hierarchy; legacy state migrates safely and reporting separates history from current inventory. |
| HR-GOV-04 | Durable Operating stance handover | VERIFY | `AGENTS.md` contains the single concise canonical stance and future-Codex-prompt prefix rule. |

Evidence: state schema 9 stores each attributed review's immutable deck ID/name/path snapshot and migrates consistent schema-8 references without changing review, scheduler or reward evidence. Domain tests cover parent-only promotion, recursive deletion, full-backup restore, rename/move history stability and reference-safe media/source cleanup. Progress separates current live inventory from historical review paths, including deleted ancestors. The Deck editor uses responsive form/preview tracks, bounded preview sizing and a lazy scoped confirmation dialog. Unit/domain passes 234/234; milestone and migration acceptance passes 9/9 across Chromium, desktop WebKit and compact WebKit; final packaged iPhone 17 Pro / iOS 26.5 dialog smoke passes 1/1 in 24.103 s. Production is 875.17 kB raw / 211.50 kB estimated transfer with the 27.11 kB dialog lazy. The complete matrix reports 235 passes, 2 skips and 15 failures; its two stale schema-assertion instances are corrected and pass in isolation, while 13 observed Exchange/page-reveal/mobile-overflow failures remain outside this scope.

## Completed milestone — HR-EXCHANGE-UX-03 + HR-ANKI-IMPORT-REAL-01

Authorised 12 October 2026. This bounded milestone resets Exchange information architecture and makes the real `bBarryy anatomy thorax pt 1` Anki result actionable without beginning Collection Desk or APKG export generation.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-EXCHANGE-03A | Focused Import view | DONE | Default Exchange view separates Anki provider import from supported HoloRecall file imports and hides compatibility internals. |
| HR-EXCHANGE-03B | Focused Export view | DONE | Separate HoloRecall content export from the nested Anki Basic/Extended text-export journey. |
| HR-EXCHANGE-03C | Templates view | DONE | Move starter workbooks, examples, prompt and format specification out of Export. |
| HR-EXCHANGE-03D | Remove normal-user stepper | DONE | Use title, analysis state, concise result and one primary action; retained-source workflows omit irrelevant steps. |
| HR-EXCHANGE-03E | One actionable Anki summary | DONE | Show deck, detected family, reconciled Ready/Needs review/Cannot import counts and only relevant actions before collapsed details. |
| HR-EXCHANGE-03F | Reconciled counts and grammar | DONE | User categories sum to the generated-card population and use correct singular/plural wording. |
| HR-EXCHANGE-03G | Explicit partial import | DONE | Review-required and unsafe cards cannot invisibly block ready cards; omission is explicit, confirmed and reported. |
| HR-EXCHANGE-03H | Actionable issue presentation | DONE | Translate missing answers and unsupported occlusion into review/exclusion actions; keep taxonomy under Advanced details. |
| HR-EXCHANGE-03I | Advanced mapping disclosure | DONE | Preserve the complete Mapping Studio behind Advanced details → Advanced mapping. |
| HR-EXCHANGE-03J | Simplified Manage Anki source | DONE | Default management offers Update, Rebuild, Review conversion and Detach; mapping internals require another explicit action. |
| HR-EXCHANGE-03K | Responsive accessible Exchange navigation | DONE | Import/Export/Templates states support reload/back, keyboard, touch and 200% text without a horizontal stepper. |
| HR-ANKI-REAL-01A | Trace real bBarryy occlusion | DONE | Inspect the actual package model, fields, payload, templates, ordinal, media and shape syntax; identify the evidenced classification cause. |
| HR-ANKI-REAL-01B | Correct native compatibility or fallback | DONE | Extend general native support when valid; otherwise retain source and expose an honest review/fallback without a deck-name special case. |
| HR-ANKI-REAL-01C | Real-package actionable acceptance | DONE | The real package reports reconciled counts, an understandable primary action and no hidden disabled-import reason. |

Evidence: the exact 2,724,246-byte package at `/Users/will_work/Downloads/bBarryy_anatomy_thorax_pt_1.apkg` has SHA-256 `ac1afdf3dd7e69f3de43fd8907b7a9f999556d4d970b39fe59fe076a151a55f1`, 29 notes, 61 generated cards, 16 JPEG media files and zero review-log entries. Analysis now reconciles **58 Ready + 0 Needs review + 3 Cannot import = 61**. The three exclusions are evidenced source defects: two Basic notes have empty Back fields, and one otherwise-native rectangle Image Occlusion note has an empty Image field. Valid native occlusion projection produces 26 cards. The former `tierC === 0` dead end is replaced by explicit omission consent, retained issue/source reporting and atomic import of the 58 safe cards. Complete unit/domain passes with the exact-package gate enabled. Exchange/real-package browser acceptance passes **3/3 Chromium**, **3/3 desktop WebKit** and **1/1 compact WebKit**; targeted legacy update/repair and Image Occlusion regressions pass. Production is **858.25 kB raw / 205.69 kB estimated transfer**; Exchange (**86.38 kB**) and the Anki Worker (**57.06 kB**) remain lazy under the 900 kB warning / 1 MB error policy. Collection Desk and APKG output were not started.

## Completed milestone — HR-ANKI-UX-02 + HR-IMAGE-OCCLUSION-01 + HR-BUNDLE-POLICY-01

Authorised 12 October 2026. This bounded milestone simplifies ordinary Anki review, adds native Image Occlusion data/rendering/authoring, and replaces the exhausted warning threshold without relaxing lazy-loading discipline. Collection Desk and production APKG output remain out of scope.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-BUNDLE-POLICY-01 | Realistic initial-bundle budget | DONE | Keep budgets; set initial warning to 900 kB and error to 1 MB, report measured raw/transfer/lazy changes, and keep specialist UI lazy. |
| HR-ANKI-UX-02A | Simple first experience | DONE | Ordinary review shows detection, confidence, representative Recall/Answer and one primary action. |
| HR-ANKI-UX-02B | Conversion Templates | DONE | Auto resolves friendly Basic, reversed, language, rich, cloze, Image Occlusion or custom families over Mapping Profiles. |
| HR-ANKI-UX-02C | Confidence-driven review | DONE | High-confidence imports proceed immediately; only uncertain cards/blocks receive prominent review. |
| HR-ANKI-UX-02D | Advanced Mapping disclosure | DONE | Existing c751930 Mapping Studio remains complete but is progressive disclosure. |
| HR-ANKI-UX-02E | Clear progress state | DONE | Analyse, conditional Review and Apply expose exactly one current state; retained-source repair omits irrelevant package selection. |
| HR-ANKI-UX-02F | Chip spacing | DONE | Rarity/status chips use token gaps and wrap without text-space hacks. |
| HR-IMAGE-OCCLUSION-01A | Native source analysis | DONE | Model Anki 23.10+ note/image/occlusion/header/back-extra/comments/tags/mode semantics from official structures and fixtures. |
| HR-IMAGE-OCCLUSION-01B | Normalised shapes | DONE | Rectangle, ellipse and polygon geometry stays source-normalised through scale/orientation/high-DPI changes. |
| HR-IMAGE-OCCLUSION-01C | Native modes | DONE | Hide All/Guess One and Hide One/Guess One retain Anki recall/reveal semantics. |
| HR-IMAGE-OCCLUSION-01D | Study presentation | DONE | Header, masked image, revealed target and concise/extended back material coexist with unobstructive collectible treatment. |
| HR-IMAGE-OCCLUSION-01E | Learning integration | DONE | Scheduled/Mastery/Free Revision, Recall Peek, Undo, Results and history retain existing scheduling semantics. |
| HR-IMAGE-OCCLUSION-01F | Native authoring | DONE | Create → Image Occlusion → image → masks/mode/support → preview → save works without external code. |
| HR-IMAGE-OCCLUSION-01G | Responsive mask editor | DONE | Select, shapes, move/resize/delete/duplicate/group/ungroup, undo/redo, zoom/pan and translucency support pointer/touch. |
| HR-IMAGE-OCCLUSION-01H | Stable card generation | DONE | Shape/group identities generate stable cards without accidental duplicates; studied-card removal uses existing destructive safeguards. |
| HR-IMAGE-OCCLUSION-01I | Supporting fields | DONE | Header/Back Extra render appropriately; Comments remain preserved authoring/source metadata. |
| HR-IMAGE-OCCLUSION-01J | Collection inspection | DONE | Recall is masked, Answer revealed, and inspection remains presentation-only. |
| HR-IMAGE-OCCLUSION-01K | Accessibility | DONE | Authored image/target descriptions identify the hidden-region task without leaking answers. |
| HR-IMAGE-OCCLUSION-01L | Import Review | DONE | Native variants show Image Occlusion · Native support; unsupported add-on variants remain review-required and retained. |
| HR-IMAGE-OCCLUSION-01M | Persistence/portability | DONE | Assets, shapes/groups/mode/support/accessibility/provenance and stable identities survive validated round-trip with deduplicated media. |
| HR-IMAGE-OCCLUSION-01N | Future export contract | DONE | Extended semantic contract carries native occlusion intent; TSV warns and never silently flattens masks. |

Evidence: unit/domain **226/226**, with one opt-in exact-package suite intentionally skipped by default; native Image Occlusion acceptance **7/7** across Chromium, desktop WebKit and compact WebKit; complete browser/profile matrix **238/238**. Production is **858.24 kB raw / 205.67 kB estimated transfer**, below the new 900 kB warning threshold and 1 MB error threshold. Exchange (**77.32 kB**), the Anki Worker (**56.82 kB**), Collection (**35.67 kB**) and the deferred Image Occlusion editor remain outside the initial route. The exact synced production shell passes the clean-fixture iPhone 17 Pro / iOS 26.5 packaged smoke **1/1 in 39.441 s**. The first rerun reused prior Simulator learning state and exhausted its seeded queue after one card; uninstalling that test-only app container restored the controlled fixture and the unchanged smoke passed. Evidence is retained under `.runtime/evidence/hr-anki-ux-io-20261012/`; physical-device touch, VoiceOver and native system-picker import remain separate acceptance gaps. Production APKG generation and Collection Desk were not started.

## Completed milestone — HR-ANKI-INTEROP-01 · Mapping Studio and bidirectional semantic contract

Authorised 12 October 2026. This bounded milestone keeps Collection Desk out of scope and preserves all learner, source, cosmetic and presentation state while making semantic projection reviewable at the Anki note-type/card-template boundary.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANKI-INTEROP-01A | Canonical subject-neutral semantic roles | DONE | One role vocabulary covers Recall, Answer essentials, Answer Support and non-learning presentation without language-specific domain assumptions. |
| HR-ANKI-INTEROP-01B | Import semantic analysis | DONE | Each distinct note type/template retains source-block mapping, confidence, evidence and stable identity. |
| HR-ANKI-INTEROP-01C | Import Review | DONE | New imports show representative Recall, Answer and Answer Support outcomes; obvious mappings retain a short Review → Import path. |
| HR-ANKI-INTEROP-01D | Manual Mapping Studio | DONE | A compact source/sample/role editor updates representative previews without exposing raw HTML. |
| HR-ANKI-INTEROP-01E | Mapping scope | DONE | Default scope is note type + card template, with deliberate matching-template/deck reuse and exceptional per-card overrides only. |
| HR-ANKI-INTEROP-01F | Reusable Mapping Profiles | DONE | Confirmed profiles survive update/reimport, outrank automatic inference and can be reviewed, edited or reset. |
| HR-ANKI-INTEROP-01G | Existing-deck semantic repair | DONE | Retained source can be remapped and atomically applied in place without changing learner state or source identity. |
| HR-ANKI-INTEROP-01H | Lossless semantic coverage | DONE | Meaningful safe source content is assigned, explicitly excluded, or retained as Original card details; front/back fidelity remains permanent. |
| HR-ANKI-INTEROP-01I | Answer Support term/pronunciation treatment | DONE | Multiline term cells keep a primary term and subordinate secondary line instead of concatenating them. |
| HR-ANKI-INTEROP-01J | Answer Support visual rhythm | DONE | Major sections, pairs and tables use spacing/hierarchy instead of separator-heavy raw-HTML presentation. |
| HR-ANKI-INTEROP-01K | Broad note/template-family status | DONE | Basic, reversed, custom, FrontSide, rich safe HTML and media paths are evidenced; Cloze/Image Occlusion gaps are detected and stated accurately. |
| HR-ANKI-INTEROP-01L | Basic and Extended v1 export contracts | DONE | Versioned subject-neutral fields and predictable qfmt/afmt are defined for simple and rich HoloRecall cards. |
| HR-ANKI-INTEROP-01M | Export preview | DONE | The learner can compare HoloRecall content with generated Anki front/back and sees Basic-loss warnings. |
| HR-ANKI-INTEROP-01N | Safe export format feasibility | DONE | Implement only an evidenced Anki-compatible format; production APKG packaging remains explicit follow-on work if absent. |
| HR-ANKI-INTEROP-01O | Round-trip identity contract | DONE | Imported provenance and native stable export identity prevent accidental unrelated duplicates. |
| HR-ANKI-EXPORT-APKG-01 | Production APKG generation | DEFERRED | Build and validate an actual Anki package only in a later bounded milestone; do not emit brittle undocumented SQLite archives. |

Evidence: unit/domain **220/220** with one opt-in real-package test skipped by default; the exact 254-card Italian package test passes separately. The complete browser matrix reached **227/231** on its first pass: three phone-profile failures were an obsolete button-name assertion after the deliberate Mapping Studio rename and pass **3/3** with the current name; one existing WebKit animation-object sample passes unchanged **4/4** in focused rerun. New Mapping Studio/preview/export acceptance passes in Chromium, desktop WebKit and compact WebKit. Production is **849.99 kB raw / 203.12 kB transfer**, under the unchanged 850 kB ceiling; Exchange (73.56 kB) and the Anki Worker (52.55 kB) remain lazy. Packaged iPhone 17 Pro / iOS 26.5 Study/navigation smoke passes **1/1 in 44.650 s**.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-ANKI-CLOZE-ADV-01 | Advanced cloze/add-on compatibility | PLANNED | Standard cloze is supported; advanced add-on filters/behavior require explicit fixtures and must stay simplification/review until evidenced. |
| HR-ANKI-IMAGE-OCCLUSION-01 | Dedicated Image Occlusion projection | DONE | Superseded and completed by HR-IMAGE-OCCLUSION-01A–N: native masks, modes, shared rendering, authoring and portable v10 are implemented; native APKG writing remains separately deferred. |

## Completed corrective milestone — HR-STUDY-RESULTS-POLISH-01

Authorised 12 October 2026 after manual Study and Results review exposed six interaction and presentation defects. Collection Desk remains out of scope.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-STUDY-RESULTS-01 | Remove cosmetic-animation Replay | DONE | Remove only the Results control and code that replay cosmetic presentation; retain legitimate navigation and inspection. |
| HR-STUDY-RESULTS-02 | Stable Study viewport | DONE | Recall, Answer and temporary Recall Peek retain the same horizontal page geometry for short and long support. |
| HR-STUDY-RESULTS-03 | Answer Support proximity | DONE | Full-width support remains below both Study tracks with a smaller token-defined gap. |
| HR-STUDY-RESULTS-04 | Structured Answer Support | DONE | Recognised headings, pairs, tables, lists and code retain native semantic relationships and local overflow. |
| HR-STUDY-RESULTS-05 | Support-section hierarchy | DONE | Useful reference material is scannable without a flat dump or needless nested panels. |
| HR-STUDY-RESULTS-06 | Temporary Recall Peek | DONE | A revealed Study card can show Recall temporarily, returns to Answer after about 2.5 seconds, and ratings remain valid. |
| HR-STUDY-RESULTS-07 | Reveal-only auto-return | DONE | No timer runs before answer reveal; manual return and session/card changes cancel stale work. |
| HR-STUDY-RESULTS-08 | Results collectible inspection | DONE | Existing cosmetic/unlock/Prestige cards use the shared accessible click/tap/keyboard inspection contract. |
| HR-STUDY-RESULTS-09 | Semantically correct Results cards | DONE | Results reuse the real card faces and Design Set/rarity/Prestige treatment without learner-state mutation. |
| HR-STUDY-RESULTS-10 | Exact manual cases and regression gate | DONE | Six reported cases pass across Chromium/WebKit/compact layouts, unit/domain and production budget checks; available Simulator evidence stays distinct. |

Evidence: unit/domain **215/215**; focused Study/Results acceptance **7/7** in Chromium; the complete browser run passed **225/226**, with its one existing WebKit reduced-motion animation-object sampling assertion passing unchanged **1/1** in immediate isolation. All new cases passed in Chromium, desktop WebKit, compact WebKit and landscape WebKit. Production is **849.91 kB raw / 203.09 kB transfer**, 0.09 kB below the unchanged 850 kB ceiling. Structured pair/table data survives portable exchange. The packaged iPhone 17 Pro / iOS 26.5 smoke passes **1/1 in 42.361 s**; physical-device evidence remains separate.

## Completed corrective milestone — HR-PRESENTATION-POLISH-01

Authorised and completed 12 October 2026 after manual browser acceptance exposed four presentation defects not covered by the preceding automated checks. Collection Desk remains out of scope. Will's observations are retained as the failure evidence and the exact rendered surfaces now have regression coverage.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-PRESENTATION-01A | Composition-aware text-first alignment | DONE | Typographic Showcase uses one deliberate axis and compatible widths for prompt, context, cue and guidance without changing other composition alignments. |
| HR-PRESENTATION-01B | Full-width Study Answer Support | DONE | Wide Study renders card and rating in row one with Answer Support spanning both columns; compact Study stacks card, rating, then support. |
| HR-PRESENTATION-01C | Readable answer-reference presentation | DONE | Native support sections, prose, lists and locally scrolling tables use a clear reading hierarchy without bloating the collectible card. |
| HR-PRESENTATION-01D | Trace the actual Collection grid surface | DONE | The inert, answer-only `.collectible-item.hr-reveal .collectible-card` surface and its scroll-region click guard were identified; earlier evidence covered only selected detail. |
| HR-PRESENTATION-01E | Unified collectible inspection flip | DONE | The actual Collection card grid uses the shared renderer: Recall by default, click/tap/Enter/Space toggles, meaningful drag only tilts, and another inspected card resets the grid to Recall. |
| HR-PRESENTATION-01F | Pure and accessible inspection | DONE | Grid flips retain button name/pressed state and leave reviews, FSRS, due dates, mastery, Prestige, rarity and content unchanged. |
| HR-PRESENTATION-01G | Collection support/action spacing | DONE | Answer Support and Practice use distinct token-spaced regions; neighbouring mastery and history retain a consistent vertical rhythm. |
| HR-PRESENTATION-01H | Exact manual-case and responsive acceptance | DONE | The vowel card, wide/compact Study, Collection support/action and real collectible-grid cases pass across requested widths and 200% text. |

Evidence: unit/domain **214/214**; focused corrective matrix **7/7**; complete Chromium/WebKit/mobile-WebKit matrix **220/220**; packaged iPhone 17 Pro / iOS 26.5 smoke **1/1**. Production is **849.50 kB raw / 202.98 kB transfer**, below the unchanged 850 kB ceiling. Ignored artifacts live under `.runtime/evidence/hr-presentation-polish-20261012/`.

## Completed milestone — Mastery to Prestige 1–10 foundation

Authorised 11 October 2026. Prestige is an earned cosmetic/mastery domain layered after Design Set, authored rarity and finish. It never rewrites scheduling, content or source identity; Collection Desk remains out of scope.

| ID | Requirement | Status | Acceptance boundary |
|---|---|---|---|
| HR-PRESTIGE-01 | Separate progression domains | DONE | Rarity, scheduling, rarity unlock, mastery, Prestige, treatment and cosmetics remain independent. |
| HR-PRESTIGE-02 | Eligible Study modes | DONE | Scheduled Anki/Mastery reviews may contribute; Free Revision/practice never does. |
| HR-PRESTIGE-03 | Mastery ceiling | DONE | Eligible activity promotes through Prestige I–X and resets only its cosmetic cycle. |
| HR-PRESTIGE-04 | Anti-farming | DONE | Immutable review IDs, distinct study days and spacing prevent duplicate/session/import/replay farming; Undo is safe. |
| HR-PRESTIGE-05 | P1–P10 visual cadence | DONE | Cumulative treatments make P1, P5 and P10 distinct without obscuring content. |
| HR-PRESTIGE-06 | Design Set integration | DONE | Prestige follows Design Set → rarity variant → finish across art/content types. |
| HR-PRESTIGE-07 | Badge / crest | DONE | Compact non-colour indicator appears in Collection, inspection/browser and earned results. |
| HR-PRESTIGE-08 | Post-Study progression | DONE | Results present actual persisted progress/promotions and cannot duplicate awards. |
| HR-PRESTIGE-09 | Collection presentation | DONE | Identify, filter/sort, inspect level and next-cycle progress without Collection Desk. |
| HR-PRESTIGE-10 | Locked/unlocked/prestige state | DONE | Teaser-safe reusable presentation state exists without revealing answers. |
| HR-PRESTIGE-11 | Concise explanation | DONE | Level/progress/counting rules are understandable with detail behind disclosure. |
| HR-PRESTIGE-12 | Data / portability | DONE | Promotion state derives from validated events; Undo/reload are idempotent and backup preserves it. |

Platform acceptance covers Chromium, desktop/mobile WebKit and available Simulator evidence. Physical haptics, VoiceOver and device performance remain separate. Initial web budget remains 850 kB.

## Active milestone — Search, organisation and scalable local media

### HR-GOV-03 — Canonical local work-item tracker

- **Product area / milestone / priority:** Governance / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Existing charter, capability roadmap and durable handoff
- **Requirement:** Establish this tracker, document its lifecycle and make the record-before-work cadence standing repository guidance without creating GitHub Issues.
- **Acceptance:** Every milestone request below is recorded before implementation; `AGENTS.md` links this record and defines state transitions; coherent batches update `project-status.md`; completed history remains discoverable.
- **Platform implications:** None at runtime; interruption recovery must not depend on chat history.
- **Implementation notes:** This tracker owns actionable execution only. It does not replace the charter, roadmap or handoff.
- **Verification / evidence:** Tracker predates implementation, retains every item and is linked from `AGENTS.md`; each coherent batch has a restart entry in `project-status.md`.
- **Commits:** `e0f739c`, `c9f7f23`.

### HR-ORG-01 — Global search

- **Product area / milestone / priority:** Organisation / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Platform-neutral content index; stable deck/card identities
- **Requirement:** Responsive offline search across deck titles and meaningful card content, including answers, meaning, pronunciation, notes, tags and useful source metadata. Results distinguish decks, cards and match context and navigate directly to the relevant context.
- **Acceptance:** Indexed query avoids DOM-wide scanning; wide and compact Material 3 experiences support keyboard and touch; empty state is concise; 1,000- and 10,000-card fixtures provide measured response evidence.
- **Platform implications:** Worker or index boundary must not assume a web filesystem; WebKit, lifecycle cancellation, offline use and future native storage remain explicit.
- **Implementation notes:** Internal IDs must not become ordinary searchable content.
- **Verification / evidence:** Unicode/accent-insensitive domain tests cover learner fields and ID exclusion. Chromium and WebKit navigate card results and measure the 10,000-card Worker path; desktop keyboard selection uses combobox/listbox semantics.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-ORG-02 — Filtering and sorting

- **Product area / milestone / priority:** Organisation / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-01 query boundary; rewards and scheduler read models
- **Requirement:** Add combinable deck/subdeck, tag, rarity, earned state, design, finish, scheduling/attention and media filters where meaningful, plus useful sorting. Use progressive disclosure and active chips.
- **Acceptance:** Combined filters return accurate cards, clearing is obvious, navigation back preserves the active view without trapping the learner, and persisted content is unchanged.
- **Platform implications:** Touch-sized controls, keyboard operation, 200% reflow and compact/landscape layouts.
- **Implementation notes:** Filters are view state, not portable learner content.
- **Verification / evidence:** Domain combination tests and browser navigation prove shared Decks/Collection state, removable active chips, clearing and no content mutation. Collection exposes the same filter model through progressive disclosure.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-ORG-03 — Tags and deck hierarchy

- **Product area / milestone / priority:** Authoring and organisation / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Compatible state migration and atomic bulk mutation
- **Requirement:** Canonical tag add/remove/rename and bulk operations; preserve imported tags. Add explicit deck/subdeck relationships, rename/move decks, and single/bulk card moves. Keep deletion non-destructive or separately confirmed.
- **Acceptance:** Trivial case/spacing variants do not duplicate tags; hierarchy cycles are rejected; safe bulk changes preserve review history, sessions and cosmetics; imported `::` hierarchy migrates predictably.
- **Platform implications:** Platform-neutral validation; usable keyboard and touch bulk flows.
- **Implementation notes:** Archive is preferred to destructive deletion during this milestone.
- **Verification / evidence:** Schema 4 migration/cycle tests, Anki `::` conversion, parent-deck queue/archive tests and browser bulk preservation evidence pass. Full backup preserves hierarchy; content workbook v3 remains flat and is recorded as a format limitation.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-ORG-04 — Scalable bulk management

- **Product area / milestone / priority:** Library management / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-02 and HR-ORG-03
- **Requirement:** Efficient selection and bulk move, tag, rarity, design, finish and archive actions without rendering thousands of collectible-card effects.
- **Acceptance:** Incremental rendering, paging or virtualization bounds DOM work; selection is scoped, keyboard-capable and touch-friendly; 10,000-card fixture proves large selection and mutation remain responsive.
- **Platform implications:** Avoid hover-only operation, permanent animation loops and inaccessible offscreen selected controls.
- **Implementation notes:** Only visible collection items animate.
- **Verification / evidence:** Both views render a 60-item slice with explicit incremental loading; atomic bulk preservation passes in Chromium/WebKit. The 10,000-card fixture proves one-result DOM/query bounds; broader 10k mutation profiling remains under HR-ORG-06.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

### HR-MEDIA-01 — Scalable local media registry

- **Product area / milestone / priority:** Persistence and portability / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Existing schema-3 asset model, IndexedDB adapter, import/export and backup contracts
- **Requirement:** Evolve the current single-snapshot media assumptions into an efficient stable registry for images, audio, backgrounds, frames and textures. Add content hashing/deduplication, reference accounting and an explicit safe cleanup operation.
- **Acceptance:** Identical imports reuse bytes; conflicting IDs remain safe; referenced assets cannot be cleaned; reload and old backup/package migration work; portable decks and full backups contain required bytes; index metadata is reconstructable.
- **Platform implications:** IndexedDB remains the web prototype; future native durable media uses the same stable IDs. Object URLs are never durable identities and resources are cleaned on lifecycle changes.
- **Implementation notes:** Do not auto-purge uncertain assets or clear existing storage.
- **Verification / evidence:** IndexedDB v2 separates metadata/payloads atomically and skips unchanged byte reads/writes on routine commits. Hashes are recomputed, duplicate bytes reuse stable IDs, reference-safe cleanup is explicit, old snapshots migrate, and ZIP/full-backup media round trips pass in both engines.
- **Commits:** `c4095fe`, `7f7cf3c`.

### HR-ORG-05 — Collection library experience

- **Product area / milestone / priority:** Collection / Search and organisation / P1
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-01, HR-ORG-02 and HR-ORG-04
- **Requirement:** Preserve the premium collectible identity while adding useful All, rarity, deck, recently unlocked, next unlock and query-driven views.
- **Acceptance:** Rich inspection remains; result grids are bounded; visible high-rarity cards may use restrained entrance/focus effects; search/filter navigation is direct; no new currency or unrelated game layer.
- **Platform implications:** WebKit-safe compositing, reduced motion, effects preference, touch and keyboard inspection.
- **Implementation notes:** Existing card renderer, finishes, design sets, tilt, `hrReveal` and M3 tokens remain authoritative.
- **Verification / evidence:** Collection retains the shared renderer, inspection, unlock views, bounded rows, direct search and progressive filters. Chromium/WebKit and reduced-motion journeys cover the presentation.
- **Commits:** `c4095fe`, `7f7cf3c`.

### HR-ORG-06 — Large-library performance

- **Product area / milestone / priority:** Performance / Search and organisation / P0
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** HR-ORG-01, HR-ORG-04 and HR-MEDIA-01
- **Requirement:** Add reproducible 1,000- and 10,000-card fixtures and measure load, index, query, filter, scroll, selection, media resolution and import-to-index availability.
- **Acceptance:** Record real environment and timings, derive regression budgets from observed baselines, demonstrate responsive indexing and safe cancellation/recovery, and never count a completed test alone as performance evidence.
- **Platform implications:** Measurements are browser evidence only; WebKit is not native iOS/macOS proof.
- **Implementation notes:** Reuse existing large Anki fixture where it matches the scenario.
- **Verification / evidence:** Node 24.3/macOS: 1,000-card index/query stay below 500/100 ms test budgets. The final 10,000-card run measured 729.2 ms index, 6.6 ms combined query, 788.8 ms content-to-index availability, 19.1 ms atomic all-card mutation, 17.3 ms registry construction and 114.2 ms for 10,000 media resolutions. Earlier Chromium measured 2,296 ms index/render and 46 ms query/render; WebKit measured 1,077 ms and 69 ms. The DOM remains bounded at 60 normally and one for the measured query. These are local browser/Node baselines, not native-device claims.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`, pending study-milestone checkpoint.

### HR-ORG-07 — UI consistency gate

- **Product area / milestone / priority:** Design system / Search and organisation / P1
- **Status:** DONE
- **Source:** Will, 30 September 2026
- **Dependencies:** Changed organisation views
- **Requirement:** Apply the charter layout contract to changed screens: shared padding/tracks, deliberate alignment, Material controls, concise copy, hierarchy and complete themes. Record unrelated issues rather than redesigning accepted screens.
- **Acceptance:** Changed flows pass Light/Dark/System, compact/large/landscape, keyboard/touch, reduced motion and 200% text checks with visible focus and no horizontal overflow.
- **Platform implications:** Maintain safe areas, WebKit behavior and future iOS/macOS readiness without native-verification claims.
- **Implementation notes:** Focal card inspection may remain centered; repeated prose/list content normally start-aligns.
- **Verification / evidence:** Changed screens use shared Material/system tokens, start-aligned list tracks and progressive controls. WebKit compact/large/landscape at 200% text passes; theme/reduced-motion coverage remains in the full regression gate.
- **Commits:** `c4095fe`, `20d36bf`, `7f7cf3c`.

## Active defect recovery — Anki preview, hierarchy and Study transitions

These defects were reported from manual testing on 3 October 2026. They take priority over further Study Settings work. Reproduction and destructive verification must use isolated fixtures; the learner's imported decks, media and review history must not be reset or rewritten.

### HR-BUG-ANKI-01 — Import warning severity and classification
- **Product area / milestone / priority:** Anki import / Defect recovery / P0
- **Status:** DONE
- **Source:** Will's manual import of a 39-card package, 3 October 2026
- **Dependencies:** Existing worker parser, sanitisation and import preview
- **Requirement / acceptance:** Distinguish blocking conversion errors, meaningful content-loss warnings and harmless Anki-only simplifications. Anki TTS/filter syntax must preserve convertible field content and safe hyperlinks must not be classified as remote fetch dependencies. Preview counts must state normal, simplified, excluded and unsafe cards accurately, with details behind disclosure and explicit exclusion only for genuinely unsupported cards.
- **Platform implications:** Worker-safe inert conversion; Material 3 semantic states; WebKit/touch/keyboard/reflow; no remote fetching or imported active content.
- **Implementation notes:** First identify the exact triggering templates/syntax, count semantics and whether prompt, answer or required media is lost.
- **Verification / evidence:** Root cause reproduced: one broad issue list made every occurrence a blocking red exclusion; TTS/filter syntax remained literal and `href` was grouped with resource `src`. Domain fixtures prove preserved prompts/answers, inert TTS/filter simplification, ignored safe-link targets, separate remote-media warnings, required-prompt exclusion and mutually exclusive card counts. The animation-enabled defect suite passed 8/8 in Chromium/WebKit; the complete desktop gate passed 118/118 and phone WebKit passed 18/18 after correcting a real 200%-text summary overflow. Evidence is retained under `.runtime/evidence/hr-anki-defects-20261003/`.
- **Commits:** `0687816`.

### HR-BUG-ANKI-02 — Imported deck hierarchy and learning journey
- **Product area / milestone / priority:** Anki import and Decks / Defect recovery / P0
- **Status:** DONE
- **Source:** Will's manual Lesson 1 import, 3 October 2026
- **Dependencies:** Existing deck `parentId`, queue descendant logic, content exchange format
- **Requirement / acceptance:** Preserve authoritative Anki parent/subdeck structure with stable identities; show parents as aggregate learning journeys with progressively disclosed, individually studyable descendants; keep direct and recursive counts semantically consistent; parent Study gathers descendants and child Study stays scoped; reimport does not duplicate the tree.
- **Platform implications:** Platform-neutral hierarchy and queue logic; compact Material 3 hierarchy on web/iOS/macOS widths; portable version migration must retain hierarchy.
- **Implementation notes:** Determine whether import loses relationships, the Decks UI flattens existing relationships, counts mix scopes, or a combination. Never infer hierarchy only from punctuation when authoritative source data exists.
- **Verification / evidence:** Genuine Anki 26.9.3 analysis proved source hierarchy already converted to stable `parentId`; flat Decks rendering plus direct-card/recursive-ready count mixing caused the defect. Parent journey/subdeck Chromium and WebKit journeys pass; domain hierarchy identity, aggregate counts, parent/child queue scope, reimport preservation and format-v4 XLSX/ZIP parent/sibling round trips pass while v1–v3 remain readable. Complete browser evidence: 118/118 desktop and 18/18 phone WebKit. Evidence is retained under `.runtime/evidence/hr-anki-defects-20261003/`.
- **Commits:** `0687816`.

### HR-BUG-STUDY-01 — Imported card disappears after transition
- **Product area / milestone / priority:** Study presentation / Defect recovery / P0 (highest)
- **Status:** DONE
- **Source:** Will's manual multi-card imported-deck Study, 3 October 2026
- **Dependencies:** Save-gated confidence feedback, deal transition, shared card renderer and imported media/content
- **Requirement / acceptance:** Reproduce the first-to-second/third imported-card transition and identify whether domain queue, converted content, renderer state or stale presentation callbacks cause the loss. Every accepted transition must settle the current active card visibly; callbacks must be scoped to their transition/card; optional motion failure/cancellation must fail visible. Preserve Study geometry, controls, order, Undo, deduplication, timing and reduced-motion behavior.
- **Platform implications:** Animation cleanup and background/resume safety; Chromium and Playwright WebKit evidence; native Safari/WKWebView remains separately unverified.
- **Implementation notes:** Capture active/queue IDs, transition generation/state, renderer presence and final computed opacity/visibility/display/transform. Do not mask the defect with longer timeouts.
- **Verification / evidence:** Reproduced in both engines: queue/current content advanced correctly, but the finished 180 ms outgoing animation retained `opacity:0` and translate through `fill:forwards` after the incoming animation released. Owned animations now cancel on success, stale-run, navigation, destruction and background settlement. Genuine imported-card journeys prove two consecutive transitions settle at opacity 1, transform none, no retained animation and exactly one event per rating; interruption settles visibly; reimport preserves states, reviews, rewards and hierarchy. Defect suite 8/8, complete desktop 118/118 and phone WebKit 18/18 passed without retries or skips.
- **Commits:** `0687816`.

## Paused milestone — Study configuration, history and Anki normalization

All items below originate from Will's 1 October 2026 milestone. The lead owns schema, scheduler contracts and integration. Official comparison sources are the current Anki Manual deck-options, studying, preferences, browsing and packaged-deck pages; these define comparison points, not a requirement to copy Anki's interface.

### HR-STUDY-01 — Reusable HoloRecall study presets
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Schema migration; FSRS adapter
- **Requirement / acceptance:** Stable named presets with built-ins, create/duplicate/rename/edit, deck assignment/usage, safe defaults and referenced-delete protection; deck exceptions and today-only limits stay separate.
- **Platform implications:** Platform-neutral resolution, compact Material 3 UI, keyboard/touch/200% reflow.
- **Verification / commits:** Schema-5 preset IDs survive rename/reload; create/duplicate/edit/restore, deck assignment, referenced replacement/delete and built-in defaults are covered by store/domain tests and Chromium/WebKit settings journeys. Commit `91800ea` plus final milestone checkpoint.

### HR-STUDY-02 — Daily workload and hierarchy limits
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** HR-STUDY-01; hierarchy-aware queue
- **Requirement / acceptance:** New/review limits, new-after-review-limit policy, per-deck and today-only overrides, deterministic parent/subdeck caps and honest limited-work explanations without history mutation.
- **Platform implications:** Local-day/DST behavior remains platform-neutral and interruption safe.
- **Implementation notes:** Accepted review events retain owning deck, full ancestry, selected Study root, learner day and IANA time zone. The selected root caps the aggregate queue; every applicable branch between each card's owning deck and that selected root caps its descendant contribution. Direct child Study stops limit resolution at that child and excludes unrelated branches. New introductions and mature reviews have separate ledgers; only cards admitted inside the root cap consume contribution allowance; learning/relearning remains scheduler-correct.
- **Verification / commits:** Fixed-clock Course/Lesson A/Greetings/Introductions/Lesson B tests prove unrelated-deck isolation, repeated same-day seeding, selected-parent aggregation, intermediate and leaf caps, shared-parent state, learner-day reset, today-only expiry, distinct new/review limits, bounded candidate charging, exact-once undo and administrative/practice exclusion. Backup validation checks that attribution is a real parent chain while retaining legacy events. Chromium and WebKit verify apply/reload/clear without review mutation. Implementation commits `4df9d61` and `cb2bbce`.

### HR-ACCEPT-ANKI-01 — Exact real-package manual acceptance
- **Product area / milestone / priority:** Anki import and Study / Study configuration / P1
- **Status:** VERIFY — USER RETEST REQUIRED
- **Source:** Will, 3 October 2026 follow-up acceptance direction; exact package supplied 9 October 2026
- **Dependencies:** Will's exact real-world `.apkg`; accepted HR-BUG-ANKI-01/02 and HR-BUG-STUDY-01 implementation
- **Requirement / acceptance:** Manually verify that the exact package presents proportionate simplification/warning classifications, retains its parent/subdeck journey, and keeps several consecutive imported Study cards visibly settled.
- **Platform implications:** This is real-content acceptance on Will's local browser profile, not native iOS/macOS verification. It must not clear or rewrite existing learner history.
- **Implementation notes:** Automated genuine/synthetic fixtures remain supporting evidence. They do not substitute for this exact package or permit this item to be marked DONE.
- **Verification / evidence:** The supplied 42-card reconstructed package now passes isolated domain plus Chromium/WebKit Update/Repair acceptance: all 42 legacy converter-derived cards are structured upgrades, zero are classified as local conflicts, and the rendered After panel is the same transaction payload Apply persists. GUID `jY03zlP8xdb2` becomes Answer `Ciao!`, Pronunciation `CHOW`, Meaning `Hi / Hello / Bye — informal`, with Literal, Use/examples, Pattern/sound and Reference details; the legacy helper phrase is absent. Card ID, scheduler state, review/reward collections and imported media remain unchanged. Automated evidence permits a real local-profile retest, but only Will can mark this manual item DONE. The later exact 254-card package at SHA-256 `02f537522f25dfc0060011e391ba6fe3a98dddf9427b14f23505d80b5f75247a` also passes template-first domain and Chromium/WebKit gates: every answer is source `Italian`, `Language = it` is absent from the schema and the legacy fixture still proves metadata cannot replace the answer. Twenty native panels across all three lessons and multiple source kinds were inspected in each browser engine. The item remains user-owned VERIFY because automation did not mutate or retest Will's genuine local learner profile.
- **Commits:** Earlier tracking `1539f81`; semantic repair `d364c77`; template-first implementation `34b22f4`; repair integration `2ad3846`; closing evidence documentation follows.

### HR-STUDY-03 — Supported FSRS settings
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Installed `ts-fsrs` 5.4.2 capabilities
- **Requirement / acceptance:** Desired retention and maximum interval are honored; learning/relearning steps are exposed only where correct; optimisation exists only if a trustworthy supported implementation is present, with explicit apply/recovery.
- **Platform implications:** Pure domain configuration; no imported parameters or native divergence.
- **Verification / commits:** `ts-fsrs` 5.4.2 accepts the validated retention, maximum interval and same-day learning/relearning steps. Review events snapshot resolved settings. The installed package has no optimiser, so optimisation remains a named roadmap gap rather than a UI action.

### HR-STUDY-04 — Preserve five-confidence grading
- **Product area / milestone / priority:** Study / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Existing Study renderer and scheduler adapter
- **Requirement / acceptance:** Retain 1/2/3/4/5 → Again/Hard/Good/Good/Easy with original ratings, labels/help, save-gated effects and timing; no fifth FSRS grade.
- **Platform implications:** Preserve keyboard, touch, reduced motion and fixed Study geometry.
- **Verification / commits:** Domain tests confirm `1/2/3/4/5 → Again/Hard/Good/Good/Easy`, ratings 3/4 schedule identically from identical state/time while persisting their original value. Accepted Chromium/WebKit Study timing/geometry suites pass.

### HR-STUDY-05 — Deterministic queue and display order
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** HR-STUDY-01/02; stable new-card position
- **Requirement / acceptance:** Supported gather/sort, new-versus-review and review due/random/retrievability orders alter only the persisted queue; animations follow it. Deterministic tests cover every option.
- **Platform implications:** Platform-neutral randomness injection and reload recovery.
- **Verification / commits:** Stable due, deterministic hash-random, explicit position, gathered/random, before/mixed/after and per-card FSRS retrievability ordering are domain-owned; the persisted session queue remains the renderer/deal order. Due/position outcomes and repeatability pass fixed-state tests; stronger expected-order fixtures for random/retrievability are tracked under HR-TEST-01.

### HR-STUDY-06 — Siblings, burying and suspension
- **Product area / milestone / priority:** Scheduling / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Stable source note/template sibling identity
- **Requirement / acceptance:** Configurable sibling burying, manual bury/unbury and persistent suspend/unsuspend remain distinct from archive. Reversed/cloze siblings survive import/reimport and statuses appear in management filters.
- **Platform implications:** Day-boundary/DST persistence and accessible bulk controls.
- **Verification / commits:** Native reversible pairs and imported cards share explicit sibling IDs; auto bury uses learner-day keys, manual bury is separate, and suspension persists. Collection/index filters expose buried/suspended state. Interday-learning bury is not applicable while supported steps are same-day.

### HR-STUDY-07 — Lapses and leech management
- **Product area / milestone / priority:** Scheduling / Study configuration / P1
- **Status:** DONE
- **Dependencies:** Review history; HR-STUDY-03/06
- **Requirement / acceptance:** Real failures drive configurable attention threshold and optional suspend action; default flags only. No rarity, entitlement or punitive-low-confidence coupling.
- **Platform implications:** Pure event-derived policy; visible recovery on all layouts.
- **Verification / commits:** Active, scheduled rating-1 events drive a configurable threshold; default action flags, optional action suspends. Tests prove flag-only behavior and no cosmetic/scheduler-grade coupling.

### HR-STUDY-08 — Reviewer preferences
- **Product area / milestone / priority:** Study / Study configuration / P1
- **Status:** DONE
- **Dependencies:** Existing audio, timing and confidence controls
- **Requirement / acceptance:** Remaining-count and predicted-interval visibility, audio autoplay/stop behavior, recorded-answer cap and optional visible timer preserve scheduling and active-time semantics. Auto Advance and Easy Days were evidence-gated here and are resolved under HR-STUDY-09 and HR-STUDY-10.
- **Platform implications:** Audio/lifecycle cleanup, reduced motion, touch, future native interruption.
- **Verification / commits:** Study supports optional counts, predicted next timing, visible timer, configurable recording cap, autoplay with accessible fallback and stop-on-action/lifecycle cleanup. HR-STUDY-09 is now DONE; HR-STUDY-10 records the evidence-based Easy Days dependency instead of simulating it.

### HR-HIST-01 — Truthful card review history
- **Product area / milestone / priority:** History / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Immutable review/reversal events
- **Requirement / acceptance:** Collection/management exposes concise review history with persisted time, confidence, grade, state, interval/due changes, timing and FSRS values; missing historical values say unavailable.
- **Platform implications:** Bounded rendering, semantic table/timeline and compact reflow.
- **Verification / commits:** Collection card inspection and Progress expose a bounded 50-row timeline with persisted confidence/grade, before/after state, interval, due, timing, stability/difficulty and reversal state. Historical retrievability is labelled unavailable. Chromium/WebKit journeys pass.

### HR-HIST-02 — Safe scheduling administration
- **Product area / milestone / priority:** History / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Versioned administrative events and atomic store operations
- **Requirement / acceptance:** Set due, suspend, bury, reset/forget and meaningful new-card reposition operations are confirmed, atomic and history-preserving. Administrative events never count as recall or rewards.
- **Platform implications:** Durable reload/recovery and touch/keyboard confirmation.
- **Verification / commits:** Atomic single/bulk set-due, reset, bury, suspend and reposition commands append distinct management events. Reset preserves reviews/rewards; Progress continues to count only review events. HR-HIST-04 now supplies exact valid administrative undo without turning those records into reviews.

### HR-HIST-03 — Scheduling-state and history filters
- **Product area / milestone / priority:** History / Study configuration / P1
- **Status:** DONE
- **Dependencies:** Existing library index and Progress date filters
- **Requirement / acceptance:** Extend the current index for new/learning/review/due/overdue/suspended/buried/attention/recently reviewed; add date-filtered history without a second search system.
- **Platform implications:** Worker-safe reconstructable fields and compact filter disclosure.
- **Verification / commits:** The existing index now covers overdue, suspended, buried, leech and recently reviewed alongside prior states. Progress date controls filter the shared history view; no second search/index architecture was added.

### HR-IMPORT-02 — Normalize Anki content into HoloRecall study
- **Product area / milestone / priority:** Import / Study configuration / P0
- **Status:** DONE
- **Dependencies:** HR-STUDY-01; existing stable source identities
- **Requirement / acceptance:** Preview selects a HoloRecall preset and states that Anki learning history is excluded. New imports enter native New state; reimport preserves HoloRecall state/history/rewards. No Anki scheduling, options, parameters or AnkiWeb data are adopted.
- **Platform implications:** Worker conversion stays content-only and platform-neutral.
- **Verification / commits:** Anki preview provides a concise HoloRecall preset selector and required history-exclusion copy. New decks receive that preset and cards remain New; reimport preserves native schedules, reviews, rewards, suspend/bury/leech/position and existing preset assignment. Unit/import/browser fixtures pass.

### HR-PLAN-02 — Study-settings capability matrix
- **Product area / milestone / priority:** Planning / Study configuration / P0
- **Status:** DONE
- **Dependencies:** Current official Anki Manual and implemented evidence
- **Requirement / acceptance:** Classify every requested settings/history capability as DONE/PARTIAL/PLANNED/NOT APPLICABLE/NOT PLANNED. Record **AnkiWeb Sync — NOT PLANNED** and keep future HoloRecall sync separate.
- **Platform implications:** Evidence must distinguish web, WebKit and native verification.
- **Verification / commits:** `docs/product-brief.md` contains the explicit settings/review matrix and separates Anki content import, HoloRecall exchange/backup, future HoloRecall sync and **AnkiWeb Sync — NOT PLANNED**.

### HR-PERF-01 — Recover initial bundle warning headroom
- **Product area / milestone / priority:** Performance / Study configuration / P2
- **Status:** BACKLOG
- **Source:** Production build measurement, 3 October 2026
- **Dependencies:** Angular route/chunk ownership review
- **Requirement / acceptance:** Return the initial production bundle to or below the existing 850 kB warning ceiling without raising the budget, removing accepted behavior or moving unsafe code into eager paths.
- **Platform implications:** Smaller startup payload benefits web and future packaged WebView startup; no native performance claim follows from bundle size alone.
- **Implementation notes:** The measured eager graph included Angular Material at 259.41 kB, Angular framework/forms/platform at 191.29 kB, application shell code at 165.21 kB, CDK at 85.61 kB, domain code at 46.53 kB and `ts-fsrs` at 21.14 kB. The root Settings shell eagerly imported `MatSlideToggle` solely for Appearance controls. Those controls now live in a deferred standalone `AppearanceSettingsComponent`; Study remains eager because it is part of the primary workflow. Existing Focus, Exchange, ExcelJS, JSZip, SQLite/WASM and Anki parsing boundaries remain lazy.
- **Verification / evidence:** Closure baseline: **847.67 kB raw / 198.69 kB transfer**. Native interaction later measured **849.53 kB raw / 201.26 kB transfer**. The final adaptive navigation/Study build measures **860.70 kB raw / 204.11 kB estimated transfer**, 10.70 kB above the unchanged ceiling. Its shared shell CSS and accessible interaction behavior are required at startup and were not hidden behind a broken deferred load. Capacitor/Haptics/Back and heavy exchange tooling remain lazy. Recover the measured headroom without raising the limit or removing accepted behavior.
- **Relevant commits:** `065a391`, `711cfc5`, `f80042e`, current acceptance commit.

### HR-TEST-01 — Strengthen queue-order and audio-action assertions
- **Product area / milestone / priority:** Verification / Study configuration / P2
- **Status:** DONE
- **Source:** Independent acceptance review, 3 October 2026
- **Dependencies:** Existing deterministic queue fixtures and bundled-audio browser fixture
- **Requirement / acceptance:** Add expected-order fixtures that distinguish random and retrievability policies, and a focused browser assertion that accepted rating pauses active card audio after persistence succeeds. Preserve current general audio/lifecycle and queue regression coverage.
- **Platform implications:** Run in Chromium and Playwright WebKit; native audio interruption remains separate device evidence.
- **Verification / evidence:** `study-settings.test.ts` now asserts exact random and retrievability order, and the genuine Anki MP3 Chromium/WebKit journey proves accepted persistence dispatches `pause` before advancing. Full unit and both desktop browser suites pass.

## Completed milestone — Custom Study and Focused Practice

Source: Will's 3 October 2026 milestone. Anki's current filtered-deck, studying and searching documentation is a capability reference; HoloRecall uses non-destructive Focused Sessions over original cards.

### HR-FOCUS-01 — Explicit scheduled and practice modes
- **Product area / milestone / priority:** Study / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Persisted Study session and immutable scheduled reviews
- **Requirement / acceptance:** Persist mode explicitly. Scheduled mode alone may update FSRS, due dates, daily usage, statistics and rewards. Practice may record separate activity but never scheduling/reward state.
- **Platform implications:** Platform-neutral domain contract and interruption-safe persistence.
- **Verification / evidence:** Schema 6 persists explicit mode plus separate immutable Practice events. Domain and browser tests prove Practice leaves FSRS, due dates, allowance, reviews, controls and rewards unchanged; Scheduled Focus creates a real FSRS transition.

### HR-FOCUS-02 — Focus entry and quick actions
- **Product area / milestone / priority:** Decks / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Today overrides; library index
- **Requirement / acceptance:** Deck Focus entry with more-new, more-review, missed, due/overdue, preview-new, review-ahead and tag/state actions. Scheduled choices remain genuinely eligible.
- **Platform implications:** Material 3, keyboard/touch, compact and 200% reflow.
- **Verification / evidence:** Deck/Dashboard Focus entry plus today-only new/review actions, Today/7-day mistakes, due/overdue, preview-new, 1/3/7-day ahead and tag/state builder pass Chromium/WebKit and phone reflow checks.

### HR-FOCUS-03 — Focused Session builder
- **Product area / milestone / priority:** Study / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Existing indexed filters and scheduler eligibility
- **Requirement / acceptance:** Combine branch, tags, state, due/missed/attention/added criteria, bounded card count, mode and evidence-backed order without a second query language.
- **Platform implications:** Large result sets remain bounded and platform-neutral.
- **Verification / evidence:** Versioned criteria reuse the library index and support branch, query, tags, schedule states, missed/due/overdue/added windows, suspension opt-in, limit, mode and backed orderings. The final 10,000-card Node/Vitest fixture returned its bounded 40-card slice in 1,640.5 ms within the 3 s local budget.

### HR-FOCUS-04 — Saved Focus presets
- **Product area / milestone / priority:** Study / Focused Practice / P1
- **Status:** DONE
- **Dependencies:** Focus criteria schema
- **Requirement / acceptance:** Stable-ID save, rename, duplicate, delete and run; presets store criteria, not duplicated card IDs, and remain distinct from scheduler Study presets.
- **Platform implications:** Versioned local persistence and backup.
- **Verification / evidence:** Stable-ID schema-6 presets support save, edit/rename, duplicate, delete and run. Each run reevaluates criteria; random runs receive a persisted per-session seed. Full backups validate preset/session references.

### HR-FOCUS-05 — Study from search and selection
- **Product area / milestone / priority:** Collection / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Library query/selection state
- **Requirement / acceptance:** Practice selected/current-filter cards and Study eligible cards without duplicating search logic or rendering the whole result set.
- **Platform implications:** Keyboard multi-select and touch-friendly actions.
- **Verification / evidence:** Collection current results and selected IDs expose Practice and Study eligible actions through the same Focus request; scheduled selection is intersected with the genuine due queue.

### HR-FOCUS-06 — Shared Practice player
- **Product area / milestone / priority:** Study / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** HR-FOCUS-01
- **Requirement / acceptance:** Reuse the accepted card player, reveal, five-confidence controls, feedback, audio and responsive layout with a subtle persisted Practice label. Ratings never invoke FSRS.
- **Platform implications:** Preserve Study geometry, animation ownership and WebKit cleanup.
- **Verification / evidence:** The shared Study player branches only at the persisted writer. Two consecutive motion-enabled Practice ratings remain visibly settled in Chromium/WebKit; audio, five controls, feedback and phone layouts are reused.

### HR-FOCUS-07 — Practice results
- **Product area / milestone / priority:** Results / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Separate practice events/session state
- **Requirement / acceptance:** Show real practice count, unique cards, active time, confidence, recall timing and low-confidence cards without intervals, due movement or cosmetics.
- **Platform implications:** Reuse accessible Results motion with reduced-motion settlement.
- **Verification / evidence:** Results show event count, unique cards, active time, average and 1–5 confidence distribution, timed recall sample and low-confidence cards, with repeat/view/return actions and no cosmetic or interval claims.

### HR-FOCUS-08 — Weak-card contextual practice
- **Product area / milestone / priority:** Progress / Focused Practice / P1
- **Status:** DONE
- **Dependencies:** Needs-attention and leech filters
- **Requirement / acceptance:** Contextual Practice actions for needs attention, recent confidence 1, leeches and low-confidence results reuse the shared Focus builder.
- **Platform implications:** No bespoke or duplicated queue implementations.
- **Verification / evidence:** Progress Needs Attention emits the shared Practice selection; Focus exposes Today/recent Confidence 1 plus attention/leech states; Collection can practise the active filtered result without bespoke queues.

### HR-FOCUS-09 — Focus lifecycle and recovery
- **Product area / milestone / priority:** Persistence / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** Persisted session schema and lifecycle port
- **Requirement / acceptance:** Recover mode, focus criteria, ordered IDs, position and outcomes without duplicate reviews/rewards/practice events; safely skip removed or newly ineligible cards.
- **Platform implications:** Background/resume, offline local state and future Capacitor lifecycle.
- **Verification / evidence:** Mode, criteria, seeded order, queue position and accepted outcomes persist. Reload resumes Practice without converting it; normal Study cannot resume a Practice queue. Reconciliation safely prunes missing, archived, ancestor-suspended and newly buried cards.

### HR-FOCUS-10 — Scheduler safety boundary
- **Product area / milestone / priority:** Scheduling / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** HR-FOCUS-01
- **Requirement / acceptance:** Scheduled review recording requires scheduled context; Practice has a separate event operation and cannot mutate FSRS, due dates, allowance, leeches or rewards. Scheduled Undo remains unchanged.
- **Platform implications:** Pure domain/type separation shared by every platform.
- **Verification / evidence:** `applyScheduledReview` now requires a revealed active Scheduled session. `recordPracticeRating` owns a distinct operation/event namespace and rejects cross-namespace IDs. Independent review found and the lead fixed the prior no-session bypass and Study-resumes-Practice defect; 128/128 domain tests pass.

### HR-PLAN-03 — Custom Study capability matrix
- **Product area / milestone / priority:** Planning / Focused Practice / P0
- **Status:** DONE
- **Dependencies:** HR-FOCUS-01–10 evidence
- **Requirement / acceptance:** Accurately classify limit increases, forgotten/ahead/new/state/tag/arbitrary selection, limits, ordering, saved selection, rescheduling and home-deck identity. Document Focused Session versus literal filtered deck.
- **Platform implications:** Distinguish browser evidence from native verification.
- **Verification / evidence:** `docs/product-brief.md` records the exact comparison and the non-destructive Focused Session architecture; review-ahead rescheduling remains intentionally not implemented.

## Active milestone — Review Workflow Completion and Study Settings Closure

Source: Will's 3 October 2026 closure milestone. Current Anki deck-options documentation is a capability reference; HoloRecall retains its own five-confidence reviewer and platform boundaries.

### HR-HIST-04 — Administrative event undo
- **Product area / milestone / priority:** Review management / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** Administrative event log, atomic store concurrency and HR-HIST-02
- **Requirement / acceptance:** Exactly and atomically reverse valid set-due, bury/unbury, suspend/unsuspend, reset/forget and reposition actions without creating reviews, changing rewards or applying stale snapshots. Bulk actions undo as one logical action; invalid/superseded actions expose why they cannot be undone. Persist audit history and keep review Undo separate.
- **Platform implications:** Platform-neutral event contract, atomic IndexedDB persistence, compact keyboard/touch History affordance and future native read-back.
- **Implementation notes:** New administrative changes carry a stable bulk `groupId` and exact before/after projections for the scheduling state, card controls and suspension flag. Undo validates every group member against current persisted state before one atomic commit, advances scheduling versions rather than rewinding them, and appends immutable `undo` records referencing the original events. Legacy schema-6 records remain readable but are deliberately non-undoable because they lack safe snapshots. No-op reset/bury/suspend operations create no misleading history. Direct Collection suspension now uses the same management path.
- **Verification / evidence:** Store/domain coverage exercises set-due, reset, bury/unbury, suspend/unsuspend, reposition, atomic bulk undo, duplicate undo, stale state after another control change or review, legacy records, no-op New reset, review/reward invariance and backup validation (16/16 focused tests). Chromium and WebKit both pass the History reset → undo → reload journey (2/2); the UI shows Undo only for a currently valid group and marks its original record Undone. Production build passes.
- **Relevant commits:** `065a391`, `711cfc5`.

### HR-STUDY-09 — Safe Auto Advance
- **Product area / milestone / priority:** Reviewer / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** Shared Study player, lifecycle, audio and finite confidence/deal choreography
- **Requirement / acceptance:** Optional default-off auto-reveal timing with explicit rating always required; configurable question/answer presentation controls, immediate pause/resume, no timer burst after backgrounding, no audio/animation truncation and identical Scheduled/Practice safety. Auto Advance never invents a rating.
- **Platform implications:** Shared web/iOS/macOS lifecycle boundary, keyboard/touch controls, reduced motion and accessible status without noisy announcements.
- **Implementation notes:** Presets now hold default-off bounded question and minimum-answer timing. The one shared Study player owns a generation/session/card-bound auto-reveal timer; lifecycle or audio interruption preserves a bounded remainder and persists a paused state, while recovery requires deliberate Resume. Auto-reveal never rates. A real rating persists first, then the retained card completes confidence feedback, any remaining configured answer dwell and the existing deal. Recall/active time is captured before presentation delays. The outgoing card now retains its own preset while visible.
- **Verification / evidence:** The complete desktop matrix passes **136/136** and WebKit phone profiles **24/24**. Dedicated checks cover pause/reload/deliberate resume, auto-reveal with zero reviews, explicit rating, owned answer dwell, next-card visibility, lifecycle interruption, valid playing audio, rejected playback recovery and Practice without FSRS/reward mutation. The full unit/domain suite passes **132/132**. A startup race was fixed by declaring pending autoplay before its asynchronous `play()` call; rejected playback now always releases that state.
- **Relevant commit:** `711cfc5`.

### HR-STUDY-10 — Easy Days evaluation
- **Product area / milestone / priority:** Scheduling / Workflow closure / P1
- **Status:** PLANNED
- **Dependencies:** `ts-fsrs` 5.4.2 scheduling API and future-schedule integrity
- **Requirement / acceptance:** Determine whether Normal/Reduced/Minimum weekday workload treatment has a supported scheduler integration. Implement only if future schedules can be adjusted without hiding due work, rewriting existing due dates or corrupting FSRS interval state; otherwise document the exact missing primitive and retain an honest PARTIAL/PLANNED state.
- **Platform implications:** Pure scheduler decision shared across platforms; deterministic learner-time-zone tests if implemented.
- **Verification / evidence:** Current Anki documents Easy Days as FSRS-aware future workload redistribution. Installed `ts-fsrs` **5.4.2** type/runtime inspection exposes interval fuzzing and review-history rescheduling but no weekday workload-distribution input. Post-processing its returned due date would create a second unsanctioned scheduler policy, and hiding due work would violate the requirement. Exact dependency: a supported weekday distribution integration that returns internally valid scheduling state and can be tested deterministically. No setting or fake due-date shift was added.
- **Relevant commit:** `711cfc5` (evaluation and recorded decision).

### HR-STUDY-11 — Reviewer workflow consistency
- **Product area / milestone / priority:** Reviewer / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** Scheduled, Focus and Practice session modes
- **Requirement / acceptance:** Normal/parent/child/Scheduled Focus/Practice/saved Focus use the authoritative player and consistent reveal, confidence, help, keyboard, audio, timers, Auto Advance, Undo, progress, motion, end and Results behavior. Remove divergence through shared seams rather than copied CSS.
- **Platform implications:** Desktop/touch/WebKit, lifecycle settlement, stable geometry and reduced-motion evidence.
- **Implementation notes:** Normal/parent/child/Scheduled Focus/Practice/saved Focus already converge on the root shared player. This pass adds Auto Advance only there, fixes retained outgoing cards to resolve the displayed card's preset/timing/audio policy, and keeps reveal, rating, persistence, motion and Results on the established paths.
- **Verification / evidence:** Normal Scheduled, parent/child, Scheduled Focus, Practice and saved Focus remain on the single root player. The complete Chromium/WebKit matrix passes **136/136**, including consecutive-card visibility, animation ownership, audio, Results, rewards, history and Focus boundaries; WebKit phone profiles pass **24/24**.
- **Relevant commit:** `711cfc5`.

### HR-STUDY-12 — Settings discoverability
- **Product area / milestone / priority:** Settings / Workflow closure / P1
- **Status:** DONE
- **Dependencies:** Existing Study Settings component and deck preset assignment
- **Requirement / acceptance:** Natural Deck details, Study and main Settings entry points all reach one underlying settings surface. Deck context clearly identifies assigned preset and override state; advanced controls remain progressively disclosed.
- **Platform implications:** Material 3 alignment, touch targets, 200% reflow, focus and safe-area readiness.
- **Implementation notes:** Deck and subdeck actions plus the active Study session open the same `StudySettingsComponent`; a deck-aware context panel shows the resolved preset, inheritance and direct workload overrides. The main Settings navigation opens the same surface without stale deck context. Opening it from Study pauses Auto Advance and preserves the session.
- **Verification / evidence:** Deck → Settings, Study → Settings and global Settings context clearing pass both desktop engines. The complete WebKit compact/large/landscape gate passes **24/24**, including Study Settings at 200% text and touch-sized layouts.
- **Relevant commit:** `711cfc5`.

### HR-PLAN-04 — Study capability closure matrix
- **Product area / milestone / priority:** Planning / Workflow closure / P0
- **Status:** DONE
- **Dependencies:** HR-PERF-01, HR-HIST-04 and HR-STUDY-09–12 evidence
- **Requirement / acceptance:** Reconcile presets, limits, steps, order, siblings, leeches, audio/timers, Auto Advance, Easy Days, retention/interval, optimization, history/admin undo, Focus/Practice, import and AnkiWeb status. Keep optimizer honest and **AnkiWeb Sync — NOT PLANNED**.
- **Platform implications:** Distinguish implementation from Chromium/WebKit and native evidence.
- **Verification / evidence:** `docs/product-brief.md` now records Auto Advance DONE, Easy Days evaluated/PLANNED with the missing scheduler primitive, administrative management/undo DONE, the existing preset/limits/steps/order/audio/timer/FSRS/history/Focus/Practice/import boundaries, optimizer PARTIAL and **AnkiWeb Sync — NOT PLANNED**. Intentional HoloRecall differences remain explicit.
- **Relevant commit:** `711cfc5`.

## Active milestone — Confirmed mobile platforms and Android baseline

Source: Will's 4 October 2026 confirmed Web/iOS/iPadOS/Android/Apple-silicon Mac direction. Intel Mac and AnkiWeb Sync are not planned. Shared contracts remain lead-owned; store provisioning, signing, publication, cloud sync and payments are outside scope.

### HR-GOV-04 — Authoritative multi-platform product contract
- **Product area / milestone / priority:** Governance / Mobile platform direction / P0
- **Status:** DONE
- **Dependencies:** Existing charter and Apple feasibility decision
- **Requirement:** Record the confirmed targets, Anki/Duolingo/collectible reference model, OS support policy, Intel Mac and AnkiWeb exclusions in the existing charter.
- **Acceptance:** No authoritative record implies Android is out of scope; minimums remain evidence-based; references describe inspiration without copying product identity.
- **Platform implications:** Web, iOS/iPadOS, Android and Apple-silicon Mac become the maintained target set.
- **Implementation notes:** Update the existing charter only.
- **Verification / evidence:** Charter v1.1 names all four targets, OS policy, reference models and exclusions; architecture/readiness records agree.
- **Relevant commits:** `fa33a27`, `f80042e`.

### HR-GOV-05 — Continuous portability rule
- **Product area / milestone / priority:** Governance / Mobile platform direction / P0
- **Status:** DONE
- **Dependencies:** HR-GOV-04; canonical tracker cadence
- **Requirement:** Make proportional four-target portability review and narrow adapter use a standing repository instruction.
- **Acceptance:** `AGENTS.md` names every target and persistence/files/lifecycle/offline/input/safe areas/haptics/motion/accessibility/share/performance/permission considerations without claiming simultaneous device verification.
- **Platform implications:** Prevent browser/native leakage into domain contracts.
- **Verification / evidence:** Root `AGENTS.md` has the proportional four-target review rule and links the canonical readiness record.
- **Relevant commits:** `fa33a27`.

### HR-ANDROID-01 — Android environment audit
- **Product area / milestone / priority:** Platform / Android feasibility / P0
- **Status:** DONE
- **Dependencies:** Installed Mac Android Studio/SDK/JDK/emulator/adb state; official Capacitor 8 requirements
- **Requirement:** Record exact Android tools, platforms/images, selected Java and blockers without installing Android Studio or large SDK packages.
- **Acceptance:** Every runtime/build claim identifies actual tooling; missing requirements are explicit blockers.
- **Platform implications:** Determines Gradle-build/emulator evidence, never physical-device evidence.
- **Verification / evidence:** macOS 26.5.1 arm64 supports virtualization. Android Studio, SDK/tools/images, selected Java and Gradle are absent. SideQuest adb 35.0.1 is present but is not a development SDK and reports no device. Evidence: `.runtime/evidence/hr-mobile-platforms-20261004/android-environment.log`.
- **Relevant commits:** `f80042e`.

### HR-ANDROID-02 — Capacitor Android platform
- **Product area / milestone / priority:** Platform / Android feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-ANDROID-01; pinned Capacitor 8 family
- **Requirement:** Generate/sync the same production Angular application into an Android project, add repeatable build/sync/open/run scripts and keep native config free of a development URL.
- **Acceptance:** Core/CLI/iOS/Android/plugin versions are compatible; static config passes; Gradle/emulator evidence runs only where tooling permits.
- **Platform implications:** No second Angular application or web-only domain fork.
- **Verification / evidence:** `@capacitor/android` 8.5.2 is pinned; the generated project syncs the same production output with App/Filesystem/Haptics/Share and no `server.url`. Scripts build/sync/open/run the project. `./gradlew assembleDebug` is blocked by the absent JDK/SDK, so build/emulator claims remain unverified.
- **Relevant commits:** `f80042e`.

### HR-ANDROID-03 — Android compatibility baseline
- **Product area / milestone / priority:** Platform / Android feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-ANDROID-01/02 and official Capacitor/plugin requirements
- **Requirement:** Retain minSdk 24 unless an evidenced dependency requires higher; use Capacitor 8's supported compile/target SDK and document old/current/latest representative emulator coverage.
- **Acceptance:** Generated Gradle values and plugin minimums are recorded; testing on a newer image never silently raises the product minimum.
- **Platform implications:** Emulator and physical-device evidence remain separate.
- **Verification / evidence:** Generated values are minSdk 24, compile/target 36, AGP 8.13.0, Gradle 8.14.3 and Java 21. API 24/middle/API 36 emulator coverage is blocked by the missing toolchain/images; no minimum was raised.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-01 — Shared semantic haptic feedback
- **Product area / milestone / priority:** Interaction / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** Official Capacitor Haptics 8; existing owned Study/results presentation lifecycle
- **Requirement:** Add one semantic feedback port for selection, reveal, accepted rating, deal, session completion, genuine unlock, warning and real error. Native uses official Haptics; web is a safe no-op without desktop vibration.
- **Acceptance:** Components do not import Haptics directly; calls never delay saves/navigation; failures are swallowed safely; honest low ratings never use error feedback.
- **Platform implications:** iOS/Android invoke the same semantics; Mac/web no-op unless future evidence supports otherwise.
- **Verification / evidence:** `InteractionFeedback` and one official Capacitor driver map semantic cues to selection/light impact/success/warning/error. Web is a strict no-op; the adapter loads lazily, swallows and disables after failure. Unit mapping/suppression passes; native invocation and tactile quality remain pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-02 — Haptics setting and accessibility
- **Product area / milestone / priority:** Settings / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** HR-MOBILE-01; versioned Preferences migration
- **Requirement:** Persist an On/Off haptics preference, default on for supported native mobile platforms and fully suppress decorative tactile calls when off.
- **Acceptance:** Setting is independent from reduced motion, errors remain visually understandable, unsupported hardware is not retried repeatedly and web avoids irrelevant prominence.
- **Platform implications:** Compact touch/reflow, reload and platform-default behavior require separate evidence.
- **Verification / evidence:** Backward-compatible persisted `haptics` preference defaults on, is shown only when a native platform is detected, remains independent of reduced motion and suppresses every decorative call. Migration and settings persistence are unit/browser gated; native control and device behavior remain pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-03 — Coordinated Study feedback
- **Product area / milestone / priority:** Study / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** HR-MOBILE-01/02 and owned flip/confidence/deal/results lifecycle
- **Requirement:** Coordinate reveal, accepted confidence, deal, session completion and real unlock haptics with existing visual/audio milestones without independent drifting timers.
- **Acceptance:** Persistence and scheduling remain first; native-call failure cannot strand a transition; Practice/FSRS/reward boundaries remain unchanged.
- **Platform implications:** Web remains unchanged; native calls are lifecycle-aware and require device tuning later.
- **Verification / evidence:** Cues occur after successful reveal/review/practice persistence, after incoming-card settle, at live session completion and when a genuine persisted unlock card is revealed. Results replay/reopen/skip never rearms reward haptics; background lifecycle suppresses calls. Complete 160/160 browser motion regression passes; native invocation remains pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-04 — Mobile Session Complete presentation
- **Product area / milestone / priority:** Results / Mobile quality / P1
- **Status:** VERIFY
- **Dependencies:** Existing approved Results/Skip/Replay/unlock choreography; HR-MOBILE-03
- **Requirement:** Inspect mobile results, correct evidenced clarity/action issues and add native haptic milestones while preserving real metrics and Practice separation.
- **Acceptance:** Concise mobile layout, progressive reveal, accurate bars/unlocks, accessible Continue, reduced motion and Skip remain intact; no fabricated progress.
- **Platform implications:** Phone/tablet portrait/landscape and native haptic timing need distinct evidence.
- **Verification / evidence:** Existing progressive results/unlock choreography remains authoritative; action rows wrap at enlarged compact widths. Practice remains reward-free. Compact/large/landscape and reduced-motion browser gates pass; native haptic timing remains pending.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-05 — Native application and delivery contract
- **Product area / milestone / priority:** Release architecture / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** Confirmed platform targets and Capacitor direction
- **Requirement:** Document normal Xcode/TestFlight/App Store, Gradle/AAB/Play testing, Apple-silicon iOS-app-on-Mac delivery and shared Angular/native-service architecture. Intel Mac is not planned.
- **Acceptance:** Native-shell architecture is not described as a lesser website; store/signing resources remain uncreated.
- **Platform implications:** Version/build metadata and platform services remain narrow adapters.
- **Verification / evidence:** Architecture/readiness define Xcode/TestFlight/App Store, Gradle/AAB/Play testing, Apple-silicon iOS-app-on-Mac, shared Angular/native services and explicit non-authorisation of stores/signing.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-06 — App chrome and platform integration audit
- **Product area / milestone / priority:** Native shell / Mobile quality / P0
- **Status:** VERIFY
- **Dependencies:** iOS and Android generated projects; official plugins
- **Requirement:** Audit splash/icon infrastructure, system bars, safe areas, edge-to-edge, keyboard, Android Back, orientation, lifecycle, share/picker and offline startup; fix safe in-scope configuration gaps.
- **Acceptance:** No final-branding claim for generated placeholders; Back preserves expected navigation; permissions remain minimal.
- **Platform implications:** Runtime-specific verification remains explicit.
- **Verification / evidence:** Generated icon/splash assets are explicitly placeholders; Android manifest uses expected orientation/keyboard/screen config, normal INTERNET, plugin-provided VIBRATE and FileProvider with no dangerous runtime permission. A lazy Android Back adapter applies shell navigation and cleans up. System-bar/edge-to-edge/keyboard/share/picker/offline runtime remain blocked.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-07 — Retrospective portability audit
- **Product area / milestone / priority:** Architecture / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** Existing major feature set and platform boundaries
- **Requirement:** Classify each requested major surface as portable, adapter-backed, native work/verification required or intentionally platform-specific; create debt only from evidence and repair small leaks safely.
- **Acceptance:** Every listed feature appears in the maintained matrix; no functioning code is rewritten for symmetry alone.
- **Platform implications:** Four-target evidence distinctions remain explicit.
- **Verification / evidence:** `docs/ios-readiness.md` classifies every requested surface. Safe fixes cover late native-listener cleanup and Android Back; evidenced native picker, bounded export/media, native storage/audio and confirmation-surface debt remains visible.
- **Relevant commits:** `f80042e`.

### HR-MOBILE-08 — Web remains first class
- **Product area / milestone / priority:** Architecture / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** Shared Angular/domain architecture and lazy native adapters
- **Requirement:** Maintain one product/domain codebase, web behavior and the 850 kB initial-bundle ceiling while adding native platforms.
- **Acceptance:** Native plugins stay out of eager web startup where practical; web suites/build remain green; business logic has no platform forks.
- **Platform implications:** Apple-silicon Mac normally follows iOS/iPad implementation.
- **Verification / evidence:** Native services/plugins load lazily and domain rules remain shared. Unit/domain **145/145**, complete Chromium/WebKit/phone matrix **160/160**, and post-split settings regression **31/31** pass. Production build is **849.53 kB raw / 201.26 kB transfer**, below the unchanged ceiling.
- **Relevant commits:** `f80042e`, `3e37ac2`.

### HR-MOBILE-09 — Xcode blocker remains explicit
- **Product area / milestone / priority:** Evidence / Mobile quality / P0
- **Status:** BLOCKED
- **Dependencies:** Full Xcode 26+ installation by Will
- **Requirement:** Preserve blocked/unverified status for Simulator, WKWebView, Designed-for-iPad Mac, native persistence/files/haptics/accessibility until the actual toolchain exists.
- **Acceptance:** Exact installation requirement and evidence boundary remain visible while independent Web/Android work continues.
- **Platform implications:** No browser or mock substitutes.
- **Verification / evidence:** Command Line Tools only; accepted baseline logs retained.
- **Relevant commits:** `f6e4ffd`, `ada5a80`.

### HR-MOBILE-10 — Release readiness structure
- **Product area / milestone / priority:** Release architecture / Mobile quality / P1
- **Status:** DONE
- **Dependencies:** Shared product version and generated native projects
- **Requirement:** Define product version, iOS build number, Android versionCode and web release version plus development/local-native/beta/production environments without credentials or store resources.
- **Acceptance:** One authoritative product version can drive platform metadata; secrets remain outside Angular/native source.
- **Platform implications:** Signing, provisioning and store configuration remain future authorised work.
- **Verification / evidence:** `package.json` version 0.1.0 is authoritative; `native:version` writes iOS `MARKETING_VERSION` and Android `versionName`, while build number/versionCode remain independent integer inputs. Environments and non-secret/store boundaries are documented.
- **Relevant commits:** `f80042e`, `3e37ac2`.

### HR-PLAN-06 — Four-target platform matrix
- **Product area / milestone / priority:** Planning / Mobile quality / P0
- **Status:** DONE
- **Dependencies:** HR-GOV-04/05, HR-ANDROID-01–03 and HR-MOBILE-01–10
- **Requirement:** Evolve the existing readiness matrix for Web, iOS/iPadOS, Android and Apple-silicon Mac across startup, persistence, Study, Focus, haptics, audio/effects/results, import/export/backup, offline, lifecycle, accessibility, layouts and distribution.
- **Acceptance:** Evidence uses IMPLEMENTED/BROWSER VERIFIED/EMULATOR VERIFIED/PHYSICAL DEVICE VERIFIED/BLOCKED/NOT APPLICABLE accurately; no competing matrix is created.
- **Platform implications:** Engine, emulator, Simulator, Mac and physical-device evidence remain distinct.
- **Verification / evidence:** The existing readiness document now contains one four-target compatibility/evidence matrix plus detailed historical browser/Apple evidence, with runtime and physical-device gaps kept distinct.
- **Relevant commits:** `f80042e`.

## Apple native feasibility — preserved accepted baseline

Source: Will's 4 October 2026 iOS-first and macOS-delivery-decision milestone. Native work remains local; publication, signing/provisioning, payments and cloud sync are outside scope.

### HR-NATIVE-01 — Apple development environment audit
- **Product area / milestone / priority:** Platform / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** Installed macOS/Xcode/Simulator and current official Capacitor requirements
- **Requirement / acceptance:** Record the actual Mac architecture, Node/npm, selected developer tools, Xcode/Simulator runtimes and existing Capacitor/native state before dependency or project generation. Missing mandatory tools remain explicit blockers rather than simulated evidence.
- **Platform implications:** Determines which iOS/macOS claims can be made; no automatic Xcode installation or global toolchain upgrade.
- **Verification / evidence:** macOS 26.5.1 (`arm64`, M1 Pro), Node 24.3.0 and npm 11.4.2 are recorded. Full Xcode 26.6 (17F113) is active at `/Applications/Xcode.app/Contents/Developer`, first-launch checks pass, and iOS 26.5 (23F77) provides modern iPhone and iPad Simulator devices. Exact discovery output is under `.runtime/evidence/hr-apple-runtime-20261004/`.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-02 — Capacitor iOS baseline
- **Product area / milestone / priority:** Platform / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** HR-NATIVE-01; compatible pinned Capacitor core/CLI/iOS versions
- **Requirement / acceptance:** Add the smallest supported Capacitor configuration to the existing Angular build, generate one local iOS shell and automate web build/sync. Native build, Simulator launch and real HoloRecall interaction require installed Xcode evidence.
- **Platform implications:** Packaged WKWebView assets must use the production output without a development-server URL; generated artifacts remain reviewable and bounded.
- **Verification / evidence:** Xcode 26.6 built scheme `App` for the iOS 26.5 iPhone 17 Pro Simulator from the synced 849.53 kB production Angular output; install and command-line launch of `com.holorecall.app` succeeded. Logs and launch screenshot are under `.runtime/evidence/hr-apple-runtime-20261004/`. No signing team or development server was used.
- **Verification / evidence:** Stable Capacitor 8.5.2 plus official App 8.1.2, Filesystem 8.1.4, Haptics 8.0.2 and Share 8.0.3 are pinned. The real Angular output is configured as `dist/holorecall/browser`; SPM resolution, Simulator compile, install and command-line launch all pass with no `server.url`.
- **Relevant commits:** `f6e4ffd`, `ca23e20`, `8782f2f`.

### HR-NATIVE-03 — Native smoke journey
- **Product area / milestone / priority:** Study / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-NATIVE-02 and an available Simulator runtime
- **Requirement / acceptance:** Exercise the actual WKWebView launch → Decks → Study/reveal/rate/next/results → Collection/Progress/History/Settings path, including former disappearing-card regression, themes, orientation, safe areas, keyboard, motion and valid local audio.
- **Platform implications:** Simulator evidence remains distinct from Playwright WebKit and physical-device verification.
- **Verification / evidence:** Final iPhone 17 Pro / iOS 26.5 UI suite passed **4/4** in 89.067 s: three consecutive reveal/rate/deal transitions remain visible, partial results and Collection/Progress/Settings navigate, System/Dark persists across relaunch, landscape and native file surfaces work, and background/resume retains the active card. The same three-card smoke passed on iPad Pro 11-inch (M5) in 55.351 s. Xcode result bundles, logs and screenshots are under `.runtime/evidence/hr-apple-runtime-20261004/`. Native bundled-audio playback, Auto Advance and Practice remain unexecuted, so this item stays VERIFY.
- **Relevant commits:** `f6e4ffd`, `ca23e20`, `8782f2f`.

### HR-NATIVE-04 — Native persistence architecture spike
- **Product area / milestone / priority:** Data / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** Existing `StudyPersistence` and media boundaries; candidate maintenance/security review
- **Requirement / acceptance:** Recommend transactional native structured storage and durable media storage. If a sufficiently supported candidate exists, prove isolated fixture create/write/relaunch/read/update/rollback/version behavior without changing production persistence or real data.
- **Platform implications:** Domain and scheduler remain storage-agnostic; Preferences/UserDefaults cannot hold the learning database.
- **Verification / evidence:** `StudyPersistence` remains injected while the production provider stays IndexedDB. A DEBUG-only, launch-argument-gated system SQLite probe uses only isolated Application Support fixture data and proves schema 1 create/write, intentional transaction rollback, terminate/relaunch read, update, schema 1→2 migration and idempotent schema-2 reopen. Logs show one durable card, revision 2 and zero rollback rows. No community SQLite package or production switch was made; the eventual Capacitor bridge/provider and native media store remain migration work.
- **Relevant commits:** `f6e4ffd`, `8782f2f`.

### HR-NATIVE-05 — Data migration design
- **Product area / milestone / priority:** Data safety / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** HR-NATIVE-04; validated full-backup contract
- **Requirement / acceptance:** Specify and fixture-test an idempotent backup-first IndexedDB → native staged migration with count/hash/invariant verification, interruption recovery, rollback, deduplication and retained recovery data. Do not touch genuine learner storage.
- **Platform implications:** Protect every content, scheduling, reward, source-identity, media and administrative-history field across versions.
- **Verification / evidence:** A typed, production-unused migration staging contract validates the source, retains a hashed recovery backup, stages by deterministic fingerprint, reads back every State collection and media hash/count, activates only after verification, treats a completed fingerprint as idempotent and discards staging after injected interruption at backup/stage/verify/mark/activate. Fixture tests never open learner storage.
- **Relevant commits:** `f6e4ffd`, `8782f2f`.

### HR-NATIVE-06 — Native lifecycle adapter
- **Product area / milestone / priority:** Runtime / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** Official Capacitor App plugin and existing `AppLifecycle`
- **Requirement / acceptance:** Feed native active/background events into the shared lifecycle contract while retaining browser signals. Verify timing, animations, Auto Advance, audio, accepted-review durability, deduplication and resume behavior where native execution is available.
- **Platform implications:** Components remain free of direct Capacitor calls; listeners are removed on destruction.
- **Verification / evidence:** Official Capacitor App state, pause and resume events feed the existing `AppLifecycle` through a dynamically loaded adapter; listener handles are removed and resume waits for queued commits. iPhone Simulator UI automation entered Study, backgrounded with the Home action, waited three seconds, reactivated and recovered the same visible unrevealed card. Audio, Auto Advance and a background during an accepted-review transition remain pending native acceptance.
- **Relevant commits:** `f6e4ffd`, `8782f2f`.

### HR-NATIVE-07 — Native file import/export feasibility
- **Product area / milestone / priority:** Portability / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** Existing `FileDelivery`; official Files/share APIs and picker-gap evaluation
- **Requirement / acceptance:** Prove or precisely design Apple Files/share workflows for APKG, portable ZIP, XLSX and full backup import/export. Generated exports must become user-accessible files; cancellation and invalid input must remain safe.
- **Platform implications:** Parsing/generation stays platform-neutral and no real collection is overwritten.
- **Verification / evidence:** iPhone Simulator generated a real XLSX, presented it through the native Share sheet with **Save to Files**, dismissed safely, opened the native document picker and cancelled. An interrupted Share run exposed a stale-cache case; the adapter now removes only its own `holorecall-exports` cache directory before the next export, and the rerun leaves no cached export. Actual fixture selection/import and reopen/hash checks for every format remain pending.
- **Relevant commits:** `f6e4ffd`, `8782f2f`.

### HR-NATIVE-08 — Native media feasibility
- **Product area / milestone / priority:** Media / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-NATIVE-04; media resolver boundary
- **Requirement / acceptance:** Exercise or specify stable native references for images, WAV/MP3, backgrounds, frames and textures across reload/relaunch and Study transitions. Device paths cannot leak into portable card data.
- **Platform implications:** WKWebView display URLs are adapter-owned; Simulator audio is not physical speaker/interruption evidence.
- **Verification / evidence:** Packaged illustrations, card backgrounds, rarity frames and texture/effect layers render through consecutive iPhone/iPad Study transitions and Collection navigation, including relaunch. Stable `asset:` IDs remain portable and no Simulator path enters card data. Imported MP3/WAV playback and a filesystem-backed native media provider remain pending, so this item stays VERIFY.
- **Relevant commits:** `f6e4ffd`, `8782f2f`; runtime provider pending.

### HR-NATIVE-09 — Packaged offline startup
- **Product area / milestone / priority:** Offline / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** HR-NATIVE-02/04 and Simulator availability
- **Requirement / acceptance:** Distinguish loaded-tab web offline from a terminated packaged app relaunching without network, studying local content, persisting a review and surviving another relaunch.
- **Platform implications:** No cloud dependency or service-worker substitution.
- **Verification / evidence:** With port 4200 stopped and no `server.url` in the generated Capacitor config, the installed app terminated/relaunched from packaged assets and restored its IndexedDB fixture (7 ready cards after three accepted reviews, down from 10). `.runtime/evidence/hr-apple-runtime-20261004/packaged-no-localhost-relaunch.log` and `iphone-no-localhost-relaunch.png` record the proof. Network-disabled launch and production native storage remain outstanding.
- **Verification / evidence:** Synced production assets contain no development-server URL. With port 4200 stopped, the installed app terminated and relaunched from packaged assets and restored its isolated IndexedDB Study changes. Simulator-wide network disable was not available in this run; this proves packaged/no-localhost startup, not the future native-store migration or physical-device airplane-mode behavior.
- **Relevant commits:** `f6e4ffd`, `ca23e20`, `8782f2f`.

### HR-NATIVE-10 — Native accessibility and device UI audit
- **Product area / milestone / priority:** Accessibility / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** Native shell and Simulator accessibility controls
- **Requirement / acceptance:** Audit safe areas, orientation, software keyboard, larger text implications, touch/focus, reduced motion, themes, scrolling and dialogs inside the shell. VoiceOver remains unverified unless actually exercised.
- **Platform implications:** Retain Material 3 identity and avoid unnecessary UIKit imitation.
- **Verification / evidence:** Actual iPhone and iPad Simulator launches show safe status/home-indicator spacing and pass portrait Study/navigation; iPhone landscape, native Share popover, document picker, System/Dark appearance and accessibility-extra-large content-size screenshots are retained. WKWebView text did not visibly follow Simulator Dynamic Type, so browser 200% reflow evidence remains separate. Software-keyboard and VoiceOver acceptance remain pending manual/device work.
- **Relevant commits:** `f6e4ffd`, `8782f2f`.

### HR-NATIVE-11 — Entitlement/purchase readiness check
- **Product area / milestone / priority:** Entitlements / Apple feasibility / P1
- **Status:** DONE
- **Dependencies:** Existing central capability policy
- **Requirement / acceptance:** Confirm native seams cannot bypass product access and that future verified Apple ownership/restore can be adapted without changing learning or cosmetic state. No StoreKit, product IDs or transactions.
- **Platform implications:** Universal-purchase and commercial policy remain product decisions.
- **Verification / evidence:** Native platform adapters contain no entitlement decisions and do not mutate learning/cosmetic state. Future verified Apple ownership must enter only through `CAPABILITY_POLICY`; current `development-unverified` access remains non-enforcing. No StoreKit/product IDs/transactions were introduced, and recovery/export access remains independent.
- **Relevant commit:** `f6e4ffd`.

### HR-NATIVE-12 — Privacy and permission inventory
- **Product area / milestone / priority:** Privacy / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** Every native dependency selected in this milestone
- **Requirement / acceptance:** Record version, purpose, native APIs, permissions, plist and privacy-manifest implications, and platform support. Request no unnecessary permission and add no analytics/tracking.
- **Platform implications:** Inventory must match generated native dependencies and official Apple/Capacitor requirements.
- **Verification / evidence:** Exact dependency inventory is in `ios-readiness.md`. Filesystem's required `NSPrivacyAccessedAPICategoryFileTimestamp` / `C617.1` declaration is committed in `PrivacyInfo.xcprivacy`; App and Share document no runtime permission/usage-description need for this scope. No Photos, microphone, tracking or analytics permission was added. Final Xcode privacy report remains pending.
- **Relevant commit:** `f6e4ffd`.

### HR-MAC-01 — macOS delivery decision
- **Product area / milestone / priority:** Platform / Apple feasibility / P0
- **Status:** VERIFY
- **Dependencies:** HR-NATIVE-01/02/04/07 and Apple distribution/runtime evidence
- **Requirement / acceptance:** Evaluate iOS/iPad app on Apple-silicon Mac, Mac Catalyst and a dedicated-wrapper option; run only legitimate local spikes. Recommend one first-release route with explicit hardware, file, window/input, purchase, maintenance and testing limitations. Intel/alternate-runtime scope requires product approval.
- **Platform implications:** Capacitor itself is not represented as a supported macOS target.
- **Verification / evidence:** Xcode exposes the arm64 `My Mac` destination with variant `Designed for [iPad,iPhone]`; the project has `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD=YES`, Catalyst disabled and iOS 15 deployment. The destination build succeeds. Direct launch of the unsigned/ad-hoc artifact fails with `incorrect executable format`; no signed Mac-compatible installation was attempted, so runtime resizing/input/files/plugin evidence remains pending.
- **Verification / evidence:** Decision 008 recommends the same iPad-capable iOS application on Apple-silicon Macs as the first candidate because it minimizes runtime and adapter duplication. It remains gated by `My Mac (Designed for iPad)` resizing/keyboard/pointer/files/storage/plugin tests. Catalyst is deferred because Capacitor does not support it and cannot be built here; a dedicated wrapper is deferred unless Intel support or desktop acceptance later requires it. Final product approval and executable Mac evidence remain pending.
- **Relevant commits:** `f6e4ffd`, `8782f2f`.

### HR-PLAN-05 — Apple platform readiness matrix
- **Product area / milestone / priority:** Planning / Apple feasibility / P0
- **Status:** DONE
- **Dependencies:** HR-NATIVE-01–12 and HR-MAC-01 evidence
- **Requirement / acceptance:** Maintain separate implementation/browser/Simulator/physical-device/distribution evidence for startup, Study, persistence, media/audio, import/export, backup, lifecycle, offline, accessibility, input, entitlements and signing.
- **Platform implications:** WebKit tests never count as WKWebView or physical-device evidence.
- **Verification / evidence:** `docs/ios-readiness.md` now separates web implementation, Chromium, Playwright WebKit, iOS architecture, Simulator, physical device, macOS route and distribution evidence across every requested capability. Blocked and untested cells remain explicit.
- **Relevant commit:** `f6e4ffd`.

## iOS/iPadOS adaptive UX acceptance — active milestone

Source: Will's 7 October 2026 Simulator review and adaptive-navigation/Study-redesign milestone. Shared Angular/Material UI remains authoritative; Android runtime work stays deferred.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-IOS-UX-01 | Fix text and spacing defects | UI/content | iOS UX acceptance | P0 | DONE | Native reproduction; shared spacing/text conversion |
| HR-IOS-UX-02 | Adaptive application navigation | Navigation | iOS UX acceptance | P0 | DONE | Existing screen state and native Back adapter |
| HR-IOS-UX-03 | Reduce mobile header chrome | Navigation/UI | iOS UX acceptance | P0 | DONE | HR-IOS-UX-02 |
| HR-IOS-UX-04 | Tap Study card to reveal | Study/accessibility | iOS UX acceptance | P0 | DONE | Shared card renderer and reveal state |
| HR-IOS-UX-05 | Mobile Study composition | Study/UI | iOS UX acceptance | P0 | DONE | Stable Study stage and rating semantics |
| HR-IOS-UX-06 | Input-mode-aware shortcuts | Study/input | iOS UX acceptance | P1 | DONE | Keyboard contract and coarse-pointer styling |
| HR-IOS-UX-07 | Native-quality touch interaction | Accessibility/UI | iOS UX acceptance | P0 | DONE | Material 3 and safe-area tokens |
| HR-IOS-UX-08 | Responsive rules, not patches | Design system | iOS UX acceptance | P0 | DONE | Container/viewport rules and text reflow |
| HR-IOS-UX-09 | Mobile Session Complete | Results/UI | iOS UX acceptance | P1 | DONE | Existing Results motion ownership |
| HR-IOS-UX-10 | iOS information architecture review | Product/UI | iOS UX acceptance | P0 | DONE | Actual Simulator page inventory |

Acceptance for this group is the request text plus actual iPhone/iPad Simulator evidence. Every item must preserve desktop sidebar/right-panel behavior, five-confidence FSRS semantics, Practice boundaries, owned Study motion and physical-device evidence gaps. Page-review findings remain classified as BUG, SPACING/ALIGNMENT, NAVIGATION, TOO MUCH CHROME, MOBILE INTERACTION, TEXT/CONTENT, ACCESSIBILITY or NATIVE VERIFICATION GAP.

- **Implementation:** compact widths use one contextual header and disclosed secondary navigation. HR-IOS-UX-11 subsequently refined the bottom bar from five destinations to four equal tracks (Decks, Study, Collection, More), moving Progress into More for enlarged-text alignment. Study/Results suppress that bar and keep their owned exit/continue actions. Tablet/desktop widths retain the rail and right-hand Study panel. The shared card is a semantic single-tap reveal target on touch; nested controls and drag movement remain isolated. Keyboard reveal is Space/Enter and confidence is 1–5, with command help behind disclosure.
- **Layout/text:** the Study stage measures identically across reveal at 393×852 (`x 43.23`, `y 161`, `306.53 × 459.80`, scroll position `0`). Five equal rating targets meet the 48 px touch target. Imported block HTML now preserves rendered separators instead of concatenating adjacent paragraphs/divisions; inline adjacency remains language-safe. The visual viewport coordinator recovers focused fields above a resized keyboard viewport.
- **Page review:** Decks and deck/subdeck use the primary tab plus contextual title/back; Focus, Design Studio, import/export and Settings use More; Collection/inspection and Progress/history retain their shared internal navigation; authoring and dialogs retain Material-owned transitions; Study and Practice share the adaptive player; Results retains its owned reveal/Skip/Replay choreography with one reachable safe-area action dock. No duplicate phone branding/page-title header remains. Intentional exceptions are Study/Results navigation suppression and Material dialogs/expansion panels, which are not given competing shell transitions.
- **Evidence:** actual iPhone 17 Pro and iPad Pro 11-inch (M5), iOS 26.5, Xcode 26.6 XCUITest runs pass the adaptive navigation and three-card visibility journey. The final clean iPhone run passes 1/1 in 36.820 s and exports five named screenshots from `native-visual-final8.xcresult`: the contained rating dock, incoming cards 2 and 3, Session Complete and Settings. Result bundles, recordings and extracted screenshots are under `.runtime/evidence/hr-ios-ux-20261007/`. Controlled unit/domain tests pass 146/146. The broad browser run passes 161/163 with all WebKit cases green; the two corrected Chromium compact-navigation cases then pass 2/2, and the adaptive target matrix passes. Physical-device touch, haptics, VoiceOver and Dynamic Type remain pending and are not represented as Simulator proof.
- **Relevant commits:** `5d25e22`, `02ce032` and the closing evidence checkpoint.

## Data fidelity, update workflow, settings and navigation — active milestone

Source: Will's 7 October 2026 manual Anki-content and product review. No native-store migration, external auth provider, advertising SDK or purchase integration is authorised.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-ANKI-03 | Real imported-content fidelity | Import/content | Data fidelity | P0 | DONE | Existing converter, mappings and renderer |
| HR-ANKI-04 | User-facing Anki update workflow | Import/portability | Data fidelity | P0 | DONE | Stable source identities and atomic import |
| HR-SETTINGS-01 | Functional settings actionability audit | Settings/scheduling | Settings audit | P0 | DONE | Study presets and runtime consumers |
| HR-NAV-01 | Shared breadcrumb/context model | Navigation | Adaptive navigation | P0 | DONE | Existing screen state and deck hierarchy |
| HR-IOS-UX-11 | Leaner aligned iPhone navigation | Navigation/accessibility | Adaptive navigation | P0 | DONE | HR-NAV-01 and safe-area shell |
| HR-IDENT-01 | Account architecture and UX contract | Identity/platform | Architecture readiness | P1 | DONE | Existing platform seams; provider decision |
| HR-COM-02 | Future ads and premium architecture | Commercial/platform | Architecture readiness | P1 | DONE | CapabilityPolicy and privacy review |
| HR-COM-03 | Identity/entitlement/learning separation | Domain architecture | Architecture readiness | P0 | DONE | HR-IDENT-01 and HR-COM-02 |
| HR-PERF-02 | Restore initial web bundle gate | Performance | Performance closure | P1 | DONE | Adaptive shell bundle graph |

Acceptance is the complete request text. The request supplied `HR-AUTH-01`, but that stable ID already belongs to the accepted Faster Deck/Card Creation requirement, so the new account item is `HR-IDENT-01` rather than overwriting history. Import work must preserve scheduling, history, cosmetics, media and local edits; settings require observable runtime consumers; navigation uses one semantic hierarchy across compact/wide layouts; auth/commercial work remains provider-free and non-enforcing. Every implementation retains Web, iOS/iPadOS, Android and Apple-silicon Mac implications.

- **Implementation:** commit `4c46fe7` adds structured Anki conversion, inert source baselines, format-v5 portability, atomic update preview/conflict policy, the settings audio fix, shared breadcrumb/context navigation, aligned four-track phone navigation, provider-neutral identity/ad seams and the bundle reduction. The closing documentation/evidence commit records the final browser and Simulator gate.
- **Acceptance evidence:** unit/domain **157/157**. The complete browser run passed **160/174** before 13 intentional test-contract updates (Settings-owned theme and phone More → Progress) and one transient WebKit phase-sampling assertion were corrected; the complete failed set then passed **15/15**, and the final theme rerun passed **2/2**. Targeted import/navigation recordings pass **4/4**. iPhone 17 Pro / iOS 26.5 packaged WKWebView smoke passes **1/1 in 42.381 s** with three settled cards, Results, Collection, More → Progress and Settings. Production/native-sync build is **840.94 kB raw / 199.55 kB transfer**, below 850 kB. Evidence: `.runtime/evidence/hr-data-fidelity-20261007/`.
- **Actionability finding:** every exposed setting has persisted state and a runtime consumer. The real defect was same-card persistence refresh being mistaken for card advance, which ignored the learner's audio-stop preference; real advances remain mandatory cleanup. No production control was removed as dead or relabelled planned.
- **Architecture scope:** `LocalAuthSession` and `NoAdvertisingPolicy` are default local/no-ad implementations. Auth0 is the ADR recommendation only. There is no external provider, credential, login UI, backend, ad SDK/placement, entitlement enforcement, payment product or restriction.

## Stop-ship Anki update and layout recovery — active milestone

Source: Will's 7 October 2026 manual test of the exact real Anki package. Normal roadmap work is stopped. No native database migration, authentication provider, advertising, payments or cloud work is authorised.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-BUG-ANKI-05 | Updated cards receive incorrect `it` answer | Import/data integrity | Stop-ship recovery | P0 | DONE | Existing mapping presets, source baselines and update preview |
| HR-BUG-ANKI-06 | Contextual Anki update workflow | Import/UX | Stop-ship recovery | P0 | DONE | HR-BUG-ANKI-05 and lazy exchange route |
| HR-BUG-ANKI-07 | Update visual hierarchy and spacing | Import/UX | Stop-ship recovery | P0 | DONE | HR-BUG-ANKI-06 and Material 3 tokens |
| HR-BUG-NAV-02 | Breadcrumbs break page layout | Navigation/layout | Stop-ship recovery | P0 | DONE | Shared navigation context component |
| HR-BUG-STUDY-02 | Excessive Study dead space | Study/layout | Stop-ship recovery | P0 | DONE | HR-BUG-NAV-02 and responsive Study workspace |
| HR-BUG-STUDY-03 | Protect imported-answer semantics | Import/scheduler boundary | Stop-ship recovery | P0 | DONE | HR-BUG-ANKI-05 and explicit mapping provenance |

Acceptance is the complete stop-ship request. The lead owns mapping/source schema, persistence integration, shared navigation and tracker state. Work must preserve review events, FSRS state, due dates, presets, cosmetics, Focus history, hierarchy and media. All destructive verification uses sanitised fixtures; the user's collection is read-only.

- **Root cause / implementation batch:** the UI mapping suggester treated any unrecognised ordinal-1 field as Answer. A sanitised `Prompt / Language / Pronunciation / Italian` model therefore mapped `Language = it` over the correct `{{Italian}}` template result; persistence and CardRenderer then correctly retained/displayed that corrupted converted value. Positional inference is removed. A shared conservative suggester uses semantic names plus unambiguous template-side references, mappings are checked against the canonical template, one preset is retained per signature, and each converted card records prompt/answer provenance. Unresolved semantics block Apply.
- **Context/layout batch:** the deck action now opens the platform file chooser directly and passes the chosen package into a focused lazy update screen. Generic exports/downloads are absent, conflicts require an explicit choice, representative structured Before/After values are visible, and success returns to the originating deck. The breadcrumb defect was an unscoped legacy `nav` column/full-width-button rule; shared breadcrumbs now explicitly own a compact wrapping row, omit the duplicate current-page crumb, and the Study toolbar/workspace margins are compacted without negative offsets.
- **Final verification:** controlled unit/domain **158/158** and the complete Playwright matrix **176/176** pass across Chromium, desktop WebKit and compact/large/landscape WebKit profiles. Targeted animation-enabled update/breadcrumb/Study evidence passes **6/6** in Chromium/WebKit. The production build is **842.63 kB raw / 199.84 kB transfer**, below the unchanged 850 kB ceiling; Exchange remains a 54.60 kB lazy chunk. Packaged iPhone 17 Pro / iOS 26.5 XCUITest passes the three-card visibility, Results and navigation smoke **1/1 in 40.646 s**. Evidence is under `.runtime/evidence/hr-stopship-20261007/`. The earlier **172/176** broad run exposed two reversed-template guard failures and two changed-copy expectations; the implementation/copy were corrected, the affected set passed **18/18**, then the clean full run passed. No timeout or assertion strength was weakened.

## HoloRecall dogfood gate — active milestone

Source: Will's 9 October 2026 bounded dogfood request. Work proceeds through the four phases below in order. A later phase may not start until the preceding acceptance gate passes. Phase 0 is accepted and the automatic Phase 1 gate is complete; Phase 2 has not started. AnkiWeb Sync remains `NOT PLANNED`.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-ANKI-LEGACY-01 | Repair legacy auto-mapped `Language → Answer` imports | Import/data integrity | Dogfood Phase 0 | P0 | DONE | Obsolete mapping provenance, source snapshot/template semantics, repair-aware merge |
| HR-ANKI-LEGACY-02 | Rebuild every derived surface after legacy repair | Import/search/portability | Dogfood Phase 0 | P0 | DONE | HR-ANKI-LEGACY-01 and indexed/export projections |
| HR-CONTENT-LIST-01 | Concise structured card-management rows | Deck management/UI | Dogfood Phase 0 | P0 | DONE | Structured card content and bounded list rendering |
| HR-DECK-UX-01 | Replace deck/source action dump with one management hierarchy | Deck management/UX | Dogfood Phase 0 | P0 | DONE | Shared deck actions and contextual Anki-source management |
| HR-ANKI-V2-01 | Retain source-native Anki deck/note-type/note/card/media model | Import/data integrity | Dogfood Phase 1 | P0 | DONE | Phase 0 acceptance; HR-ANKI-ARCH-01/08/09 |
| HR-ANKI-V2-02 | Safe template engine for supported Anki constructs | Import/security | Dogfood Phase 1 | P0 | DONE | HR-ANKI-V2-01; HR-ANKI-ARCH-02/03 |
| HR-ANKI-V2-03 | Safe internal imported-content model | Import/content | Dogfood Phase 1 | P0 | DONE | HR-ANKI-V2-02 and sanitisation boundary |
| HR-ANKI-V2-04 | Exact Italian package content mapping | Import/conversion | Dogfood Phase 1 | P0 | DONE | Exact package and template-first renderer |
| HR-ANKI-V2-05 | Convert Picture panels and Options into inert native content | Import/security/UI | Dogfood Phase 1 | P0 | DONE | Safe content model; no source JavaScript/CSS execution |
| HR-ANKI-V2-06 | Deterministic collectible art without binary source images | Collection/design | Dogfood Phase 1 | P1 | DONE | Stable card-art source model |
| HR-ANKI-V2-07 | Keep semantic enrichment optional | Import/content | Dogfood Phase 1 | P0 | DONE | Valid template-rendered front/back |
| HR-ANKI-V2-08 | Concise automatic import workflow | Import UX | Dogfood Phase 1 | P0 | DONE | Exact-package compatibility analysis |
| HR-ANKI-V2-09 | Concise source-identity update workflow | Import UX/data | Dogfood Phase 1 | P0 | DONE | Stable identities and local-edit protection |
| HR-ANKI-V2-10 | Retained source snapshot and independent converter versions | Import/portability | Dogfood Phase 1 | P0 | DONE | Normalized source persistence |
| HR-ANKI-V2-11 | Compact opt-in advanced enrichment table | Import UX | Dogfood Phase 1 | P1 | DONE | HR-ANKI-V2-07; never required for supported front/back |
| HR-MODE-01 | Separate Study Mode from Study Preset | Study/domain | Dogfood Phase 2 | P0 | DONE | Phase 1 acceptance and shared Study player |
| HR-MODE-02 | Scheduled learning/relearning repetition | Study/scheduler | Dogfood Phase 2 | P0 | DONE | Intraday queues, learn-ahead, exact intervals and fake-clock tests |
| HR-MODE-03 | Mastery mode with scheduler-safe extra attempts | Study/practice | Dogfood Phase 2 | P1 | DONE | HR-MODE-01/02 and separate practice events |
| HR-MODE-04 | Free Revision mode | Study/practice | Dogfood Phase 2 | P1 | DONE | Existing Practice/Focus boundary |
| HR-MODE-05 | Concise mode chooser | Study UX | Dogfood Phase 2 | P1 | DONE | HR-MODE-01–04 |
| HR-MODE-06 | Mode-specific settings actionability | Study/settings | Dogfood Phase 2 | P0 | DONE | Existing setting consumers and HR-MODE-01–04 |
| HR-ANKI-V2-12 | Real-package import/update/repair parity hardening | Import/data integrity/UX | Anki replacement usability | P0 | DONE | HR-ANKI-V2-01–11 and exact supplied package |
| HR-ANKI-V2-13 | Deterministic native fallback art for media-free imported cards | Import/collection/design | Anki replacement usability | P0 | DONE | Declarative source panels and content-v7 card art |
| HR-CARD-DELIGHT-01 | Accessible finish/frame/motion treatment foundation | Collection/design/platform | Anki replacement usability | P1 | DONE | Existing rarity/finish renderer and feedback adapters |
| HR-DECK-UX-02 | Group imported-deck study, deck, and source management | Deck management/UX | Anki replacement usability | P1 | DONE | Existing deck actions and contextual source manager |
| HR-EXPORT-01 | Full-fidelity HoloRecall portable package | Import/export | Dogfood Phase 3 | P0 | PLANNED | Phase 2 acceptance and source/art portability |
| HR-EXPORT-02 | Content-compatible Anki `.apkg` export | Import/export | Dogfood Phase 3 | P1 | PLANNED | Safe static templates/media and Anki-compatible validation |

Phase 1 acceptance requires the exact supplied package to pass automatic template-first conversion, safe declarative presentation, concise import/update, legacy repair, portability and browser evidence without manual mapping. The automatic gate now passes; HR-ACCEPT-ANKI-01 remains VERIFY until Will retests the genuine existing local deck.

- **Phase 1 acceptance evidence (9 October 2026):** SHA-256 `02f537522f25dfc0060011e391ba6fe3a98dddf9427b14f23505d80b5f75247a` matches. The ignored runtime fixture contains 254 notes/cards, no reviews, 3 lesson roots, 21 subdecks, one 21-field note type/template, no binary media, 254 Picture panels and 134 Options blocks/593 choices. Template semantics select `Italian` on all 254 cards; 64 optional `Answer` values remain labels. Picture/Options become declarative panel/choice data and source scripts/styles never reach the renderer. Twenty representative cards pass Chromium and WebKit visual/reveal/transition inspection. Unit/domain 176/176, the final browser matrix 185/185 and production build 818.58 kB raw / 195.02 kB transfer pass. An earlier full browser run exposed the same asynchronous bulk-action sampling race in Chromium and WebKit; waiting for the existing success signal fixed it without changing product assertions, the focused rerun passed 2/2, and the clean post-fix matrix passed 185/185. The packaged iPhone 17 Pro / iOS 26.5 shared Study/navigation smoke also passed 1/1; exact-package document import was not represented as Simulator evidence. Runtime evidence: `.runtime/evidence/hr-dogfood-phase1-20261009/`.
- **Implementation notes:** state snapshot v2 retains used source decks, ordered note fields, templates, notes, generated-card identities and media aliases. Converter v4, template engine v1, normalizer v4 and enrichment v1 invalidate independently. Portable content format v7 carries validated declarative art, choices, answer labels and labelled details while v1–v6 remain readable. Safe hyperlinks and 111 source tables are readable inert-text simplifications in this release.
- **Relevant commit:** Template-first implementation `34b22f4`; evidence/documentation checkpoint follows this handoff.

- **Anki replacement usability acceptance (9 October 2026):** HR-ANKI-V2-12/13, HR-MODE-01–06, HR-CARD-DELIGHT-01 and HR-DECK-UX-02 are DONE for this bounded milestone. The exact 254-card package revalidates 3 roots, 21 subdecks, 254 native panels, 134 choice cards/593 inert choices, no binary media, no Tier C/D cards, no executable source behavior and no manual mapping. Current HTML normalization also preserves table-cell and word-tile boundaries without adding global language-dependent spacing. Update/Repair continues through the same template-first transaction plan and the legacy `Language = it` repair remains passing.

## DESIGN SUITE FOUNDATION — complete bounded milestone

Source: Will's 11 October 2026 Design Suite Foundation authorization and `docs/design/card-design-system.md`. This milestone establishes reusable presentation, inheritance, authoring and portability contracts. Prestige progression and Collection Desk remain outside scope.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-DESIGN-03 | Design Set inheritance and override provenance | Design/domain/data | Design Suite Foundation | P0 | DONE | Global → ancestor/deck → rarity variant → card override resolution |
| HR-DESIGN-04 | Hybrid rarity and finish model | Design/domain/renderer | Design Suite Foundation | P0 | DONE | Authored rarity remains independent from declarative finish/frame variants |
| HR-DESIGN-05 | Subject-neutral card content semantics | Content/domain/renderer | Design Suite Foundation | P0 | DONE | Secondary, interpretation and labelled support with legacy language aliases |
| HR-DESIGN-06 | Content-first manual and JSON batch creation | Authoring/import | Design Suite Foundation | P0 | DONE | Friendly/official JSON, strict preview and atomic apply |
| HR-DESIGN-07 | Responsive progressive-disclosure Design Suite | Design Studio/UX | Design Suite Foundation | P0 | DONE | Shared renderer, representative previews and Light/Dark inspection |
| HR-DESIGN-08 | Declarative uploaded-art composition and palette | Design/media/renderer | Design Suite Foundation | P0 | DONE | Durable source asset, focal/crop/mask controls and editable derived palette |
| HR-DESIGN-09 | Embedded/printed artwork treatment primitives | Design/renderer/accessibility | Design Suite Foundation | P1 | DONE | Texture, emboss, depth, fade and vignette constrained by effects preferences |
| HR-DESIGN-10 | Reusable layout/composition templates | Design/domain/renderer | Design Suite Foundation | P0 | DONE | Nine curated compositions with fixed or deterministic suggestion policy |
| HR-DESIGN-11 | Stable offline no-image typographic art | Design/renderer/portability | Design Suite Foundation | P1 | DONE | Deterministic identity/design/rarity generated art |
| HR-DESIGN-12 | Coherent automatic rarity variants | Design/domain/renderer | Design Suite Foundation | P1 | DONE | One family derives compatible frame/finish/accent variants; bespoke overrides supported |
| HR-DESIGN-13 | Universal recall/answer face hierarchy | Card renderer/Study | Design Suite Foundation | P0 | DONE | Dominant prompt/answer; long support disclosed outside the physical card |
| HR-DESIGN-14 | Artwork-region guide export/reimport | Design/media/portability | Design Suite Foundation | P1 | DONE | Trusted 1000×1500 SVG guide plus raster reimport without content replacement |
| HR-DESIGN-15 | Portable Design Suite format and assets | Exchange/data integrity | Design Suite Foundation | P0 | DONE | Content format v8; v1–v7 readable; shared assets remain deduplicated |

**Acceptance evidence:** unit/domain **190/190** covers inheritance and presentation-only mutation contracts, atomic JSON authoring, schema-v8 backward compatibility, palette/composition controls and rarity variants. The clean Playwright matrix passes **201/201** across Chromium, desktop WebKit and compact/large/landscape WebKit, including uploaded white/smiley artwork integration, deterministic generated art and JSON preview/apply; a final `suggest`-policy resolution fix passes explicit Chromium/WebKit coverage **2/2**. Packaged iPhone 17 Pro / iOS 26.5 Design Suite smoke passes **1/1** and remains separate from physical-device evidence. Production is **837.79 kB raw / 199.57 kB transfer**, below the unchanged 850 kB ceiling; Design Suite is lazy. Screenshots and the native result bundle are retained in ignored `.runtime/evidence/hr-design-suite-foundation-20261011/`. Authentication, commercial work, cloud/native storage, Prestige and Collection Desk are outside scope.

## HR-DESIGN-16 — Artwork Blending and Printed-Surface Correction — active bounded milestone

Source: Will's 11 October 2026 corrective artwork-composition request and `docs/design/card-design-system.md`. This milestone corrects the shared renderer and Design Suite defaults; it does not begin Prestige, Collection Desk or another product area.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-DESIGN-16A | Blend artwork, frame, background and protected surfaces as one composition | Card renderer/design | Artwork blending correction | P0 | DONE | Existing declarative composition pipeline |
| HR-DESIGN-16B | Add accessible printed-ink learning-content treatment | Card renderer/accessibility | Artwork blending correction | P0 | DONE | Palette and protected-content layers |
| HR-DESIGN-16C | Preserve dominant prompt/answer hierarchy and readable contrast | Learning UX/accessibility | Artwork blending correction | P0 | DONE | Shared recall/answer renderer |
| HR-DESIGN-16D | Apply blending consistently across art sources, templates and rarities | Design system/renderer | Artwork blending correction | P0 | DONE | Curated compositions and rarity variants |
| HR-DESIGN-16E | Simplify Design Suite blending controls and make effects previewable | Design Studio/UX | Artwork blending correction | P1 | DONE | Existing progressive artwork controls |
| HR-DESIGN-16F | Improve integrated defaults for uploaded, simple and generated artwork | Design/domain/defaults | Artwork blending correction | P0 | DONE | Design Set defaults and legacy-safe fallbacks |

Acceptance requires representative uploaded, white/smiley, generated, text-only and technical cards across at least two compositions and rarities. Artwork and frames must read as one material; protected copy must remain immediately legible in Light/Dark/System, reduced motion and Effects Off. Chromium, desktop WebKit, mobile WebKit and the unchanged 850 kB initial-bundle gate are required; native Simulator evidence is recorded separately where the shared renderer warrants it.

**Acceptance evidence (11 October 2026):** the renderer now uses one palette-derived material across full-card background, frame bridge, artwork, headings/copy/footer and imported choice panels. New/global designs default to a printed blend; six concise surface presets replace the raw primary treatment selector while focal, crop, palette and optional fine controls remain. The sparse white/smiley fixture exposed and fixed an inherited palette bug where ink was selected against the pre-darkened sample rather than the final surface. Unit/domain passes **192/192**; the clean full Playwright matrix passes **203/203** across Chromium, desktop WebKit and compact/large/landscape profiles, with final artwork coverage passing **4/4** in Chromium/WebKit. Production is **838.01 kB raw / 199.70 kB transfer**, below 850 kB; Design Suite remains a **36.24 kB** lazy chunk. The synced production shell passes the iPhone 17 Pro / iOS 26.5 Design Suite XCUITest **1/1 in 13.464 s**. Evidence: .runtime/evidence/hr-design-16-20261011/. Initial browser attempts failed before product load while the dev server compiled; later assertion/Material-overlay test defects were corrected without changing timeouts, and the final gates are clean.

## HR-UX-IMPORTED-DECK-REVIEW — active bounded milestone

Source: Will's 10 October 2026 imported-deck review and presentation request. This milestone refines the accepted template-first import result; it does not reopen importer architecture or begin another roadmap phase.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-UX-IDR-01 | Unify spacing and layout rhythm for imported-deck surfaces | Design system/UI | Imported deck review | P1 | DONE | Existing Material 3 spacing tokens |
| HR-UX-IDR-02 | Deck-scoped collectible card browsing and inspection | Deck management/Collection | Imported deck review | P0 | DONE | Shared CardRenderer, search/index and deck hierarchy |
| HR-UX-IDR-03 | Post-import/update/repair completion actions | Import/update UX | Imported deck review | P0 | DONE | Contextual Anki transaction results and stable deck identity |
| HR-UX-IDR-04 | Full-card imported art, card-wide gleam and refined choice treatment | Collection/design/accessibility | Imported deck review | P1 | DONE | Declarative CardArtSource, rarity and effects preferences |
| HR-UX-IDR-05 | Clarify parent/subdeck context and grouped management actions | Deck management/organisation | Imported deck review | P1 | DONE | Existing hierarchy and HR-DECK-UX-02 |

Acceptance requires an obvious deck/subdeck **View cards** path, a deck-scoped collectible browser with existing search/filter behavior, concise completion actions after fresh import/update/repair, whole-card rarity-aware native art with reduced-motion/effects safeguards, and clear parent/subdeck action hierarchy. Desktop Chromium/WebKit and responsive phone/tablet evidence plus the unchanged 850 kB initial bundle gate are required. Authentication, advertising, payments, Anki export, scheduling redesign and native-storage migration remain outside scope.

- **Acceptance evidence (10 October 2026):** parent and subdeck menus expose **View cards** into a hierarchy-scoped Collection view that reuses indexed search/filters and renders bounded shared CardRenderer previews. Fresh import, update and repair now stop at a named completion panel offering Review, Study, Deck and Search actions; a multi-root package reviews all imported lesson branches. Imported native/generated art colours the full card, redundant lesson/topic panel chips were removed, inert choices use art-aware treatment, and the shared card-wide gleam respects reduced motion and Effects Off. The exact 254-card package rendered 20 sampled cards with native art and no redundant panel metadata in isolated Chromium evidence. Unit/domain passed 181/181; the clean browser matrix passed 199/199 across Chromium, desktop WebKit and three phone profiles. The first full run found four paired Collection regressions; selection context and intended-renderer assertions were corrected without timeout/assertion weakening. Production is **826.24 kB raw / 196.78 kB transfer**, below 850 kB. Evidence: `.runtime/evidence/hr-ux-imported-deck-review-20261010/` and Playwright `test-results/imported-deck-review-*`.
- **Study Mode contract:** Study Presets continue to own FSRS/workload/order settings. Anki Mode is scheduled Study and requeues real FSRS Learning/Relearning transitions, ordered by their actual preset-derived due timestamp. Mastery Mode is scheduled Study with HoloRecall's five-confidence and genuine cosmetic progression; it does not invent practice retries or mastery claims. Free Revision creates only practice events and cannot mutate FSRS, due dates, daily limits or rewards. The mode is persisted, selected independently and visible in the shared player.
- **Presentation contract:** media-free imported Picture content becomes deterministic `source-visual-panel` art seeded from lesson/topic/kind/title and remains compatible with rarity/finish layers. Choice buttons become inert native chips. The shared finish registry documents gloss, holo/reverse-holo, etched, textured, prismatic, gold/gilded, cosmos/starfield, shattered-glass, neon-ink, crystal, obsidian and aurora treatments; only CSS-safe, reduced-motion-compatible effects are exposed. Additional frame families and physical haptic tuning remain later art/device work. Imported journeys group Study, Manage deck and Anki source actions without flattening their hierarchy.
- **Verification:** unit/domain passed 181/181 serially. An earlier concurrent run had two unchanged 10k timing budgets exceed 3 seconds; those suites passed 15/15 on the immediate serial rerun without changing thresholds. Exact-package domain passed in 0.85 s. Full browser matrix passed 190/192 initially; both failures were the same Results status-node regression, corrected and passing 2/2 without timeout/assertion changes. Exact-package Chromium/WebKit journeys passed 2/2 with twenty Collection renders and three settled Study transitions. Production is 824.48 kB raw / 196.45 kB transfer. Native sync passed; the first iPhone smoke found the mode selector had pushed Start below the tappable viewport, the shared layout was corrected, and the unchanged iPhone 17 Pro/iOS 26.5 XCUITest passed 1/1. Evidence: `.runtime/evidence/hr-anki-replacement-20261009/`.

- **Phase 0 acceptance evidence (9 October 2026):** a pre-snapshot legacy fixture supplies its source package once, creates and retains the normalized source snapshot, replaces obsolete auto-derived `Language → Answer` content in place and preserves card identity plus learner state. Repaired identity is exercised through bounded card row, editor, search, Collection, consecutive-card Study and portable source snapshot round-trip. Deck journeys expose Study, Focus and a closable More menu; subdeck disclosure is subordinate; imported decks expose one Manage Anki source entry leading to Update, rebuild/repair, compatibility, opt-in enrichment and detach. Unit/domain 173/173, targeted desktop 20/20, phone 200% 3/3, iPhone Simulator packaged Study/navigation 1/1, and production build 849.98 kB pass. The full browser matrix reached 184/185; one WebKit feedback-signature sample raced the finite 900 ms element after visibility. The assertion was made atomic without changing its timeout/strength and then passed 6/6 repeated Chromium/WebKit runs. Phase 1 remains gated on the exact package.

## Import reconversion, content repair and first-class editing — preserved history

Source: Will's 7 October 2026 failed repeat update of the exact Anki package. Roadmap progression remains stopped; no native-store migration, auth provider, advertising, payments or cloud work is authorised.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-ANKI-08 | Version source conversion and expose conversion upgrades | Import/data integrity | Content repair | P0 | DONE | Existing source identities/baselines and schema migration |
| HR-ANKI-09 | Repair/reconvert an imported deck | Import/portability | Content repair | P0 | DONE | HR-ANKI-08 and contextual source management |
| HR-ANKI-10 | Protect local field edits during reconversion | Import/data integrity | Content repair | P0 | DONE | Field provenance and atomic conflict handling |
| HR-ANKI-11 | User-accessible source mapping editor | Import/authoring | Content repair | P0 | DONE | Signature-bound Anki mappings and preview |
| HR-AUTHOR-02 | Complete native/imported card editor | Authoring/media | Editing | P0 | DONE | Shared CardRenderer and media registry |
| HR-AUTHOR-03 | Imported-card source controls | Authoring/import | Editing | P1 | DONE | HR-ANKI-09/10 and stable source identity |
| HR-AUTHOR-04 | Complete deck/subdeck editor | Authoring/organisation | Editing | P0 | DONE | Stable deck hierarchy and presets |
| HR-AUTHOR-05 | Safe archive and destructive deck deletion | Authoring/data safety | Editing | P0 | DONE | Reference-aware media cleanup and confirmation |
| HR-BUG-CONTENT-01 | Bounded structured card-list presentation | Deck management/UI | Content repair | P0 | DONE | Structured card fields and list virtualization |
| HR-BUG-CONTENT-02 | Semantic field label/value separation | Content/UI | Content repair | P0 | DONE | Structured renderer components |
| HR-BUG-ANKI-12 | Trace persisted bad-mapping resolution order | Import/data integrity | Real repair recovery | P0 | DONE | HR-ANKI-08–11 and exact-package failure evidence |
| HR-BUG-ANKI-13 | Semantic mapping-policy versioning | Import/data integrity | Real repair recovery | P0 | DONE | Mapping origin and policy migration |
| HR-BUG-ANKI-14 | Force mapping re-evaluation in real Repair mode | Import/conversion | Real repair recovery | P0 | DONE | HR-BUG-ANKI-12/13 |
| HR-BUG-ANKI-15 | Show field mapping when repair needs it | Import UX | Real repair recovery | P0 | DONE | Source samples and ambiguity detection |
| HR-BUG-ANKI-16 | Validate structurally meaningful Before/After repair | Import/data integrity | Real repair recovery | P0 | DONE | Structured destinations and apply gate |
| HR-BUG-ANKI-17 | Repair corrupted accepted baselines safely | Import/data integrity | Real repair recovery | P0 | DONE | Provenance-aware field merge |
| HR-BUG-ANKI-18 | Prevent metadata values across downstream surfaces | Import/content | Real repair recovery | P0 | DONE | Repaired structured content |
| HR-BUG-ANKI-19 | Discoverable deck source management | Import UX | Real repair recovery | P0 | DONE | Imported Deck Details |
| HR-ANKI-ARCH-01 | Retain normalized source-native Anki model | Import/data integrity | Anki architecture V2 | P0 | DONE | Package parsers and stable source identities |
| HR-ANKI-ARCH-02 | Safe Anki template compatibility engine | Import/security | Anki architecture V2 | P0 | DONE | HR-ANKI-ARCH-01 |
| HR-ANKI-ARCH-03 | Derive front and answer from card templates | Import/conversion | Anki architecture V2 | P0 | DONE | HR-ANKI-ARCH-02 |
| HR-ANKI-ARCH-04 | Make semantic enrichment secondary | Import/content | Anki architecture V2 | P0 | DONE | Template-rendered core card |
| HR-ANKI-ARCH-05 | Automatic compatibility analysis and defaults | Import/compatibility | Anki architecture V2 | P0 | DONE | HR-ANKI-ARCH-02–04 |
| HR-ANKI-ARCH-06 | Concise automatic import workflow | Import UX | Anki architecture V2 | P0 | DONE | Compatibility analysis |
| HR-ANKI-ARCH-07 | Concise automatic update workflow | Import UX | Anki architecture V2 | P0 | DONE | Stable source comparison |
| HR-ANKI-ARCH-08 | Stable source update identity | Import/data integrity | Anki architecture V2 | P0 | DONE | Source note/template/card identities |
| HR-ANKI-ARCH-09 | Persist deduplicated normalized source snapshot | Import/portability | Anki architecture V2 | P0 | DONE | Schema migration and storage limits |
| HR-ANKI-ARCH-10 | Advanced mapping only as fallback/enrichment | Import UX | Anki architecture V2 | P0 | DONE | Automatic template rendering |
| HR-ANKI-ARCH-11 | Explicit compatibility tiers A–D | Import/compatibility | Anki architecture V2 | P0 | DONE | Supported/unsupported construct analysis |
| HR-ANKI-ARCH-12 | Separate Anki content from HoloRecall presentation | Import/design | Anki architecture V2 | P0 | DONE | Safe rendered content |
| HR-ANKI-ARCH-13 | Migrate legacy imports in place | Import/data integrity | Anki architecture V2 | P0 | DONE | Source snapshot or one-time package recovery |
| HR-ANKI-ARCH-14 | Maintain realistic Anki compatibility fixtures | Import/testing | Anki architecture V2 | P0 | DONE | Official template behavior and package variants |
| HR-ANKI-ARCH-15 | Authoritative template-first importer ADR | Architecture | Anki architecture V2 | P0 | DONE | HR-ANKI-ARCH-01–14 |
| HR-BUG-ANKI-20 | Use one authoritative structured conversion pipeline for import/update/repair/migration | Import/data integrity | Phase 1 repair integration | P0 | DONE | Template-first source snapshot and converter |
| HR-BUG-ANKI-21 | Project template content into structured native fields | Import/content | Phase 1 repair integration | P0 | DONE | HR-BUG-ANKI-20 and content-v7 details |
| HR-BUG-ANKI-22 | Bind preview and Apply to one immutable transaction plan | Import/data integrity/UX | Phase 1 repair integration | P0 | DONE | HR-BUG-ANKI-20/21 |
| HR-BUG-ANKI-23 | Remove false local-edit conflicts using provenance/baselines | Import/data integrity | Phase 1 repair integration | P0 | DONE | Field provenance and legacy accepted baselines |
| HR-BUG-ANKI-24 | Present labelled supporting sections consistently | Study/authoring/content | Phase 1 repair integration | P0 | DONE | Structured details model |
| HR-BUG-ANKI-25 | Exact reconstructed-package update/repair acceptance | Import/testing | Phase 1 repair integration | P0 | DONE | HR-BUG-ANKI-20–24 and supplied fixture |

Acceptance is the complete request text. Converter versioning must invalidate derived content independently from source changes; repair must preserve all learner/scheduler/reward state and protect field-level local edits. Editors retain stable IDs/source links unless explicitly detached. Destructive tests use isolated fixtures only. Web, iOS/iPadOS, Android and Apple-silicon Mac implications remain part of verification.

**Completion evidence:** implementation `d364c77`. Schema 7 separates mapping-policy version from source signature, converter version and normaliser version. Mappings record `auto-inferred`, `user-confirmed` or migration-only `legacy-unclassified` authorship. Repair ignores obsolete automatic mappings, preserves explicit user mappings at their recorded policy version and blocks an unknown legacy mapping until review. Worker analysis returns the exact effective mappings that produced its cards; Apply commits only those mappings with the previewed content. A sanitised two-card fixture starts with `Language = it`, differing real Italian answers, blank structured fields and corrupt accepted baselines; Chromium, desktop WebKit and iPhone-size WebKit prove `0 Source changed / 2 Conversion repairs`, field samples, a visibly different structured preview and correct list/editor/search/Collection/Study output. Field origins protect editor, bulk deck/tag and tag-rename edits. State migration, atomic mapping uniqueness, scheduler/history/reward preservation and the 849.28 kB production gate pass. Evidence is recorded in `docs/project-status.md`; exact-package acceptance remains user-owned.

**Repair-integration evidence:** implementation `2ad3846` makes direct package analysis and retained-snapshot rendering call the same structured renderer and raises converter/enrichment versions independently of source identity. The projection recognizes the template's dedicated pronunciation and Meaning/English fields and retains Literal, Usage, SoundNote and Sources as labelled content-v7 details. Preview and Apply share a version-bound card transaction plan containing current, proposed, selected and field-conflict values. Accepted-baseline equality takes precedence over stale legacy origin flags, so obsolete converter output is replaceable while editor-origin changes remain protected. The ignored 899,678-byte package with SHA-256 `dbf16bf885fe59850b3410d8459911490efcd5212fe1679aafaf112c5f4a45d2` proves 42 upgrades/zero conflicts and exact Ciao/Buongiorno/Buonasera/Come-stai projections in domain, Chromium and WebKit. Unit/domain 177/177 pass serially; full browser coverage is 184/185 plus the unchanged WebKit page-reveal race passing immediately on focused retry; iPhone 17 Pro Simulator native smoke passes 1/1. Build is 819.96 kB raw / 195.22 kB transfer. Evidence: `.runtime/evidence/hr-anki-structured-repair-20261009/`.

## HR-LANGUAGE-RECALL-01 — Language Recall Clarity + Text-First Fallback — complete

Source: Will's 12 October 2026 corrective language-card request and `docs/design/card-design-system.md`. This milestone improves subject-aware presentation while preserving generic card content, Anki source fidelity, learner state, Design Sets, rarity and Prestige. Collection Desk remains outside scope.

| ID | Title | Product area | Milestone | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| HR-LANGUAGE-RECALL-01A | Trace real Lesson 1 source through Study presentation | Import/presentation/evidence | Language recall clarity | P0 | DONE | Retained Anki source snapshot and current local profile |
| HR-LANGUAGE-RECALL-01B | Add a generic subject presentation profile with language recall hierarchy | Content/design/domain | Language recall clarity | P0 | DONE | Subject-neutral CardContent and shared renderer |
| HR-LANGUAGE-RECALL-01C | Reject vague recall instructions without an unambiguous visible cue | Learning UX/content | Language recall clarity | P0 | DONE | Structured prompt, cue, context and choices |
| HR-LANGUAGE-RECALL-01D | Persist non-destructive instructional/supportive/decorative/hidden art roles | Design/import/portability | Language recall clarity | P0 | DONE | Existing CardArtSource and source provenance |
| HR-LANGUAGE-RECALL-01E | Provide collectible text-first Study presentation | Study/design/accessibility | Language recall clarity | P0 | DONE | Typographic Showcase and material renderer |
| HR-LANGUAGE-RECALL-01F | Apply language-specific answer hierarchy without changing other subjects | Study/content | Language recall clarity | P0 | DONE | Answer, secondary, interpretation and Answer Support |
| HR-LANGUAGE-RECALL-01G | Add inherited Auto/Image first/Text first study-art policy | Deck/design/authoring | Language recall clarity | P0 | DONE | Deck/Design Set inheritance and per-card override |
| HR-LANGUAGE-RECALL-01H | Preserve identity, learner state, local overrides and portable round-trip | Data integrity/portability | Language recall clarity | P0 | DONE | Import update merge, content format and full backup |

Acceptance uses actual retained/imported Lesson 1 source evidence for Ciao, a name question, a verb form, an illustration prompt, an incomplete phrase and a genuinely useful visual cue. The resolver must expose the task within roughly one second without leaking the answer. Auto, Image first and Text first, a card override, answer hierarchy/support, rarity/Prestige, themes, Reduced Motion/Effects Off, browser profiles, portable round-trip and the unchanged 850 kB initial bundle gate are required.

**Acceptance evidence (12 October 2026):** a read-only clone of the current local profile (312 cards, two retained Anki snapshots, 86 reviews and 19 assets) traced source fields through the new resolver and shared Study renderer. Ciao and Buongiorno now use their retained English meanings as the task while keeping their source illustrations instructional; the name card uses retained `Focus = You are called…`; the woman card uses `Focus = She is…`; the gap card displays retained `Io ___ Marco.`; and the verb card uses retained `Question = I come` plus person/pronoun guidance. None expose the Italian answer. Artwork role and Auto/Image first/Text first policy are inert, inherited presentation metadata; hidden art remains in provenance/media, and explicit card presentation survives Anki repair. Portable format v9 retains card, deck and Design Set presentation settings while v8 remains readable.

Unit/domain passes **208/208**. The complete browser matrix passes **209/211** on its first final run; the two failures were the existing finite-animation sampling checks, and their unchanged Chromium/WebKit cases then passed **12/12** over three repeats. Dedicated language recall acceptance passes in Chromium, desktop WebKit and compact WebKit at 200% text. Production is **849.63 kB raw / 202.75 kB transfer**, below the unchanged 850 kB ceiling. The synced iPhone 17 Pro / iOS 26.5 packaged Study/navigation smoke passes **1/1 in 39.101 s**. Ignored evidence is under `.runtime/evidence/hr-language-recall-20261012/` and `.runtime/language-trace-20261012/`. Physical-device touch, VoiceOver, Dynamic Type and material/contrast acceptance remain pending.

## HR-ANKI-SEMANTIC-FIDELITY-01 + HR-COLLECTION-DETAIL-01 — completed bounded corrective milestone

Source: Will's 12 October 2026 front/back semantic-fidelity and Collection inspection request. The scope preserves concise collectible faces while accounting for every meaningful safe Anki template block and correcting Collection inspection layout/flip behavior. Collection Desk remains outside scope.

| ID | Title | Product area | Priority | Status |
| --- | --- | --- | --- | --- |
| HR-ANKI-FIDELITY-01A | Trace the real formal `Which “you”?` card end to end | Anki evidence | P0 | DONE |
| HR-ANKI-FIDELITY-01B | Add subject-neutral situation/prompt/task/hint/choice/art front semantics | Anki/content | P0 | DONE |
| HR-ANKI-FIDELITY-01C | Enforce complete front-template block coverage | Anki/content integrity | P0 | DONE |
| HR-ANKI-FIDELITY-01D | Keep collectible Answer faces to answer essentials | Study/design | P0 | DONE |
| HR-ANKI-FIDELITY-01E | Preserve supporting back content outside the card | Study/content | P0 | DONE |
| HR-ANKI-FIDELITY-01F | Handle FrontSide, answer boundaries and internal dividers structurally | Anki template engine | P0 | DONE |
| HR-ANKI-FIDELITY-01G | Enforce complete back-template block coverage | Anki/content integrity | P0 | DONE |
| HR-ANKI-FIDELITY-01H | Preserve safe headings, paragraphs, lists, tables, code and accepted media | Anki/security | P0 | DONE |
| HR-ANKI-FIDELITY-01I | Retain unclassified safe content under an Original card details fallback | Anki/compatibility | P0 | DONE |
| HR-ANKI-FIDELITY-01J | Retain source-block classification provenance | Anki/debugging | P0 | DONE |
| HR-ANKI-FIDELITY-01K | Keep Answer Support outside stable Study geometry | Study/responsive | P0 | DONE |
| HR-COLLECTION-DETAIL-01A | Correct Collection inspection responsiveness and top alignment | Collection/layout | P0 | DONE |
| HR-COLLECTION-DETAIL-01B | Add inert shared-renderer Recall/Answer inspection flip | Collection/interaction | P0 | DONE |

**Completion evidence (12 October 2026):** retained snapshot `anki-source-2072609220`, note GUID `26af5d2f4845d6d5`, places `A formal interaction with an unfamiliar adult` in `Prompt`, `Which “you”?` in `Focus`, and `Say it in Italian` in `Task`; qfmt renders all three. The former resolver selected `Task || Prompt`, so Task suppressed the answer-constraining situation. The subject-neutral projection now retains situation, primary prompt, task, hint, choices and instructional art independently. The matching afmt is interpreted through `FrontSide` plus the explicit `hr#answer` boundary; internal dividers remain safe structure rather than universal split points. Answer essentials stay concise while labelled safe headings, paragraphs, lists, tables and code render in lazy Answer Support; residual meaningful material is retained under `Original card details`. Source-block provenance records source → classification → destination.

A read-only real-profile audit covered formal and informal “Which you?”, asking a friend’s name, talking about a woman, phrase completion, a verb form, greeting, image-led and rich-back cards without mutating 86 retained reviews. Collection defaults to Recall, flips by pointer/touch/Enter/Space, resets on selection and writes no review/reward state. Its 1280×720 inspection grid top-aligns and has no horizontal overflow. Unit/domain **214/214** pass. The full browser matrix reached **208/213** before five superseded answer-first Collection assertions were corrected; the corrected cases pass **5/5** across Chromium, desktop WebKit and compact WebKit without weakened coverage. Production is **849.37 kB raw / 202.96 kB transfer**, below the unchanged ceiling. Packaged iPhone 17 Pro / iOS 26.5 Study/navigation smoke passes **1/1 in 39.657 s**. Ignored evidence is under `.runtime/evidence/hr-anki-semantic-fidelity-01/` and `.runtime/language-trace-20261012/`.

## Preserved completed history

The detailed acceptance evidence for these items remains in `docs/project-status.md`, `docs/architecture.md`, `docs/ios-readiness.md`, and `docs/anki-import.md`. They retain their original stable IDs and are not reopened by this milestone.

| IDs | Area | Status | Evidence / commits |
| --- | --- | --- | --- |
| HR-UX-01–15, HR-AUTH-01, HR-DESIGN-02, HR-GAME-01 | Study, motion, authoring and collection presentation | DONE | Evidence matrix in `project-status.md`; checkpoints through `5bdf7a4`. |
| HR-IOS-01–06 | Cross-platform web readiness | DONE for documented browser scope | Readiness matrix in `ios-readiness.md`; native gaps remain explicit. |
| HR-GOV-01–02 | Charter and agentic delivery | DONE | Charter integration and real delegate review at `958060f`–`d5d0c89`. |
| HR-IMPORT-01 / 01A–C | Bounded Anki import, worker, audio and mapping | DONE for documented compatibility subset | `anki-import.md`; implementation `52e60f7`, acceptance `3c1246b`, handoff `d5d0c89`. |
| HR-COM-01 | Non-enforcing entitlement seam | DONE | Development policy tests and architecture decision; no payment enforcement. |
| HR-PLAN-01 | Capability matrix | DONE | Capability matrix in `product-brief.md`; this milestone was its accepted next recommendation. |
