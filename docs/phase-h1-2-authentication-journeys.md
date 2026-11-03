# Phase H1.2 — Student and manager authentication journeys

Implemented 2026-10-21. Frontend work stops at the existing backend boundary.

## Result

Student Login remains the default signed-out entry when authentication is configured. Its navy header, house mark, form, validation, visibility toggle, sign-in and registration actions retain their existing presentation. A secondary building-icon **Manager Access** row below Create account opens a dedicated Manager Login route.

Manager Login uses CampusStay's existing tokens, shared form controls, fonts and keyboard handling. It provides the requested Manager Portal heading, subtitle, Sign In as Manager action, student-login return, manager registration and password recovery. Separate navigation routes reuse the existing login/registration modules, avoiding duplicate authentication implementations.

Manager Registration shows **Step 1 of 2 · Account information**, validates the existing four account fields, and uses the same Supabase sign-up/confirmation mechanism. Confirmation has its own email-confirmation progress label. Within the active session, successful confirmation or verified manager sign-in opens **Step 2 of 2 · Accommodation manager verification**.

Step 2 is an informational preview. It explains the eventual contact number, business/accommodation name, property address/location, owner/authorised-manager relationship and private authority evidence. It has no verification form, upload picker, submit action, invented review status or saved application. Users are told that verification is unavailable for submission and that no permissions have been granted.

The previous post-login student/manager chooser and its unused onboarding-completion state were removed after checking their references. Verified student sign-in now opens the student experience directly. Existing Profile → Become a Manager still opens the same ManagerRequest route. The Manager Workspace implementation itself is unchanged.

## Authentication, navigation and security

- Both public journeys use the existing Supabase client, secure session storage, server-validated `getUser` identity, email-confirmation gate and PKCE exchange.
- `intent` is an in-memory navigation preference only. It is not sent as signup metadata, stored as a role or used by the workspace authorisation guard. Sign-up still sends only the existing full-name display metadata.
- Production Manager Workspace entry remains denied. No trusted manager-role lookup or manager-verification backend integration was found in the repository. Remote project configuration/schema was not inspected or changed.
- User-editable role/status claims, login surface, email naming and even a locally supplied `app_metadata` object cannot enable the workspace. No role interpretation is implemented in this phase.
- The existing explicitly enabled development-only portfolio preview remains available to a verified account; its guard additionally requires an account object. It remains labelled as an illustrative development preview and is unavailable in production.
- Signed-in users have no login/registration routes in the protected navigator. Profile → Become a Manager identifies their current signed-in email without switching accounts or permissions. The account controller also refuses sign-in/sign-up attempts that would silently replace an existing authenticated or recovery identity.
- Student users retain access to the manager-information route without acquiring privileges. There is no exclusive student/manager role field, preserving compatibility with future dual-role accounts.
- Both login surfaces retain password recovery. Manager reset requests and verification returns retain their manager destination within the active session. Saving a recovered password still signs out and requires normal sign-in. Explicit sign-out resets the default to Student Login.
- Redirects remain exactly `campusstay://auth/confirm` and `campusstay://auth/recovery`. No native configuration, redirect allowlist or environment changes were made.
- On a process restart, validated session restoration defaults to student Home. No manager-application record or journey preference is persisted. A user can reopen the informational step through Profile → Become a Manager. Automatic cross-restart resumption of a real manager application remains blocked by the missing backend.
- Missing/invalid authentication configuration continues to show the existing neutral unavailable state. Development diagnostics and production configuration validation are unchanged. No Guest Mode was added.

## Unimplemented backend requirements

| Requirement | Current boundary |
| --- | --- |
| Manager details and private supporting evidence | Informational preview only; nothing collected or uploaded |
| Saved incomplete/submitted application | No verification record or persistence integration |
| Submission acknowledgment | No submission occurs; UI explicitly says none is saved |
| Pending review, information requests, approved/rejected outcomes | No authoritative records; no status is fabricated |
| Approved manager workspace access | Denied until trusted server authorisation is integrated |
| Suspension/revocation and protected operations | Workspace denied now; future server policies must enforce live access and revocation |
| CampusStay Admin Dashboard | No dashboard or backend implemented in this phase |

Future implementation requires protected ownership-bound verification records, private access-controlled evidence storage, authenticated admin review, auditable outcomes and trusted server-side manager access enforced with RLS. Student and manager permissions must coexist where appropriate. A client-side destination or user metadata must never substitute for those controls. This follows Supabase's [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). The [Supabase changelog](https://supabase.com/changelog) was reviewed; dependencies were not changed.

## Exact files changed in this task

Application code (7 files):

1. `App.tsx` — public ManagerLogin/ManagerRegister routes and removal of the post-login chooser gate.
2. `src/navigation/types.ts` — typed manager routes and recovery return destination.
3. `src/auth/controller.ts` — session-only journey hints, signed-in identity protection, recovery return handling and removal of obsolete chooser state.
4. `src/screens/LoginScreen.tsx` — secondary Manager Access entry and dedicated manager route presentation using the existing form.
5. `src/screens/RegisterScreen.tsx` — manager account step/progress and appropriate login return, retaining student validation and fields.
6. `src/screens/ForgotScreen.tsx` — manager-origin recovery request and return destination.
7. `src/screens/AccountScreens.tsx` — confirmation progress, truthful verification explanation, existing-account context and workspace guard preservation.

