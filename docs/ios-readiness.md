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
| Study and scheduling | Atomic IndexedDB review/session transaction; pure TypeScript FSRS/reward rules | Existing domain and journey suites pass | Pending gate | Durable native store adapter and lifecycle hookup | Not tested | Not tested |
| Lifecycle and active time | Visibility/focus events pause timing and checkpoint accepted work | Existing background/reload tests pass | Pending interruption test | Bind Capacitor App state events to the same port | Not tested | Not tested |
| Card motion/effects | Shared CSS/Web Animations renderer; reduced motion/effects controls | Intermediate flip/effect assertions pass | Pending visual checks | Profile WKWebView compositing and app backgrounding | Not tested | Not tested |
| Layout/input/a11y | Responsive Material 3 UI and semantic controls | Desktop/390 px and keyboard checks pass | Pending compact/large/landscape/text-size checks | VoiceOver, Dynamic Type, software keyboard and real safe areas | Not tested | Not tested |
| Content/media storage | Stable `asset:` IDs with validated raster bytes in current snapshot | Upload/reload/backup pass | Pending decode/recovery gate | SQLite records plus Filesystem media; crash-safe coordinated migration | Not tested | Not tested |
| XLSX/ZIP exchange | Domain package generation; atomic preview/apply; bounded input | Round trips and formula rejection pass | Pending exchange gate | Document picker/security-scoped URI handling, temporary files, share sheet and cancellation | Not tested | Not tested |
| Offline | Bundled font, UI and demonstration art; loaded-page study works offline | Active loaded-page recovery passes | Pending loaded-page check | Packaged assets should cold-start offline after native build verification | Not tested | Not tested |
| Themes | Local early-paint preference plus IndexedDB preference | Light/Dark/System persistence passes | Pending | Status/splash bars and native appearance integration | Not tested | Not tested |

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
