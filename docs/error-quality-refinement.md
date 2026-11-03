# CampusStay — Error handling and UI quality refinement

Date: 21 October 2026. Scope ends here; H1.2 and backend work were not started.

## Outcome and evidence boundaries

Confirmed error paths were repaired using the existing navy/blue palette, Outfit/Inter typography, rounded controls and keyboard strategy. The apple-design skill informed restrained feedback, hierarchy, readable wrapping and accessible recovery actions; completed screens were not redesigned.

**Authentication is not live in this checkout.** Missing public account settings now show a blocking account-unavailable screen. Student Home and Manager Workspace cannot be unlocked from it. Production validation deliberately fails until valid public configuration is supplied. Development exports are compilation checks only.

No Android or iOS visual/runtime success is claimed for this task. A single bounded ADB attempt returned `could not read ok from ADB Server`, `failed to start daemon`, and `cannot connect to daemon`. No emulator restart, reset, installation or setting change was attempted. This Windows environment has no iOS runtime. Prior device evidence belongs to earlier reports, not this change.

## Confirmed findings and fixes

| Finding verified against the starting code | Fix |
| --- | --- |
| Missing/invalid account configuration was rendered as technical setup instructions. Registration's auto-confirm response and manager access denial also exposed implementation details. | Blocking account-unavailable state; concise service/manager copy. Configuration reasons go only to development diagnostics. Registration still signs out an unexpected auto-confirm session and never treats registration alone as verified access. |
| Production exports had no mandatory account-configuration gate. | Shared runtime/build validator, explicit production check, dynamic Expo config guard, and CI release environment variables. Missing or invalid settings stop validation before export. |
| Unknown account failures all blamed connectivity. Expired sessions had no distinct recovery guidance; restoration offered retry even for nonretryable failures. | Closed error catalogue distinguishes credentials, confirmation, validation, expired links/sessions, permission, rate limits, transport/timeouts, service and unexpected failures. Expiration removes authenticated access. Retry is offered only where appropriate. |
| Provider errors survived input edits/form navigation. An earlier successful resend could remain visible after a later failure. Recovery validation appeared only beneath the confirmation field. | Clear account feedback on edits/focus; clear dependent registration/recovery errors; remove stale resend success; place recovery validation next to the correct field. |
| Pending account forms still accepted edits/navigation actions. Forgot Password could attribute success to a subsequently edited email. Intent selection could race logout. | Disable pending inputs/buttons/links, capture the requested email, guard duplicate reset sends, and reject intent changes during an account operation. |
| Password update could succeed before sign-out failed; repeating Save could update the password again. | Track that partial outcome, disable password inputs, offer **Finish signing out**, and prevent another password update in that controller session. |
| Repeated logout confirmation callbacks could report a false failure while the first request was running. | Ref guard plus busy state; local owners are cleared only after successful sign-out. Failure copy does not guess a connectivity cause. |
| Funding save displayed arbitrary `Error.message`, potentially exposing a native path or internal exception. | Known provider validation/ownership failures use typed, closed user-facing errors; unknown failures use safe save feedback. Input, attachment ownership and retry behavior remain intact. |
| Application Continue had `try/finally` but no catch around asynchronous attachment checking. | Visible, announced file-check failure; preserve draft and step; release progress/duplicate guards so retry works. Submission also avoids updating a departed screen in its failure path. |
| RemoteImage's failure/empty state only initialized from its first source. A replacement could remain stuck on the old fallback. | Reset image state when the source changes and remount the native image for a new source/attempt; retain existing loading, fallback and retry styling. |
| Property/Apply accessibility labels spoke internal room IDs. | Speak room category/capacity/price/count instead; stable test IDs retain precise regression selection. Data IDs, preselection and historical references are unchanged. |
| Saving an unchanged/empty manager note still announced “saved”; repeated room-save callbacks repeated the operation/alert. | Disable unchanged note saves and compare with the current manager session before confirming; preserve intentional note clearing. Guard repeated successful room-save callbacks until another edit. Funding and accommodation statuses remain independent. |
| Personal-information save failure used success-coloured feedback, retained stale feedback, and did not handle an unexpected save exception. | Accessible error/status tones, preserve editable draft on failure, and clear feedback on edit/discard. Genuine save confirmation stays session-only. |
| New account layouts omitted horizontal safe areas. Invalid Property/Apply/Status routes used non-scrolling error containers; Status also omitted other safe-area edges. | Account and error-recovery layouts respect all edges and can scroll with large text; light full-screen feedback uses dark status-bar content. Normal screen layouts remain unchanged. |
| There was no application render/lifecycle recovery boundary; font failure logged the raw exception in production. | Small boundary with safe, scrollable recovery that remounts the authentication gate; fixed-category diagnostics only in development. Existing bounded font wait/system-font fallback remains. |
| Attachment cleanup/storage messages exposed storage terminology rather than the useful next action. | Two message-only changes: reopen and retry preparation, or use the installed app for unavailable attachment capability. No storage implementation changes. |