Tests/harness (8 files):

8. `scripts/auth-journeys.test.cjs` — 38 new focused tests.
9. `scripts/auth-h1.test.cjs` — current chooser/routing expectations and stronger workspace-render denial assertion.
10. `scripts/profile-harness.cjs` — route-name support; remove obsolete chooser action mock.
11. `scripts/baseline.test.cjs` — updated public route inventory.
12. `scripts/error-quality.test.cjs` — identity-switch protection during sign-out replaces obsolete chooser race case.
13. `scripts/phase-d.test.cjs` — Student Login remains the default with a manager return destination.
14. `scripts/phase-e.test.cjs` — same updated startup-route expectation.
15. `scripts/phase-f.test.cjs` — stub the existing icon library in the login harness.

Documentation (1 file):

16. `docs/phase-h1-2-authentication-journeys.md` — this report and remaining checks.

## Verification

| Check | Result |
| --- | --- |
| Existing focused auth/storage/UI/error/startup/keyboard regressions | 179 passed before the final full-suite run |
| New H1.2 journey tests | All 38 passed in the final full suite |
| `node --test --test-reporter=tap scripts/*.test.cjs` | **894 passed; 0 failed, skipped or cancelled** |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; zero warnings |
| `git diff --check` | Passed; existing Git line-ending conversion notices only |
| Task diff review | Restricted to the 16 files listed above |
| Git index comparison | Unchanged from task entry |
| Preservation check | All 167 initial non-environment source files remain; all 33 inspected native files unchanged |
| Android runtime | Blocked by ADB daemon failure; no launch performed |
| iOS runtime | Not performed; no iOS simulator in this Windows environment |
| Live Supabase sign-up, email delivery, confirmation/recovery | Not exercised against the real service; automated transports are synthetic |

The focused coverage includes student/manager login and registration callbacks; validation and busy states; email confirmation; unconfirmed-account gating; validated identity; no role-bearing signup metadata; denial for synthetic pending/approved/revoked claims; sign-out; session restoration; recovery; signed-in identity protection; and the installed stack router's transitions, including returning from a cold Manager Login stack to Student Login.

Layout contract tests exercise Android/iOS platform branches at 320/390dp and 100%/130%/200% text, including safe-area padding, scroll ownership, password toggles and minimum touch targets. Existing keyboard tests also pass. Native primitives are stubbed: these are not rendered screenshots, proof of no native clipping, screen-reader execution or device keyboard verification.

ADB was checked once with a 12-second bound. It returned exit 1: `could not read ok from ADB Server`, `failed to start daemon`, `cannot connect to daemon`. No retry, emulator restart, install, reset or launch followed.

Task artifacts are in `.expo/phase-h1-2/`, including `task-only.patch`, `all-tests.txt`, `typecheck.txt`, `lint.txt`, `adb-devices.txt` and `preservation.json`. The task-only patch compares against the actual dirty task-entry snapshot, rather than treating prior phases as new changes.

## Manual Android/iOS checks still required

1. Use the existing correctly configured native development app and Metro setup. This JS/navigation phase introduces no native rebuild requirement; any previously outstanding native deep-link build/install work still applies.
2. With no active session, confirm Student Login is the default and no first-launch role chooser appears. Inspect the unchanged student form plus Manager Access row at normal and enlarged text.
3. Open Manager Access; verify exact copy, keyboard reachability, safe areas, password visibility, invalid-field feedback and busy controls. Return to Student Login and repeat both registration paths.
4. Using a designated real test account, create a manager-journey account, confirm via the latest email on the originating device, and verify the informational second step appears with no uploads or submit action. Do not expect a manager verification application to be saved.
5. Test failed, unconfirmed and confirmed logins on both surfaces. A verified student should reach Home directly. A verified manager login should reach the restricted verification explanation, not a workspace.
6. From a signed-in student Profile, open Become a Manager. Confirm the same identity remains and Find accommodation returns Home. Confirm protected navigation cannot open public login screens or silently change accounts.
7. Test manager and student forgot-password requests, confirmation-email resend, latest valid/expired recovery links, save-password sign-out and normal sign-in afterward. Check warm and cold callbacks without logging tokens or codes.
8. Confirm production Manager Workspace denial regardless of local claims or preview configuration. Real pending/approved/suspended-role checks cannot be completed until the backend is implemented.
9. Sign out and restore/restart the app: Student Login is the explicit sign-out default; a valid restored account opens student Home. Reopen manager information from Profile. Check native Back/gestures and accessibility reading/focus with the keyboard open.

No packages were installed or upgraded. No backend, role assignment, manager application persistence or remote upload was added. No application, funding, room, photo/gallery or Manager Workspace workflow was edited. Existing staged, unstaged and untracked work is preserved. No commit, push, reset, clean or discard was performed. Stopped after H1.2.
