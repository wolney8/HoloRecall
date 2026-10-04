# Web and native-platform readiness

This retains the project's iOS-readiness history and is the canonical evidence matrix for Web, iOS/iPadOS, Android and Apple-silicon Mac. Intel Mac is not planned. “WebKit verified” means Playwright's patched WebKit build on this Mac. It does not mean Safari, WKWebView, an iOS Simulator, Android WebView, an emulator, a physical device or a native Mac run was tested.

## Current toolchain constraints

- Web application: Angular 21.2.24, Angular Material/CDK 21.2.14, TypeScript 5.9.3, Node 24.3.0 and npm 11.4.2.
- Browser gate: Playwright 1.63.0 with repository-local Chromium and WebKit 26.6 build 2359 on macOS arm64.
- Native baseline: pinned Capacitor core/CLI/iOS/Android 8.5.2, App 8.1.2, Filesystem 8.1.4, Haptics 8.0.2 and Share 8.0.3. Capacitor 8 requires Node 22+, Xcode 26+ and iOS 15+. The generated Android baseline is minSdk 24, compile/target SDK 36, AGP 8.13.0, Gradle 8.14.3 and Java 21. Both native projects sync `dist/holorecall/browser`; Capacitor 9 prerelease is not selected.
- Host: macOS 26.5.1 on Apple M1 Pro (`arm64`), Command Line Tools 26.3, Node 24.3.0 and npm 11.4.2. Full Xcode, `xcodebuild`, `simctl` and Simulator runtimes are absent. Signing identity, provisioning, Apple account, bundle ownership and physical devices were deliberately not configured.
- Android host audit: hardware virtualization is available. Android Studio, Android SDK, `sdkmanager`, `avdmanager`, emulator, selected Java/JDK and Gradle are absent. A standalone SideQuest `adb` 35.0.1 exists but is not a development SDK and reports no device. Install Android Studio 2025.2.1+ with its bundled Java 21, SDK platform/tools 36 and chosen emulator images before native Android acceptance; no automatic installation was attempted.

## Supported-platform compatibility policy

| Platform | Minimum supported | Target / tested OS | Simulator or emulator evidence | Physical-device evidence | Known limitation |
| --- | --- | --- | --- | --- | --- |
| Web | Current supported Chromium/WebKit browsers; exact release floor pending release policy | Chromium 153 and patched WebKit 26.6 on macOS arm64 | Not applicable | Browser evidence only | Cold offline start is not supported without an installed native package |
| iPhone / iPad | iOS/iPadOS 15+ for Capacitor 8; do not raise without plugin/security evidence | SDK target unverified because full Xcode is absent | **BLOCKED** | **BLOCKED / not tested** | Xcode 26+ and Simulator runtimes required |
| Android phone/tablet | API 24 / Android 7+ | compile/target 36 generated; no runtime tested | **BLOCKED** | **BLOCKED / not tested** | Android Studio/JDK/SDK/images required; test API 24, a middle API and current API 36 when images exist |
| Apple-silicon Mac | Compatible iPhone/iPad app; macOS release floor pending Xcode evidence | macOS 26.5.1 host only | **BLOCKED** (`My Mac (Designed for iPad)`) | **BLOCKED / not tested** | Intel Mac is not planned; desktop acceptance still required |

## Four-target evidence summary

