# CampusStay — Authentication UI polish and Android deep links

21 October 2026. Focused follow-up to H1.1; no backend or manager-onboarding implementation.

## Changes

- **Sign In:** subtitle now reads “Sign in to continue to CampusStay.” Existing layout, secure password field, bullet placeholder and visibility control are preserved.
- **Create Account:** card now reads “One account, more possibilities” / “Find student accommodation or apply to list your property with CampusStay.” Administrator approval remains enforced and explained later in manager onboarding. The submit label uses sentence case. Footer keeps prompt → link screen-reader order, centres the existing elements, and stacks naturally at narrow widths or enlarged text without truncation or a font-scaling cap.
- **Validation:** blank/whitespace-only name → “Enter your full name.”; blank email → “Enter your email address.”; malformed nonempty email → “Enter a valid email address.”; password shorter than eight characters → “Use at least 8 characters.”; empty confirmation → “Confirm your password.”; mismatch → “Passwords do not match.” Passwords are not trimmed or logged. Existing errors update on correction, including a confirmation mismatch corrected by editing the original password. Valid field values stay intact.
- **Forgot Password:** existing Ionicons `key-outline` replaces the decorative bell. Description now reads “Enter the email address linked to your CampusStay account. We'll send you a link to reset your password.” Placeholder is `you@example.com`. The existing KeyboardForm, scroll owner, safe-area padding, keyboard props and Android resize mode are preserved. Result messaging still avoids confirming whether an account exists.
- **Android:** added one `VIEW` / `DEFAULT` / `BROWSABLE` intent filter with `android:scheme="campusstay"` to the existing `.MainActivity`. Existing launcher filter, `singleTask`, `adjustResize`, application ID, permissions, metadata and file line endings remain intact.

No guest access, manager permissions, account-service replacement, dependency changes, database work, private-document changes or photo-ownership changes were introduced. Existing controller busy guards still prevent duplicate registration requests; the new regression test drives the screen against that real controller with a mocked transport.

## Native warning: cause, proof and build requirement

`app.json` already declares `scheme: "campusstay"`. `app.config.js` returns that configuration unchanged after its production validation. The existing generated Android manifest had only a launcher filter on MainActivity. Its `https` entry is under `<queries>` (outbound package visibility), which does not register an inbound app callback. The native project was stale relative to Expo configuration.

The installed SDK 57 Expo CLI obtains native schemes using `AndroidConfig.Scheme.getSchemesFromManifest`. Before this fix it returned `[]`; after the filter was added, both that helper and the CLI's actual `getSchemesForAndroidAsync` return `["campusstay"]`. Tests also exercise Expo's existing scheme config plugin against a launcher-only manifest, confirming the unchanged Expo configuration generates the expected scheme for future native generation. No prebuild/regeneration command was run.

Both existing callback destinations remain unchanged:

```text
campusstay://auth/confirm
campusstay://auth/recovery
```

The native filter receives the scheme; the existing H1.1 parser restricts the host to `auth`, accepts only `/confirm` and `/recovery`, and requires the expected PKCE callback data. Receiving a URI does not itself authenticate a user or grant a role.

**A new Android APK is required.** Editing a manifest or restarting Metro does not update an installed package's registered intent filters. Expo documents the [native build requirement for custom schemes](https://docs.expo.dev/linking/into-your-app/#add-a-custom-scheme-in-app-config); Android documents [intent-filter matching and entry points](https://developer.android.com/guide/components/intents-filters). No new APK was built or installed in this task.

The `/android/` tree remains Git-ignored exactly as found. Its local manifest is fixed, and `docs/android-auth-intent-filter.patch` records the exact native delta for review/recovery without changing Git tracking or overwriting native customizations. The patch is **already applied here**; its reverse dry-run check passes. Future native generation uses the existing `app.json` scheme. Do not apply the patch again to a manifest that already contains the filter.

## Floating grey gear / development tools

Inspection of `App.tsx` and application components found no floating grey gear control. The manager's ordinary Settings row remains unrelated product UI. No application code directly imports an inspector, DevMenu or floating developer widget; `expo-dev-client` was not added.

The app uses the existing `expo/AppEntry.js` entry. Its installed `registerRootComponent` applies Expo's dev-tools wrapper only when `NODE_ENV !== 'production'`; a behavioral test executes both branches and verifies production receives the original component without the wrapper. The installed native `ExpoReactHostFactory` defaults developer support to React Native's debug build flag.

This supports a development-runtime/host-overlay explanation, but the **exact grey gear's provider cannot be confirmed without a screenshot or working runtime**. No required development tools were removed. A production/release APK visual check remains necessary; an Expo Go or debug-host overlay is not proof of a control in the shipped app.

## Checks and actual results