## Complete inspection coverage and intentional non-changes

| Area inspected | Confirmed behavior retained |
| --- | --- |
| Welcome/Splash, onboarding, Login/Register/Forgot, confirmation/resend, recovery, restore/loading/logout | No guest route. Public routes cannot register protected screens. Field validation, bounded requests, email confirmation, PKCE cold/warm callbacks and encrypted native session restoration remain. |
| Account choice, Profile Become a Manager, manager-request placeholder and access guard | Intent grants no role. Requests explicitly remain unavailable; nothing is submitted. Production manager access stays denied. Preview still requires development + explicit flag + verified authentication. |
| Home, Explore search/filter/sort, Favorites, Compare, Property Details/Rooms/Reviews | Existing empty/recovery actions and comparison limits work; no new services or filters were invented. Current room eligibility, prices, counts and retired Studio exclusion remain. Legitimate application/record reference labels stay readable. |
| Application personal fields, room choice, funding, required documents, emergency contacts, review/submission, Application Status | Inline validation and local submission boundaries remain. No application is delivered, approved, paid or converted to a real booking. Historical rent/room snapshots are unchanged. |
| My Documents, previews, native pickers/camera/library and low-storage adapters | Existing closed DocumentIssue messages, silent cancellation, permission/type/size checks, unavailable-file handling, ownership and backup-excluded private staging remain. Native PDF preview intentionally remains unavailable. No upload exists. |
| Profile/personal information, security, help, terms/privacy and notifications/messages | Session-only data and explicit unsupported actions remain honest. Policy disclosure of the account service provider is intentional privacy information, not a user-facing setup error. Messaging does not claim external delivery. |
| Manager Dashboard, Properties, multiple room types, gallery and Room Management | Existing property/photo validation, creation guards, IDs, gallery ownership, reconciliation and cancellation are preserved. Nothing is published; listed quantities do not claim verified vacancies. |
| Manager Applications, Funding Review and internal notes | Reviews remain per-application, session-only and independent of application status. No real student files, funding verification, decisions or notifications were introduced. |
| Manager Tenants, Analytics, Settings | Existing empty/filter recovery and illustrative/read-only boundaries remain. Occupancy stays “Not recorded”; unavailable settings explain their availability rather than claiming a save. |
| Tabs, nested routes, modals, choice sheets, native preview and unexpected failures | Tab order/geometry/badges/selected semantics remain; no text underlines. Existing cancel/Back behavior remains. Error boundary handles React render/lifecycle failures only, not native process crashes, module import failures, event handlers or arbitrary asynchronous failures. Relevant confirmed async paths were handled explicitly. |

No broad formatting pass, dependency install/upgrade, backend project, migration, approval service, remote upload, payment or booking confirmation was introduced.

## Standardized presentation and diagnostics