| Capability | Web | iOS/iPadOS | Android | Apple-silicon Mac |
| --- | --- | --- | --- | --- |
| Startup | IMPLEMENTED / BROWSER VERIFIED | Shell IMPLEMENTED; runtime BLOCKED | Shell IMPLEMENTED; build/emulator BLOCKED | Route selected; runtime BLOCKED |
| Persistence / Study / Focus | IMPLEMENTED / BROWSER VERIFIED | Architecture ready; native durable store and runtime BLOCKED | Architecture ready; native durable store and runtime BLOCKED | Follows iOS candidate; native verification BLOCKED |
| Haptics | NOT APPLICABLE on desktop web; safe no-op | IMPLEMENTED adapter; Simulator/device BLOCKED | IMPLEMENTED adapter; emulator/device BLOCKED | Intentionally no-op unless future Mac evidence supports it |
| Audio / media / card effects / results | IMPLEMENTED / BROWSER VERIFIED | Native verification BLOCKED | Native verification BLOCKED | Native verification BLOCKED |
| Anki, XLSX/ZIP, backup | IMPLEMENTED / BROWSER VERIFIED | Files/share adapters PARTIAL; picker/runtime BLOCKED | Files/share adapters PARTIAL; picker/runtime BLOCKED | Native files/share BLOCKED |
| Offline packaged startup / lifecycle | Loaded-page web verified; cold web start unsupported | Packaged intent and App adapter IMPLEMENTED; runtime BLOCKED | Packaged intent and App adapter IMPLEMENTED; runtime BLOCKED | Runtime BLOCKED |
| Accessibility / layouts | BROWSER VERIFIED for keyboard/touch/reflow/reduced motion | VoiceOver/Dynamic Type/device safe areas BLOCKED | TalkBack/font scale/system bars/device layouts BLOCKED | Full Keyboard Access/resizing/native accessibility BLOCKED |
| Distribution | Web deployment outside this milestone | NOT IMPLEMENTED; no signing/store resources | NOT IMPLEMENTED; no signing/store resources | NOT IMPLEMENTED; compatible iOS/iPad app route only |

## Readiness matrix

| Area | Web implementation | Chromium evidence | WebKit evidence | Native implementation needed | Simulator | Physical device |
| --- | --- | --- | --- | --- | --- | --- |
| Study and scheduling | Atomic IndexedDB transaction; platform-neutral schema-6 presets, Focus criteria/session modes, separate Practice events, queue, FSRS/reward and management-history rules | Chromium 153 scheduled/practice isolation, Focus/reload/results plus established Study gates pass | WebKit 26.6 Focus, consecutive-card visibility, audio and established Study gates pass | Injectable persistence seam and fixture migration contract exist; durable SQLite/filesystem provider and native audio/timer evidence remain | Blocked: full Xcode absent | Not tested |
| Lifecycle and active time | Shared visibility/page/focus source pauses timing and effects, checkpoints, refreshes and cleans up; native App adapter is lazy and resume reads wait for queued writes | Chromium interruption/reload plus adapter unit tests pass | WebKit interruption/reload passes | Official App listener implementation exists; actual native transitions remain to verify | Blocked: full Xcode absent | Not tested |
| Card motion/effects | Shared CSS/Web Animations renderer and page-reveal observer; reduced motion/effects controls; interrupted motion settles without replay | Intermediate flip/effect/page-entrance assertions pass | Seven overlay tiers, flip, confidence/results/page-entrance motion and reduced motion pass | Profile WKWebView compositing and app backgrounding | Not tested | Not tested |
| Layout/input/a11y | Safe-area owners, visual-viewport focused-field recovery, touch sizes, semantic controls and text zoom | Desktop/390 px and keyboard checks pass | Compact/large portrait, landscape and 200% text checks pass | VoiceOver, Dynamic Type, software keyboard and real safe areas | Not tested | Not tested |
| Content/media storage | Stable `asset:` IDs; IndexedDB v2 metadata/payload stores; recomputed hashes, dedupe and reference-safe cleanup | Upload/reload/backup, unchanged-payload commit, migration interruption fixtures and portable media pass | Design upload/reload, all illustrations and ZIP media decode pass | SQLite records plus Application Support media; on-demand resolver; candidate transaction/relaunch proof | Blocked: full Xcode absent | Not tested |
| Library search/organisation | Reconstructable Worker index, 60-item slices, hierarchy/tags/archive, combined filters and atomic bulk changes | 10,000-card index/query/render and navigation checks pass | 10,000-card index/query/render plus compact/large/landscape 200% reflow pass | Profile Worker/storage boundary in WKWebView; bind queries to native durable store | Not tested | Not tested |
| XLSX/ZIP exchange | Platform-neutral package generation; `FileDelivery` handles web download and lazy native Cache + Share delivery; atomic preview/apply | Round trips, download, formula rejection and native adapter byte/cleanup tests pass | XLSX/ZIP round trips, download, media and formula rejection pass | Files picker/security-scoped URI handling and real share cancellation/reopen | Blocked: full Xcode absent | Not tested |
| Anki package import | Lazy typed Worker runs bounded ZIP/zstd/SQLite conversion, semantic issue severity, inert TTS/filter simplification, explicit hierarchy/sibling identity, reviewed mappings, PNG and side-specific MP3/WAV; atomic content-only apply selects a HoloRecall preset and preserves native progress on reimport | Genuine Anki 26.9.3 legacy/modern packages plus TTS/link/resource regression fixtures cover the documented conversion and hierarchy | The same severity/hierarchy and consecutive imported-card Study journeys pass in desktop Playwright WebKit | Native document URI/cancellation, media playback and memory-pressure profiling | Not tested | Not tested |
| Offline | Bundled font, UI and demonstration art; loaded-page study works offline; native config has no `server.url` | Active loaded-page recovery passes | Active loaded-page review/reload passes | Terminate/offline/relaunch/study/read-back proof | Blocked: full Xcode absent | Not tested |
| Themes | Local early-paint preference plus IndexedDB preference | Light/Dark/System persistence passes | System/explicit themes and reduced motion pass | Status/splash bars and native appearance integration | Not tested | Not tested |