| Check | Result |
| --- | --- |
| New `scripts/auth-ui-links.test.cjs` cases | 20 passed, including registration edge cases/corrections, duplicate request prevention, password visibility/error presentation, nine footer width/text-scale cases, shared Forgot Password copy/layout, scheme generation/native discovery and production dev-wrapper exclusion. |
| New cases plus relevant existing auth/storage, error-quality, Phase F, UI component and keyboard regressions | **149 passed**, 0 failed/skipped/cancelled. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed, zero warnings. |
| Native SDK/CLI configuration inspection | Before `[]`; after `["campusstay"]`. Reads native configuration only, not a device. |
| Manifest XML and existing Expo source configuration | Parsed successfully; application ID `com.campusstay.app`, global scheme `campusstay`, Android resize behavior preserved. |
| Native patch dry-run | `git apply --reverse --check -- docs/android-auth-intent-filter.patch` passed. |
| Git diff / preservation | Whitespace checks passed; index unchanged; no original source file removed; other inspected native files unchanged. |
| Android native intent resolution / fresh keyboard pixels | **Blocked.** One bounded ADB check returned `could not read ok from ADB Server`, `failed to start daemon`, and `cannot connect to daemon`. No repeated daemon/emulator restarts, reset or reinstall was attempted. |
| Live sign-in, confirmation/resend and recovery callbacks | Not tested against the configured project. Existing tests use mocked transport and synthetic values. No `.env.local` values were read, printed or changed. |
| iOS native/runtime and production APK visuals | Not performed. Width/text-scale tests are headless layout contracts, not on-device visual or spoken-accessibility verification. |

No export was used as native deep-link evidence. The existing Android keyboard mechanism is unchanged and its automated regressions pass; prior device verification is not presented as a fresh runtime check of the longer copy.

## Exact files changed

1. `src/auth/account.ts` — registration-only validation copy/conditions.
2. `src/screens/LoginScreen.tsx` — shared-login subtitle.
3. `src/screens/RegisterScreen.tsx` — card copy, live error correction, sentence-case submit label and footer spacing/responsiveness.
4. `src/screens/ForgotScreen.tsx` — existing key icon, shared-account description and placeholder.
5. `android/app/src/main/AndroidManifest.xml` — six-line local native filter addition; remains ignored.
6. `scripts/auth-h1.test.cjs` — select the sentence-case registration submit button explicitly.
7. `scripts/error-quality.test.cjs` — same label/selector update.
8. `scripts/auth-ui-links.test.cjs` — new focused behavioral tests. The actual-native-file case is explicitly skipped in environments without a generated Android project; configuration generation still runs there. It ran and passed locally.
9. `docs/android-auth-intent-filter.patch` — portable review artifact for the native delta.
10. `docs/auth-ui-and-android-links.md` — this report and remaining verification steps.

Authentication client/controller, callback constants/parser behavior, role guards, app/package configuration, shared Input/KeyboardForm, theme tokens, native document module, gallery ownership and dependencies are unchanged. No commit, push, reset, clean, staging or discard was performed. Ignored evidence/snapshots and the task-only diff are in `.expo/auth-ui-links/`; environment files were excluded from snapshots.

## Remaining rebuild and manual checks

Use the existing native project. These commands are **manual steps, not completed results**. They do not regenerate native sources or clear app data.

```powershell
Set-Location C:\Users\mudau\Documents\GitHub\expo-campusstay\android
.\gradlew.bat :app:assembleDebug
Set-Location ..
adb devices -l
adb -s emulator-5554 shell echo campusstay-link-ready
adb -s emulator-5554 install -r -t android\app\build\outputs\apk\debug\app-debug.apk
adb -s emulator-5554 reverse tcp:8081 tcp:8081
npm start
```

Run ADB only after its daemon/device connection is healthy. Use the intended connected device serial if different. `install -r` is a data-preserving update with a matching signature. If installation reports a signature/storage error, stop and investigate; do not uninstall, reset or clear data. Retain the real project configuration locally without copying credentials into logs or this report.

In a second terminal, verify **implicit** native resolution (no explicit activity/component that would bypass the filter):

```powershell
adb -s emulator-5554 shell cmd package resolve-activity --brief -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "campusstay://auth/confirm"
adb -s emulator-5554 shell cmd package resolve-activity --brief -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "campusstay://auth/recovery"
adb -s emulator-5554 shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "campusstay://auth/confirm"
adb -s emulator-5554 shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "campusstay://auth/recovery"
```

Expected resolver: `com.campusstay.app/.MainActivity`. If an activity-management command hangs, interrupt that client and stop the attempt; do not repeatedly restart the emulator. The bare URLs above contain no auth code: they test OS routing and should remain safely blocked as incomplete account links. They do **not** verify an email, reset a password, or prove live authentication.

Then perform real mailbox tests on the installation that initiated signup/recovery: confirmation, resend/rate limits, cold/warm callbacks, expired links, recovery/save/sign-out and failed requests. Never copy one-time codes or tokens into command logs. Check manager approval restrictions remain intact.

Finally verify on a phone/emulator at standard and enlarged text: footer wrapping/reading order; all four validation borders/messages; correcting password mismatch; toggling visibility without changing values; and Forgot Password email/button above the keyboard. Verify production/release UI separately for absence of development overlays.

Stopped after this focused refinement. No live authentication, native intent execution, release UI or iOS runtime success is claimed.