- Inline input errors continue through the existing `Input` component (required/error semantics and accessible hints).
- Account form/status feedback uses a small `Feedback` component: alert role, polite announcement, scalable text, no fixed line count and established semantic colours.
- Blocking setup failure: **“Account services are temporarily unavailable. Please try again later.”** No decorative retry button: changed build configuration requires a rebuilt/reloaded app, not a network retry.
- Expired session: **“Your session has expired. Sign in again to continue.”** Protected UI closes.
- Known transport failure: **“We couldn't connect right now. Check your connection and try again.”** Unknown exceptions do not automatically blame connectivity.
- Unexpected save failure: **“We couldn't save your changes. Please try again.”** Known funding validation/file ownership issues keep their specific next steps.
- Attachment check: **“We couldn't check your files. Your entries are still here. Please try again.”** Existing cancelled/type/size/permission messages remain specific.
- Existing ErrorState/EmptyState/Btn/Input, dirty-form confirmation and attachment catalogues are reused; no framework was added.

`reportDiagnostic` accepts fixed contexts/categories only and logs only when `__DEV__` is true. It receives no exception object, stack, URL, account ID, form payload, password, token, file path/content or funding details. Missing/invalid public configuration logs `missing_public_config` / `invalid_public_config`; developer remediation belongs here and in the H1.1 report. Unknown native/file exceptions never become displayed text.

## Build validation and remaining live requirements

Provide the real project's **public** URL and `sb_publishable_…` key through `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never use a secret/service-role key. `.env.example` and existing ignore rules remain unchanged. These values are public client configuration, not authorization for manager access.

`npm run check:production-config` loads Expo's production dotenv selection silently and rejects absent/unsafe settings without logging values. `npm run export:check` runs that gate first. `app.config.js` also guards production NODE_ENV, production exports and release build invocations/EAS contexts; it preserves the existing static Expo configuration. CI now runs every regression file and supplies the two public values from repository variables to the export step; missing variables deliberately fail that step.