## macOS readiness matrix

| Area | Current evidence | Native macOS implementation / decision still needed |
| --- | --- | --- |
| Browser application | Angular application and Playwright Chromium/WebKit execute on macOS arm64; keyboard, responsive layout and local file inputs are browser evidence | Define supported Safari/macOS versions and complete release accessibility testing |
| Desktop packaging | Route A is recommended: the same iPad-capable iOS app on Apple-silicon Mac. No local native Mac execution exists because Xcode is absent. | Test `My Mac (Designed for iPad)` resizing, keyboard/pointer, files, storage, offline and plugins; distribution remains pending. Catalyst and a dedicated wrapper are deferred. |
| Storage and recovery | Split IndexedDB metadata/media, content ZIP and full JSON backup work in tested browsers | Select durable sandbox storage, on-demand asset resolution, coordinated migration, backup location and crash recovery for any native shell |
| Files and sharing | Browser picker/download through `FileDelivery`; package bytes remain platform-neutral | Native open/save panels, security-scoped URLs, cancellation, temporary-file cleanup and share behavior |
| Lifecycle/audio/motion | Visibility lifecycle and explicit audio cleanup pass in browser engines | Verify native window/background behavior, media session/audio interruptions and resource pressure |
| Accessibility/input | Semantic controls, keyboard, touch targets, reflow and reduced motion are browser-tested | VoiceOver, Full Keyboard Access, macOS text/contrast settings, pointer/trackpad and window resizing |
| Purchases/licensing | Only an allow-all, unverified development capability policy exists | Decide Mac distribution and purchase restoration/account linking; no provider or entitlement proof exists |

## Native durability proposal

Keep IndexedDB for the working browser prototype. For native packaging, select a maintained Capacitor-compatible SQLite provider for the validated structured snapshot/event model and store raster media/design bytes in the app's durable data directory. Preserve stable asset IDs and resolve them through a media port; never persist temporary share URLs or absolute device paths in deck content.

A native migration must be versioned, atomic and recoverable: verify the source snapshot, write the new database and media into a staging location, validate a read-back and backup export, then switch the active version. Retain a recovery marker/source backup until the new store has opened successfully after restart. Restore must continue refusing to overwrite a nonempty profile silently. Local native persistence does not imply cloud sync.

The production provider has not changed. `StudyPersistence` is now injectable and defaults to IndexedDB. The isolated migration contract proves hashed-backup retention, deterministic fingerprinting, read-back counts/media verification, idempotent completion and rollback after injected interruption. It does not prove SQLite, process-relaunch durability or native filesystem atomicity. Candidate evaluation currently favors an isolated `@capacitor-community/sqlite` 8.1.1 spike, with SQLCipher/export review and Catalyst behavior unresolved; no SQLite package is installed.

## Native file and lifecycle requirements

- File import must handle picker cancellation, security-scoped/content URIs, in-place versus copied files, size checks before full reads where possible, and cleanup of temporary copies.
- Export must generate the same bytes as web, write a temporary/cache file, invoke Files/share, distinguish cancellation from success where the plugin permits, and remove temporary files after the consumer is finished.
- Capacitor App foreground/background events must drive the lifecycle port. Accepted transactions are saved before feedback; app-close callbacks are never the sole save path.
- Each plugin requires a version/maintenance/licence review, privacy manifest and `Info.plist` usage-description audit. Signing, provisioning, app identifiers and Apple services remain unprovisioned.

