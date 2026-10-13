# Phase 1 verification — 12 October 2026

Scope: reproducible Expo SDK 57 baseline, configuration/API fixes, navigation
compatibility, startup handling, lint/typecheck/CI. No backend or feature systems
were implemented. Existing package.json duplicate-entry removals were preserved.
The domain fixtures and design tokens are unchanged.

## Changes

- Rebuilt the lockfile with normal npm peer resolution, then clean-installed it.
  Manifest ranges, lock entries and all directly installed versions agree.
- Retained SDK 57 at Expo 57.0.28 / React 19.2.3 / React Native 0.86.3.
  Native modules follow Expo's SDK map and compatibility checker. See README
  for all locked versions and official compatibility references.
- Aligned TypeScript 6.0.3 / React types 19.2.18 with the SDK 57 template;
  removed deprecated baseUrl and kept strictness and the relative @/* alias.
- Migrated navigation to v7 for Screens v4, introduced composite tab/root types,
  removed navigation/component any casts, and made nested-tab return paths explicit.
- Replaced six removed absoluteFillObject references with absoluteFill; removed
  the unused private Expo import. Kept Reanimated with SDK-compatible Worklets;
  Expo's Babel preset handles its plugin.
- Added a visible font-loading screen, error logging and a ten-second timeout
  that allows the original Splash/onboarding flow to continue with native font fallback.
  Splash uses the supported useAnimatedValue hook and cleans up its animation/timer.
- Added typecheck, zero-warning Expo lint, baseline tests and verification scripts,
  Node 24 guidance, README and CI. Unused imports were removed and three JSX
  apostrophes escaped without changing displayed text or formatting whole files.
- Removed obsolete app.json splash configuration; the existing splash plugin
  retains its navy background. Ignored .expo/dist and stopped tracking two .expo
  cache files while retaining their local copies.

## Actual results

| Check | Result |
| --- | --- |
| Clean npm ci | Passed; 785 packages, without force or legacy-peer-deps. |
| Final npm ci --offline --no-audit --no-fund | Passed from cached packages after the final dependency ranges/lockfile were set. |
| npm run typecheck | Passed with strict TypeScript; no diagnostic suppression. |
| npm run lint | Passed with zero warnings. |
| npm run test:baseline | 5 passed: loading/timeout cleanup, loaded/error/timeout startup, nested status routes. Native modules are mocked. |
| npm run check:dependencies | Passed: dependencies are up to date. Online check, not the audit's unreliable offline-only check. |
| npm run doctor | 21/21 passed after the clean install. |
| npm run export:check, CI=1 | Passed for Android and iOS, including Hermes .hbc outputs and 61 assets. The script caps Metro at two workers. |
| Manifest/lock/installed comparison | All direct packages agree and satisfy manifest ranges. |
| git diff HEAD --check | Passed. |
| Domain/theme comparison | No changes to src/data.ts or src/theme.ts. |

## Android runtime observations

Pixel_5 headless emulator, Expo Go 57.0.9. Observed Onboarding → Login, the reset
screen's return to Login, entry to all six student tabs, Property About/Rooms/Reviews,
the existing Apply steps → AppStatus, return to Messages, Chat display, booking
details → AppStatus → Bookings, Profile logout, all five Manager panels and exit
to Login. These are UI/navigation checks against the existing fixtures, not
authentication, real submission, messaging delivery or booking tests.

The first connection attempts failed before application execution: Windows Metro
bound localhost to IPv6 ::1 while Expo Go used IPv4. A localhost-only process with
Node's --dns-result-order=ipv4first and ADB forwarding resolved the connection;
no LAN listener was used. Test Metro/emulator processes and forwarding were cleaned up.

## Limits and diagnostics

- No iOS simulator/device execution: this is a Windows host. iOS export success
  is not proof of iOS runtime behavior. No standalone native build was tested.
- Font failure/timeout paths were tested with mocked native modules; normal font
  startup was exercised on Android. Failure rendering on iOS remains unverified.
- Registration return, Compare and Notifications were typechecked/bundled but
  not included in the Android interaction sequence above.
- The new GitHub workflow has not been executed on GitHub.
- An initial export hit sandbox permissions when Hermes wrote its temporary
  bytecode; an approved run succeeded. A later Windows spawn UNKNOWN retry was
  diagnosed with a successful direct Hermes launch, and the final two-worker
  export passed. Its underlying transient process-launch cause is unconfirmed.
- npm emits deprecation notices for ESLint 9 and transitive uuid 7. ESLint 9 is
  retained because the current Expo lint stack's React plugin declares support
  through ESLint 9, not 10. No peer conflicts were concealed.
- No dependency vulnerability audit or production security review was performed.

Phase 1 is complete. Backend and feature implementation remain out of scope.