Expo documents [environment-variable handling and production export mode](https://docs.expo.dev/guides/environment-variables/) and [dynamic app configuration](https://docs.expo.dev/workflow/configuration/). The installed SDK 57 CLI was also inspected: export sets production/development mode before resolving app config. Shape validation does **not** establish that the project is reachable, the key belongs to it, email delivery works, or server policy is correct.

`npm run export:dev:check` explicitly produces **development-only** Android/iOS bundles in ignored `.expo/error-quality/dev-export`. It does not bypass the runtime account gate and is not a release workaround. No synthetic credentials were used to make a production export pass. Existing older artifacts were not deleted and are not validated release deliverables.

Live setup still requires the H1.1 project configuration, enabled email confirmation, correct redirect allowlist/deep links, email delivery and real account/session/recovery testing. Manager role/approval services remain future work. This task created none of them.

## Verification

All screen/callback tests below are **headless**, with native modules/providers stubbed or transport mocked. The 320/375/393dp × 100/130/200% feedback checks verify wrapping/scroll/safe-area contracts, not pixels, glyph layout or spoken VoiceOver/TalkBack output.

| Check | Final result |
| --- | --- |
| Focused error-quality + Phase F regressions | 58 passed, 0 failed (43 new focused cases + 15 existing Phase F cases). |
| Full `npm run test:all` | 836 passed; 0 failed, skipped or cancelled. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed, zero warnings. |
| `npm run doctor` | 21/21 passed with network access. Sandbox-only attempt first returned 19/21 because Expo schema/directory endpoints were unreachable. |
| `npm run check:dependencies` | Passed with network access: dependencies up to date. Initial sandbox attempt used only Expo's offline map; final result used network access. |
| `npm run export:check` | Exit 1, intentionally blocked by `missing_public_config` before production bundling. |
| `npm run export:dev:check` | Android and iOS development JS exports passed, approximately 12 MB each. No device execution or release-build success inferred. |
| Git whitespace/diff and preservation checks | Passed. All 156 starting files remain present; index unchanged; lockfile unchanged. Existing line-ending advisory warnings do not indicate whitespace errors. |
| Android/iOS runtime | Not performed: ADB daemon connection failure; no iOS runtime on Windows. Authenticated device journeys also require real account configuration. |

During implementation, checks caught a JSX scroll-wrapper error and test harness/old label expectations; those were corrected before the final passing checks. No diagnostic suppression or strictness reduction was used.

Evidence and task-only diff are under ignored `.expo/error-quality/`: `focused-final.txt`, `full-suite-final.txt`, `typecheck.txt`, `lint.txt`, `doctor-online.txt`, `dependencies-online.txt`, `production-export.txt`, `development-export-final.txt`, `adb-devices.txt`, `adb-error.txt`, `preservation.json`, `task-only.patch`. Earlier unsuccessful logs are retained separately and are not final results.

## Exact files changed in this task

Existing dirty/untracked files were edited in place; this list describes only this task's delta, not all previous CampusStay phases.

- Configuration/verification: `.github/workflows/ci.yml`, `package.json`; new `app.config.js`, `config/account.cjs`, `config/account.d.cts`, `scripts/check-production-config.cjs`.
- Auth/runtime: `App.tsx`, `src/auth/account.ts`, `src/auth/client.ts`, `src/auth/controller.ts`; new `src/errors.ts`, `src/components/AppErrorBoundary.tsx`, `src/components/Feedback.tsx`.
- Screens: `src/screens/AccountScreens.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`, `ForgotScreen.tsx`, `ProfileScreen.tsx`, `PersonalInformationScreen.tsx`, `PropertyScreen.tsx`, `ApplyScreen.tsx`, `AppStatusScreen.tsx`, `UpdateFundingScreen.tsx`, `ManagerScreen.tsx` (all screen names in this item are under `src/screens/`).
- Shared behavior/copy: `src/components/RemoteImage.tsx`, `src/documents.ts`, `src/state/ApplicationContext.tsx`.
- Existing test infrastructure/expectations: `scripts/auth-h1.test.cjs`, `baseline.test.cjs`, `phase-f.test.cjs`, `profile-harness.cjs`, `manager-room-types.test.cjs`, `property-details.test.cjs` (all under `scripts/`). New `scripts/error-quality.test.cjs`.
- New report: `docs/error-quality-refinement.md`.

Dependency versions, `package-lock.json`, native modules, document adapters/lifecycle, manager domain reducer/data, historical records and theme tokens were not changed. Git index remains exactly as found, including the previously staged `.expo/devices.json` removal. No commit, push, reset, clean or discard was performed.

## Manual Android and iOS checklist — still required

- [ ] Missing settings: launch shows the account-unavailable screen; Back/deep links cannot open Home or Manager; no setup instructions, fake success or guest button.
- [ ] Real configured project: validate incorrect credentials, unconfirmed email, resend success/failure/rate limit and slow/offline service. Feedback clears appropriately and only one request runs.
- [ ] Cold/warm confirmation and recovery links: expired/malformed/reused links, password validation, successful recovery and failed sign-out after update. Finish sign-out must not update the password again.
- [ ] Restore verified, expired and offline sessions; logout cancellation/failure/success. Protected routes close appropriately, and private local owners clear only through the established lifecycle.
- [ ] Student/manager onboarding and Profile entry: no local choice grants a role; production Manager stays unavailable. Verify explicit development preview restrictions separately.
- [ ] At narrow phone widths and 100/130/200% text, portrait/landscape: read full messages, scroll to recovery actions, focus inputs with keyboard open, inspect safe areas and all six tab labels/badges. Check actual VoiceOver/TalkBack announcements.
- [ ] Home → Explore/filter → Favorites/Compare → Property/Rooms → application: room preselection/prices unchanged, no spoken internal room IDs, expired listing recovery works.
- [ ] Application/document/funding/personal/emergency flows: cancel pickers, deny permissions, invalid/large file, low storage and unavailable attachment; verify drafts survive failure, preview limitations and local-only submission wording.
- [ ] Manager gallery/property/room creation/edit/cancel, funding status and internal note save/clear/remount: correct ownership, no duplicate success alerts, independent statuses, no publish/approval claims.
- [ ] Controlled development render failure: recovery is readable and retry re-enters the auth gate. Native fatal/import/OS failures require their own platform investigation; the React boundary does not handle them.

Stopped after refinement and verification. Remaining live configuration and native visual checks are explicit blockers/limitations, not successful tests.
