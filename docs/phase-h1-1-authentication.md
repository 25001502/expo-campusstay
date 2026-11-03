# Phase H1.1 — Shared authentication and onboarding

Implementation date: 21 October 2026. This milestone implements the mobile account client and guards. **No real Supabase project is configured in this checkout. Real account/email/native-device integration remains unverified.** No remote project, database, role, manager request, or deployment was created.

## Repository findings and resulting behavior

Previously, App opened Main directly. Login only validated fields, registration showed a local validation result, and password reset did not contact an account service. Login also linked directly to the illustrative manager workspace. No Phase H architecture document, Supabase environment file or existing trusted role model was found. No applicable AGENTS.md was found in the repository or inspected ancestors.

H1.1 replaces that guest entry with one account flow:

1. The auth provider checks the native session cache and asks Supabase `getUser(access_token)` to validate the identity and email confirmation. Cached user objects and URL parameters cannot open protected screens. Failure keeps the protected navigator closed and offers retry/sign-out.
2. Sign In uses Supabase email/password authentication. Create Account requires full name, email, password and confirmation. University, student number and phone are no longer registration requirements: accommodation managers use the same account system as students.
3. Signup waits for email confirmation. Resend, password reset requests and recovery updates reflect provider results; local validation never creates a successful account. Generic email feedback does not assert that an address exists or that mail was delivered.
4. Confirmed users choose **Find accommodation** or **List accommodation**. The choice is session-local intent, not a role. Find opens Student Home. List opens the manager-request placeholder. The same placeholder is available through **Profile → Become a Manager**; it creates no request or additional account.
5. Successful Profile sign-out uses Supabase's `local` scope, removes the signed-in navigation tree and clears the existing local owners. Cancellation and failed sign-out retain those owners. Failure is visible. Other devices are not signed out; the account is not deleted.

The six student tabs and their established navigation/layout are preserved behind authentication. Startup font fallback remains intact. Account screens retain the CampusStay navy/blue palette, Outfit/Inter fonts, rounded controls and existing KeyboardForm strategy. The old introductory slides remain registered publicly but now return to Login, never Home.

Profile/Security/privacy/FAQ copy now describes the account boundary truthfully. Personal-information editing and illustrative accommodation/application/message records remain local. Nothing migrates those fixtures into Supabase. The private student-document adapter, native module and attachment ownership lifecycle are unchanged; auth transitions use the providers' existing unmount cleanup.

## Supabase configuration still required

Use a project approved by the owner; this task did not create one or change its settings.

1. Copy `.env.example` to an ignored `.env.local` and set `EXPO_PUBLIC_SUPABASE_URL` to the HTTPS project origin and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its **publishable** `sb_publishable_…` key. H1.1 deliberately rejects legacy JWT keys and secret/service-role keys. No secret/admin/database/SMTP credentials belong in the mobile bundle or EXPO_PUBLIC variables. Restart Metro after changing configuration.
2. Enable Email/password and **Confirm email** in Supabase Auth. Keep anonymous sign-in disabled. The client checks the server-owned `email_confirmed_at`; it cannot prove email ownership if a server/operator auto-confirms accounts. An immediate session returned by signup is explicitly rejected as a completed confirmation journey and shows a configuration message.
3. Configure an appropriate Site URL and redirect allowlist for `campusstay://auth/confirm` and `campusstay://auth/recovery`. Retain the confirmation/reset templates that send users through Supabase verification and then the requested redirect. Do not replace them with a page that merely asserts verification. The parser also supports the SDK's optional `sb_flow_id` query parameter if multi-flow callbacks are enabled later. It currently uses the SDK's default single-flow PKCE behavior.
4. Configure/test email delivery and provider rate limits before real rollout. Confirm signup, resend and recovery messages on a real mailbox. Use the latest link on the same installation that started the request: PKCE verifiers are stored on that device. A link verified elsewhere can require signing in normally on the original device.
5. Produce an updated native development build with the `campusstay` scheme and new native dependencies/config plugin applied. Existing development binaries do not automatically gain native modules or URL scheme changes. Expo Go is not evidence of a standalone callback integration. Preserve/review any existing native work when applying app configuration; do not use destructive clean/reset commands.

