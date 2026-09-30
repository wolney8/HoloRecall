# iOS readiness

This is the maintained cross-platform evidence matrix. “WebKit verified” means Playwright's patched WebKit build on this Mac. It does not mean Safari, WKWebView, an iOS simulator or a physical iPhone was tested.

## Current toolchain constraints

- Web application: Angular 21.2.24, Angular Material/CDK 21.2.14, TypeScript 5.9.3, Node 24.3.0 and npm 11.4.2.
- Browser gate: Playwright 1.63.0 with repository-local Chromium and WebKit 26.6 build 2359 on macOS arm64.
- Proposed native baseline: stable Capacitor 8, whose official requirements are Node 22+, Xcode 26+ and iOS 15+. Capacitor is not installed and no native project exists. Capacitor 9 is prerelease and is not selected.
- Native build tools, signing identity, provisioning, bundle ownership, simulator runtime and physical devices have not been checked.

## Readiness matrix

| Area | Web implementation | Chromium evidence | WebKit evidence | Native implementation needed | Simulator | Physical device |
| --- | --- | --- | --- | --- | --- | --- |
| Study and scheduling | Atomic IndexedDB review/session transaction; pure TypeScript FSRS/reward rules | Chromium 153 journey and domain suites pass | WebKit 26.6 reveal/rate/reload, stale save and deduplication pass | Durable native store adapter and lifecycle hookup | Not tested | Not tested |
| Lifecycle and active time | Shared visibility/page/focus source pauses timing and effects, checkpoints, refreshes and cleans up | Chromium interruption/reload passes | WebKit interruption/reload passes | Bind Capacitor App state events to the same port | Not tested | Not tested |
| Card motion/effects | Shared CSS/Web Animations renderer and page-reveal observer; reduced motion/effects controls; interrupted motion settles without replay | Intermediate flip/effect/page-entrance assertions pass | Seven overlay tiers, flip, confidence/results/page-entrance motion and reduced motion pass | Profile WKWebView compositing and app backgrounding | Not tested | Not tested |
| Layout/input/a11y | Safe-area owners, visual-viewport focused-field recovery, touch sizes, semantic controls and text zoom | Desktop/390 px and keyboard checks pass | Compact/large portrait, landscape and 200% text checks pass | VoiceOver, Dynamic Type, software keyboard and real safe areas | Not tested | Not tested |
| Content/media storage | Stable `asset:` IDs, bounded raster bytes, ImageBitmap/Image decode paths and atomic snapshot | Upload/reload/backup pass | Design upload/reload, all illustrations and ZIP media decode pass | SQLite records plus Filesystem media; crash-safe coordinated migration | Not tested | Not tested |
| XLSX/ZIP exchange | Platform-neutral package generation; `FileDelivery` handles web download; atomic preview/apply | Round trips, download and formula rejection pass | XLSX/ZIP round trips, download, media and formula rejection pass | Document picker/security-scoped URI handling, temporary files, share sheet and cancellation | Not tested | Not tested |
| Anki package import | Lazy local ZIP/zstd/SQLite parser, bounded inert conversion and atomic content apply | Genuine Anki 26.9.3 legacy/modern packages cover Basic, reversed, cloze and bundled image media; browser apply/reload passes | The content apply/reload journey passes in desktop WebKit; genuine package parsing is domain-tested in the same JavaScript runtime | Native document URI/cancellation and memory-pressure profiling; audio, custom field mapping and Worker gaps remain in the compatibility matrix | Not tested | Not tested |
| Offline | Bundled font, UI and demonstration art; loaded-page study works offline | Active loaded-page recovery passes | Active loaded-page review/reload passes | Packaged assets should cold-start offline after native build verification | Not tested | Not tested |
| Themes | Local early-paint preference plus IndexedDB preference | Light/Dark/System persistence passes | System/explicit themes and reduced motion pass | Status/splash bars and native appearance integration | Not tested | Not tested |

## Native durability proposal

Keep IndexedDB for the working browser prototype. For native packaging, select a maintained Capacitor-compatible SQLite provider for the validated structured snapshot/event model and store raster media/design bytes in the app's durable data directory. Preserve stable asset IDs and resolve them through a media port; never persist temporary share URLs or absolute device paths in deck content.

A native migration must be versioned, atomic and recoverable: verify the source snapshot, write the new database and media into a staging location, validate a read-back and backup export, then switch the active version. Retain a recovery marker/source backup until the new store has opened successfully after restart. Restore must continue refusing to overwrite a nonempty profile silently. Local native persistence does not imply cloud sync.

## Native file and lifecycle requirements

- File import must handle picker cancellation, security-scoped/content URIs, in-place versus copied files, size checks before full reads where possible, and cleanup of temporary copies.
- Export must generate the same bytes as web, write a temporary/cache file, invoke Files/share, distinguish cancellation from success where the plugin permits, and remove temporary files after the consumer is finished.
- Capacitor App foreground/background events must drive the lifecycle port. Accepted transactions are saved before feedback; app-close callbacks are never the sole save path.
- Each plugin requires a version/maintenance/licence review, privacy manifest and `Info.plist` usage-description audit. Signing, provisioning, app identifiers and Apple services remain unprovisioned.

## Offline meanings

- **Loaded web page:** supported and tested for Study after the page and assets have loaded.
- **Cold web start offline:** unsupported; there is no service worker, and none is added solely for a checklist.
- **Future installed native start offline:** intended because compiled assets are packaged, but unverified until a native build launches without a development server.

## Change review note

For each meaningful change, add a proportional note to the durable handoff covering WebKit/Capacitor compatibility, touch/safe areas/keyboard/accessibility, persistence/offline/interruption, animation cleanup, browser APIs requiring native work, tests run and unverified native behavior.

## Current gate evidence

- Engines: Playwright 1.63.0, Chromium 153.0.8010.12 and patched WebKit 26.6 build 2359 on macOS arm64.
- Desktop suites contain 46 Chromium and 46 WebKit journeys. The final combined run passed all 101 tests: 46/46 Chromium, 46/46 desktop WebKit and 9/9 WebKit phone-profile checks across iPhone SE, iPhone 15 Pro Max portrait and landscape presets. These presets provide viewport/touch/browser-engine evidence only.
- Unit/domain suite: 70/70 passed. Production Angular build passed at 786.32 kB initial with the 800 kB warning budget and heavy exchange/SQLite code lazy-loaded.
- WebKit motion evidence: `test-results/hr-ios-webkit-evidence-20260930/` contains two short videos (compact reveal and results progress) plus `motion-review.png`. The directory is ignored test output, not a product fixture.
- Shared page-motion evidence: `test-results/hr-ux-12-evidence-20260930/` contains inspected Chromium and WebKit recordings covering multiple non-Results pages. Tests sample active intermediate states rather than treating settled screenshots as motion proof.
- Observed and fixed: WebKit startup did not consistently report `document.hasFocus()`, so active-time state now starts from visibility and follows explicit focus/blur events. Cancelling a flip on backgrounding now settles the shown face to persisted reveal state. Backgrounding Results settles its presentation run so delayed observers/timers cannot reveal content later.
- Not run: Safari, WKWebView, an iOS simulator, a physical iPhone, VoiceOver, Dynamic Type, a software keyboard, real safe-area cutouts and native file/lifecycle/storage integrations.