## Native dependency and privacy inventory

| Package | Purpose / native API | Permissions and Apple declarations | Platforms / current evidence |
| --- | --- | --- | --- |
| `@capacitor/ios` 8.5.2 | WKWebView iPhone/iPad shell through SPM | No runtime permission added | iOS project generated/synced; compile blocked |
| `@capacitor/android` 8.5.2 | Android WebView phone/tablet shell | Manifest currently adds only normal `INTERNET`; no runtime permission | Android project generated/synced; Gradle build blocked by absent Java/SDK |
| `@capacitor/app` 8.1.2 | `appStateChange`, `pause`, `resume` | No usage description documented for these events | Lazy adapter and listener-cleanup unit evidence; native transitions blocked |
| `@capacitor/filesystem` 8.1.4 | Cache file for portable export | `PrivacyInfo.xcprivacy`: `NSPrivacyAccessedAPICategoryFileTimestamp`, reason `C617.1`; no broad file permission requested | Byte-write adapter unit evidence; native file proof blocked |
| `@capacitor/share` 8.0.3 | Apple share surface for the generated Cache file | No usage description/runtime permission documented for local file sharing | URI handoff/cleanup unit evidence; actual share/cancel/reopen blocked |
| `@capacitor/haptics` 8.0.2 | Semantic selection/impact/notification feedback | No runtime permission or usage description; Android vibration capability is handled by the plugin | Lazy central adapter and mapping tests; tactile quality and native invocation remain device/emulator pending |

No Photos, microphone, media-library, location, tracking or analytics SDK/permission was added. Android currently declares only the normal `INTERNET` permission plus the generated FileProvider; no dangerous runtime permission was added. `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` remain absent because exports use a temporary Cache file rather than exposing the app's Documents directory. Final Xcode privacy and Android merged-manifest/Play data-safety reviews remain pending.

## Retrospective portability audit

| Surface | Classification | Native work or verification still required |
| --- | --- | --- |
| Decks, Study, Focus/Practice, Session Complete, Collection, Progress/history, Search/filter, Study Settings | PORTABLE NOW; shared Angular/domain implementation | Native WebView layout/input/accessibility/performance; Android Back is adapter-backed but runtime unverified |
| Card/deck authoring and Design Studio | PORTABLE NOW with stable asset IDs | Replace/augment HTML picker delivery for native Files/content URIs; keyboard, memory and cancellation evidence |
| Anki import, XLSX/ZIP and backups | PLATFORM ADAPTER EXISTS for export; parser/package rules are platform neutral | Native document picking, URI copying, cancellation and large-file memory; generated export reopen through Files/share |
| Persistence and media registry | PLATFORM ADAPTER EXISTS; IndexedDB web provider only | Transactional native structured store, filesystem media provider, staged migration and relaunch proof |
| Audio/media | PORTABLE NOW at model/renderer level | Native URL translation, audio interruption/session policy, relaunch and physical speaker evidence |
| Themes and accessibility | PORTABLE NOW for web semantics and preferences | System bars, Dynamic Type/font scale, VoiceOver/TalkBack, software keyboard and device safe areas |
| Entitlement boundary | PORTABLE NOW and non-enforcing | Future verified store adapters, restore/revocation/account decisions; never infer ownership from a client flag |
| App chrome | NATIVE WORK REQUIRED | Replace generated icon/splash placeholders; verify status/navigation bars, edge-to-edge and orientation before release |

Evidenced debt stays explicit: native file import still begins with HTML inputs; native export currently materialises a complete Blob/base64 payload and needs bounded large-file work; media hydration remains eager for large native collections; `window.confirm` should eventually use a shared accessible confirmation surface. These do not justify rewriting working web flows during feasibility.

## Native application and release contract