Missing/invalid configuration creates no Supabase client. Sign-in and registration are disabled with a setup message, and Home cannot be opened through a guest button or public navigation route.

## Session, callback and storage design

- Supabase sessions and PKCE verifier slots use Expo SecureStore on native, with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. The SecureStore config plugin supplies its Android backup exclusion. No AsyncStorage/plaintext session fallback is used. Web previews hold auth data only in memory and do not promise restoration after a page reload.
- Session payloads are split into bounded encrypted entries to accommodate older Keychain size limits. Serial operations and a manifest commit protect a previously saved generation against partial writes. Corrupt/incomplete credentials fail closed; the pointer is invalidated so a later sign-out/retry can proceed. A crash during an encrypted generation write may leave unreferenced Keychain/Keystore chunks; these cannot restore a session and are not an attachment-store change.
- Supabase's PKCE flow uses cryptographic random values and SHA-256 through the Expo Crypto bridge when native WebCrypto is absent. A process lock serializes SDK Auth operations. The app handles cold/warm callbacks itself; it does not ask React Navigation to open arbitrary routes from email links.
- Only the exact `campusstay://auth/confirm` and `/recovery` callback paths are accepted. Token fragments, duplicate codes and malformed flow identifiers are rejected. Recovery is determined by the SDK's stored PKCE verifier, not by a caller putting `recovery` in a URL path. A successful password update signs out locally and requires normal sign-in.
- Network requests are bounded; auth operations have a 25-second upper wait and initial-link discovery a 3-second fallback. Duplicate submits are rejected. A callback arriving during an auth operation is queued. Epoch checks invalidate late work after timeout/disposal. SDK events are processed outside GoTrue's locked callback. Refresh validation failures close access.
- Authenticated frontend providers are keyed by user ID, preventing one account inheriting another account's in-memory records. Saved manager review metadata is cleared when identity changes. Onboarding intent is remembered only for the active JavaScript session and grants no permissions.

## Current manager-access boundary

**Production manager access is denied in H1.1.** No trustworthy server role membership or authorised approval workflow exists yet, so no client value is treated as a verified manager/admin permission. Editable user metadata is used only for display name. Public registration sends only `full_name`, never student/manager/admin role claims.

The existing ManagerScreen and its portfolio remain intact. An explicitly enabled preview is available only when all of these hold: authenticated confirmed account, a development (`__DEV__`) build, and `EXPO_PUBLIC_ENABLE_MANAGER_PREVIEW=true`. The preview is visibly labelled “Development preview · Illustrative local portfolio”. The Manager route repeats the guard; navigating directly to it in production still fails. The flag is public configuration, not a security credential, and cannot enable the preview in a production bundle.

This is a guarded local frontend, **not deployed backend authorisation**. Production manager functions require a server-owned membership model, admin-controlled approval and server/RLS enforcement in a later milestone. Student accounts remain eligible to apply for manager access without creating another account. There is no public admin registration path.

## Dependency changes

| Direct addition | Exact version | Compatibility basis |
| --- | --- | --- |
| `@supabase/supabase-js` | 2.118.0 | Official React Native client; declared Node engine ≥22, compatible with this repository's Node 24 convention |
| `react-native-url-polyfill` | 4.0.0 | Supabase React Native URL requirement; declared React Native peer `*` |
| `expo-secure-store` | 57.0.4 | Installed Expo 57.0.30's bundled native-module map |
| `expo-crypto` | 57.0.4 | Same SDK 57 bundled map; native random values/SHA-256 for PKCE |

The lockfile adds eleven package entries (the four direct packages plus their transitive dependencies). Existing `tslib` remains 2.8.1 and is reclassified from optional/dev-only to a production dependency. No existing package version is upgraded or removed. Expo remains 57.0.30; expo-asset remains 57.0.20. No force/legacy-peer-deps installation was used. The reviewed installation used `--ignore-scripts`; published package builds and native config plugins were validated through TypeScript, Doctor and exports. Existing dependencies were not unnecessarily reinstalled with npm ci.