- `package.json` is the authoritative product/web version. `npm run native:version` copies it to iOS `MARKETING_VERSION` and Android `versionName`; iOS build number and Android `versionCode` remain independent monotonic integers supplied to release automation later.
- Development and local-native testing use local data and no embedded secrets. Beta/internal testing will use TestFlight and Play internal testing only after separate authorisation. Production signing, store records, credentials, privacy declarations and release promotion remain future controlled work.
- iOS/iPadOS delivery is an Xcode-built, signed native application through TestFlight/App Store. Android delivery is a Gradle-built signed Android App Bundle through Play testing/production tracks. Apple-silicon Mac initially uses the compatible iPhone/iPad application after Mac acceptance. Intel Mac is not planned.
- The shared Angular/Material 3 application and domain core remain the product. Native adapters supply lifecycle, durable storage, files/share, haptics and other evidenced platform services; native shells are normal store-deliverable applications and do not require a SwiftUI/UIKit/Android-view rewrite.

## macOS delivery recommendation

Use the iPad-capable iOS application on Apple-silicon Macs as the first candidate. It reuses the iOS runtime, binary, plugins and entitlement seam and has the lowest maintenance burden. It is Apple-silicon-only, keeps an iPad/WebView interaction model and needs native evidence for resizable windows, pointer/keyboard, Files/share and every plugin. Mac Catalyst is deferred because it is not an official Capacitor target and cannot be assumed compatible. A dedicated wrapper is deferred unless Intel support receives product approval or Route A fails desktop acceptance. See Decision 008 in `architecture.md`.

## Offline meanings

- **Loaded web page:** supported and tested for Study after the page and assets have loaded.
- **Cold web start offline:** unsupported; there is no service worker, and none is added solely for a checklist.
- **Future installed native start offline:** intended because compiled assets are packaged, but unverified until a native build launches without a development server.

## Exact native acceptance checklist once Xcode is available

1. Run `npm run native:sync:ios`, compile the existing `ios/App/App.xcodeproj` without changing `webDir`, and record Xcode, SDK, Simulator runtime and device.
2. Launch in the Simulator and capture Decks → parent/child deck → Study → reveal → rating → next card → finish/exit → Collection → Progress/History → Settings. Sample the former disappearing-card transition after the deal settles.
3. Repeat System/Light/Dark, portrait/landscape, compact phone, software keyboard, scroll/modal, reduced motion, card flip/tilt, rarity overlay, confidence/results animation and a bundled MP3/WAV. Record VoiceOver separately if it is actually exercised.
4. Background during question timing, audio, Auto Advance, accepted-review save, confidence feedback and deal; confirm time freezes, audio/timers stop, presentation settles, and each review/reward exists exactly once after resume and relaunch.
5. With isolated data, import APKG, portable ZIP, XLSX and full backup through Files; cancel and submit invalid files without mutation. Export ZIP, XLSX and full backup through Share/Files, reopen each file and compare hashes.
6. Run the isolated SQLite candidate proof only: create/write, terminate/relaunch/read, update, forced transaction rollback and migration/user-version read-back. Never point it at `holorecall-local-v1` or real data.
7. Terminate the app, disable networking through a legitimate Simulator method, cold launch, study local cards, terminate/relaunch and verify the review. If network control is unavailable, record that blocker.
8. Run the same app through `My Mac (Designed for iPad)` and verify resizing, keyboard/pointer, file/share, media, storage and every plugin. Do not treat Simulator or Playwright WebKit as this evidence.

## Change review note

For each meaningful change, add a proportional note to the durable handoff covering WebKit/Capacitor compatibility, touch/safe areas/keyboard/accessibility, persistence/offline/interruption, animation cleanup, browser APIs requiring native work, tests run and unverified native behavior.

## Current gate evidence

- Apple feasibility: `cap add ios` and `cap sync ios` succeed with SPM and copy the real 13 MB production web output; `capacitor.config.json` contains no `server.url`. The production build after lazy native adapters is **848.60 kB initial / 199.05 kB estimated transfer**, below the unchanged 850 kB limit. Exact local environment, generation/sync and failed Xcode command logs are under `.runtime/evidence/hr-apple-native-20261004/`.
- Apple feasibility regression gate: native adapter/migration/persistence subset **34/34**; controlled unit/domain suite **141/141**; complete Chromium/Desktop WebKit/phone-profile Playwright **160/160**. The first parallel domain run had two resource-contention failures in pre-existing 10,000-card timing tests (3.47/3.79 s against 3.0 s); both passed individually and in the controlled full run. No browser result is counted as WKWebView or Simulator evidence.