Official references: [Supabase React Native quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native), [native email deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [server-backed getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). Version selection used this checkout's SDK 57 map, rather than the latest Expo documentation's SDK version.

## Verification

| Actual check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm run test:auth` | **48 passed**, zero failed/skipped |
| `node --test --test-reporter=tap scripts/*.test.cjs` | **793 passed**, zero failed/skipped |
| `npm ls --depth=0` | Passed |
| `npm run check:dependencies` (network-enabled) | Passed, dependencies up to date |
| `npm run doctor` (network-enabled) | **21/21 passed** |
| `npm run export:check` with TEMP/TMP in the workspace | Android and iOS Hermes exports passed; approximately 6.1 MB each |
| `git -c core.safecrlf=false diff --check` and new-file whitespace scan | Passed |
| Android runtime | Blocked: ADB could not connect/start its daemon; no emulator reset/reinstall attempted |
| iOS runtime | Unavailable on this Windows host |
| Live Supabase signup, email, recovery and restoration | Not run: no project configuration/approved real account supplied |

Auth tests use mocked providers and transports, including two checks against the installed Supabase SDK with a fake HTTP transport. Native crypto/storage tests also use adapters/mocks. These checks do **not** establish real email delivery, live project configuration, server role/RLS security, native Keychain/Keystore behavior or device execution. Existing guest-startup/Google-placeholder assertions were adapted to the new required-auth policy; logout regressions now await real asynchronous sign-out. All unrelated UI/domain regressions remain in the full suite. The new auth test command is included in the existing CI workflow.

An intermittent sandbox `EPERM` reading an existing ESLint dependency occurred during a parallel verification run; a standalone retry passed without reinstalling or changing packages.

The first sandbox-only Doctor attempt reached 19/21 because Expo schema/React Native Directory network requests were unavailable; the network-enabled run passed all 21. The first Hermes export failed writing outside the workspace; setting TEMP/TMP to `.expo/phase-h1-1/tmp` resolved it without changing dependencies or Hermes settings.

Android ADB could not connect to its daemon in this environment. No reset, restart loop, reinstall or native build was attempted. iOS runtime verification was not available on this Windows host. Exports are compilation evidence only.

## Manual Android acceptance steps

1. Apply the approved project configuration above and build an updated native development app through the existing local Android build workflow. Review native app-config changes, preserve data/work, then use the project's normal development launcher. Do not point a released build at an unapproved project.
2. With no valid saved session, verify Sign In is the only entry; Home, student tabs and Manager cannot be reached by Back, links or guest actions. With missing configuration, verify the setup error and disabled submit buttons.
3. Register using only name/email/password. Verify it waits for confirmation. Test existing email, invalid credentials, weak/mismatched password, resend/rate-limit/offline behavior and repeated submit taps. No local validation result should open Home.
4. Open the latest confirmation link on the requesting installation, with the app both closed and open. Verify confirmed users see Find accommodation/List accommodation. Test expired/reused links and callbacks arriving during restoration. Confirm Home remains blocked until the server validates email confirmation.
5. Choose Find accommodation and check all six existing student tabs. Kill/relaunch the app online: the account session should restore after server validation, while session-only application/profile/document interaction state starts fresh. Retry offline restoration: protected screens must remain closed rather than treating cached user data as verified access.
6. Choose List accommodation after onboarding, or Profile → Become a Manager later. Both must show the same truthful unavailable-request journey without creating a new account/request, publishing a property or granting access. A production build must deny a direct Manager route even with the preview flag true. Test the explicitly enabled development preview separately; its local manager UI and historical application/status behavior should remain intact.
7. Use Forgot password from Sign In. Open the recovery email on the same installation, save a matching strong password, and confirm it returns to Sign In. Test expired/replayed/wrong-origin/forged recovery links and provider failures; no password change or email delivery should be claimed on failure.
8. On Profile, cancel Log Out and check data remains. Confirm it and check protected navigation/history and current local owners are removed. Test sign-out failure: error feedback should appear without falsely confirming completion or erasing local work. Sign in as another account and confirm no prior local identity, application/document owner or saved manager review is reused.
9. Repeat keyboard, safe-area, screen-reader and enlarged-text checks on actual Android/iPhone devices. Mocked layout/route tests and exported Hermes files do not replace these checks.

## Next milestone — H1.2 Manager Verification Requests

Agree the trusted account/membership ownership and admin approval contract, then separately authorise implementation of secure manager requests, evidence handling, status updates and server enforcement. This milestone does not implement approvals, roles, real property storage/publishing, accommodation applications, payments or uploads. No H1.2 work was started.


## Exact files changed

29 existing files modified and 13 new files (42 total). File paths below link to this workspace.

### Existing files

- [.github/workflows/ci.yml](C:/Users/mudau/Documents/GitHub/expo-campusstay/.github/workflows/ci.yml)
- [.gitignore](C:/Users/mudau/Documents/GitHub/expo-campusstay/.gitignore)
- [App.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/App.tsx)
- [app.json](C:/Users/mudau/Documents/GitHub/expo-campusstay/app.json)
- [package-lock.json](C:/Users/mudau/Documents/GitHub/expo-campusstay/package-lock.json)
- [package.json](C:/Users/mudau/Documents/GitHub/expo-campusstay/package.json)
- [scripts/baseline.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/baseline.test.cjs)
- [scripts/bookings-messages.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/bookings-messages.test.cjs)
- [scripts/documents-status.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/documents-status.test.cjs)
- [scripts/explore.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/explore.test.cjs)
- [scripts/favorites-profile.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/favorites-profile.test.cjs)
- [scripts/funding-workflow.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/funding-workflow.test.cjs)
- [scripts/home.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/home.test.cjs)
- [scripts/phase-d.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/phase-d.test.cjs)
- [scripts/phase-e.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/phase-e.test.cjs)
- [scripts/phase-f.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/phase-f.test.cjs)
- [scripts/profile-harness.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/profile-harness.cjs)
- [scripts/profile-settings.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/profile-settings.test.cjs)
- [src/manager.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/manager.ts)
- [src/navigation/types.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/navigation/types.ts)
- [src/profile.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/profile.ts)
- [src/screens/ForgotScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/ForgotScreen.tsx)
- [src/screens/LoginScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/LoginScreen.tsx)
- [src/screens/OnboardingScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/OnboardingScreen.tsx)
- [src/screens/ProfileScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/ProfileScreen.tsx)
- [src/screens/RegisterScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/RegisterScreen.tsx)
- [src/screens/SecurityScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/SecurityScreen.tsx)
- [src/screens/SplashScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/SplashScreen.tsx)
- [src/screens/TermsPrivacyScreen.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/TermsPrivacyScreen.tsx)

### New files

- [.env.example](C:/Users/mudau/Documents/GitHub/expo-campusstay/.env.example)
- [docs/phase-h1-1-authentication.md](C:/Users/mudau/Documents/GitHub/expo-campusstay/docs/phase-h1-1-authentication.md)
- [scripts/auth-h1.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/auth-h1.test.cjs)
- [scripts/auth-storage.test.cjs](C:/Users/mudau/Documents/GitHub/expo-campusstay/scripts/auth-storage.test.cjs)
- [src/auth/account.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/auth/account.ts)
- [src/auth/client.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/auth/client.ts)
- [src/auth/controller.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/auth/controller.ts)
- [src/auth/crypto.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/auth/crypto.ts)
- [src/auth/secureStorage.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/auth/secureStorage.ts)
- [src/auth/secureStorage.web.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/auth/secureStorage.web.ts)
- [src/auth/sessionStorage.ts](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/auth/sessionStorage.ts)
- [src/screens/AccountScreens.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/screens/AccountScreens.tsx)
- [src/state/AuthContext.tsx](C:/Users/mudau/Documents/GitHub/expo-campusstay/src/state/AuthContext.tsx)

## Preservation and review artifact

All 143 starting tracked/non-ignored files remain present. The Git index is unchanged, including the pre-existing staged `.expo/devices.json` removal. Existing room-management, galleries, manager/status-card refinements and native attachment-storage sources remain preserved; `src/manager.ts` only gains a review-cache clear operation for account identity changes. No commit, push, reset, clean or discard was performed.

The focused diff against the starting working tree is [.expo/phase-h1-1/task-only.patch](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/phase-h1-1/task-only.patch). Verification logs and preservation snapshots are retained under the ignored `.expo/phase-h1-1/` directory. It contains no real account credentials.