- Engines: Playwright 1.63.0, Chromium 153.0.8010.12 and patched WebKit 26.6 build 2359 on macOS arm64.
- Focused Practice gate: unit/domain **128/128 passed**; complete desktop WebKit **63/63 passed**; complete Chromium produced **61/63** before two stale backup-version assertions were corrected, and both corrected tests then passed; WebKit compact/large/landscape **21/21 passed**. Targeted Focus journeys pass **3/3** in both desktop engines plus all three phone profiles. Practice remains separate from FSRS/rewards/allowance, and background/reload retains the explicit mode. These remain browser-engine and viewport results, not native app evidence.
- The final organisation gate passed **119/119**: 52 Chromium desktop, 52 desktop WebKit and 15 WebKit phone-profile checks across iPhone SE, iPhone 15 Pro Max portrait and landscape presets. These presets provide viewport/touch/browser-engine evidence only.
- Current Study gate: unit/domain **119/119 passed**; Chromium plus desktop Playwright WebKit **120/120 passed**; WebKit compact/large/landscape **18/18 passed**. This includes branch-attributed daily limits across intermediate/leaf subdecks, today-only reload/clear, review history, consecutive imported-card visibility, lifecycle/reduced-motion settlement, audio media interaction, portable backup, search and rewards. The phone profiles include 200% text and touch-sized viewport evidence; they are not physical-device evidence.
- Production Angular build passes at **847.67 kB initial / 198.69 kB estimated transfer**, below the unchanged 850 kB warning ceiling (before this milestone: 867.32 kB / 199.15 kB). Appearance/Material toggle and local backup/media tools were removed from startup; Study Settings is a 23.57 kB lazy chunk, while Focus, History, Exchange, the Anki Worker, library-index Worker, SQLite WASM, zstd, JSZip and spreadsheet code remain lazy. Eager Study/session recovery remains intact.
- Review-workflow closure evidence: unit/domain **132/132**, desktop Chromium/WebKit **136/136**, and WebKit compact/large/landscape **24/24** pass. Auto Advance remains default-off, never rates, pauses for lifecycle/audio, recovers paused, and uses owned finite timers; rejected media playback cannot strand it. Administrative undo rejects stale/ABA and partial-bulk reversals. These are browser-engine and viewport results, not Safari, WKWebView, simulator or physical-device verification.
- Local-library evidence: 10,000-card Chromium index/render **1,985 ms**, query/render **47 ms**; WebKit **1,096 ms** and **55 ms** on this Mac. Visible DOM is limited to 60 ordinary rows. These are desktop browser baselines, not native storage or device performance claims.
- Organisation recordings: `test-results/organisation-HR-ORG-01-*-chromium/video.webm`, matching WebKit search evidence, and HR-ORG-02 filter/navigation recordings in the corresponding directories. They are ignored test output, not fixtures.
- WebKit motion evidence: `test-results/hr-ios-webkit-evidence-20260930/` contains two short videos (compact reveal and results progress) plus `motion-review.png`. The directory is ignored test output, not a product fixture.
- Shared page-motion evidence: `test-results/hr-ux-12-evidence-20260930/` contains inspected Chromium and WebKit recordings covering multiple non-Results pages. Tests sample active intermediate states rather than treating settled screenshots as motion proof.
- Observed and fixed: WebKit startup did not consistently report `document.hasFocus()`, so active-time state now starts from visibility and follows explicit focus/blur events. Cancelling a flip on backgrounding now settles the shown face to persisted reveal state. Backgrounding Results settles its presentation run so delayed observers/timers cannot reveal content later.
- Charter/import evidence: real Anki 26.9.3 legacy and modern packages now cover custom fields and side-specific MP3 in addition to prior content. Both desktop engines pass mapping save/reload, playback-event, 10,000-card responsive cancellation, dark theme and 200% text checks. Compact/large/landscape WebKit profiles pass the enlarged mapping layout. Short recordings are under `.runtime/evidence/hr-charter-import-20260930/`.
- Not run: Safari, WKWebView, an iOS simulator, a physical iPhone, VoiceOver, Dynamic Type, a software keyboard, real safe-area cutouts and native file/lifecycle/storage integrations.
