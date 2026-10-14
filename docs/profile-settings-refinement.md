# Profile & Settings refinement

Verified on 14 October 2026. This is a focused frontend improvement after Phase F and the Login refinement.

## Original issues and implementation

Only Notifications opened a functioning destination. Personal Information, My Documents, Security, Help & Support, and Terms & Privacy displayed availability alerts. Profile also presented a fixed fictional identity as the current user, and its unread badge had limited room for enlarged text.

All six menu entries now open meaningful screens. Existing navy/blue branding, secondary icon colours, Outfit/Inter, rounded cards, shadows, theme tokens, icons, and button/input styling remain. The Profile identity starts empty and reflects details explicitly saved in this session.

Menu rows retain 64dp minimum height at default text size, matching padding and icon/chevron alignment, and shared pressed opacity. Larger text receives a consistent increased minimum height. At 150% text and above, the notification count moves below the title so it does not crowd the label. Counts are hidden at zero and always derived from the existing communication provider. Stats stack at enlarged text. Content remains scrollable, with safe-area padding and a 640dp width cap for menu/details content.

## Functional menu review

| Entry | Behaviour |
| --- | --- |
| Personal Information | View/edit optional full name, email, phone, university, and student number. Controlled fields validate and save in memory. Cancel and back navigation protect unsaved edits. |
| My Documents | Shows categories for each actual session application, linked by its stable ID and property. Distinguishes selected/unselected categories from uploaded files or verification. Empty and missing-association states are explicit. |
| Notifications | Reuses the existing screen and state owner. Individual read and Mark All Read update Profile immediately. Read/unread states have visible text and accessible descriptions. Missing destinations give feedback; missing conversations cannot open broken routes. |
| Security | Explains available account/session capabilities, unavailable password/security services, and local reset behaviour. Return to Profile leads to the established logout control. No competing logout implementation or fake security toggle. |
| Help & Support | Eight working FAQ expand/collapse controls explain discovery, favorites/comparison, applications, categories, status, messages, account access, and logout. No configured support channel was found, so no contact address or message success was invented. |
| Terms & Privacy | Explains local session data, account-service limitations, application/category boundaries, and externally loaded accommodation images. Clearly states that formal policies are unavailable and this information is not a legal agreement. No policy acceptance is collected. |

## Navigation

Five parameter-free routes were added to the existing typed root stack: `PersonalInformation`, `MyDocuments`, `Security`, `HelpSupport`, and `TermsPrivacy`. Notifications retains its existing route. No navigator or authentication guard was added.

Headers use normal stack back navigation. Personal Information uses React Navigation's `usePreventRemove` to protect dirty edits, including native back actions. Discard resumes the original navigation action. Documents opens `AppStatus` with the exact property and application ID only when the association and room are valid. Its empty-state action returns to the existing Main/Explore tab.

Fresh startup remains Main/Home. Existing student tabs, application/status routes, Login labels and Google artwork, credential-free continuation, and Manager entry/exit are preserved. Profile does not expose manager controls.

## Personal information, state ownership, and reset

`ProfileProvider` owns one small in-memory object using the existing application's personal-information field shape. It starts with blank strings; neither an application nor a fixture is silently copied into it. `profileReducer` applies immutable, normalized updates and rejects invalid data even if the form is bypassed.

All fields are optional. Non-empty email and phone values are validated. Existing flexible 7–15 digit international phone validation is reused. Names support international characters and punctuation without restrictive name rules. Maximum lengths are 100 for name, 254 for email, and 40 for phone/student number/university ID. Values are trimmed, control characters rejected, and university IDs checked against existing options. Native inputs receive matching length limits and email capitalization behaviour.

Saving changes updates Profile during the current session, with explicit local feedback. Cancel restores the saved values. Dirty back/cancel actions require a discard choice. Profile edits never overwrite personal details in saved applications. Existing Home fixture text is not synchronized with the new optional Profile fields.

Application categories continue to belong to `ApplicationProvider`; favorites to `FavoritesProvider`; messages and notification read state to `CommunicationProvider`. There is no duplicate unread count. Notification preferences were omitted because the current infrastructure does not generate new notifications that such controls could meaningfully govern. No push registration or OS permission prompt was added.

The existing logout message and actions are unchanged: **Are you sure you want to log out?**, **Cancel**, **Log Out**. Cancel has no state-changing callback. Confirm retains the established application/favorites/communication resets and adds `resetProfile`, then replaces Main with Login. Applications and personal details clear; starting favorites and conversation/notification history are restored. Manager state is not targeted. Continue without signing in resets the stack to Main/Home.

## Security and service boundaries

No dependencies were upgraded or added. No backend, API, database, authentication, authorization, AsyncStorage, SecureStore, uploads, verification, push notifications, payments, external messaging, or background service was introduced. No password change, recovery email, account protection, active session list, or biometric result is fabricated.

No genuine support destination or approved legal policy was configured in the inspected repository. Help provides self-service guidance. Terms & Privacy provides factual implementation information, without company identities, effective dates, compliance guarantees, binding terms, or acceptance records.

## Files changed in this task

Added:

- `src/profile.ts`
- `src/state/ProfileContext.tsx`
- `src/components/ProfileLayout.tsx`
- `src/screens/PersonalInformationScreen.tsx`
- `src/screens/MyDocumentsScreen.tsx`
- `src/screens/SecurityScreen.tsx`
- `src/screens/HelpSupportScreen.tsx`
- `src/screens/TermsPrivacyScreen.tsx`
- `scripts/profile-harness.cjs`
- `scripts/profile-settings.test.cjs`
- `docs/profile-settings-refinement.md`

Modified:

- `App.tsx` — provider and five registered screens.
- `src/navigation/types.ts` — five typed routes.
- `src/screens/ProfileScreen.tsx` — navigation, local identity, reset participation, and visual refinement.
- `src/screens/NotificationsScreen.tsx` — read labels, safe-area padding/status bar, and missing-conversation guard.
- `src/components/UI.tsx` — optional `maxLength` and `autoCapitalize` pass-through on the existing Input.
- `scripts/baseline.test.cjs` — exact expected route list includes the added screens; existing startup checks retained.
- `scripts/phase-d.test.cjs` — notification navigation test now executes the actual Profile callback.
- `package.json` — `test:profile` script only in this task.
- `.github/workflows/ci.yml` — new suite included in CI.
- `README.md` — test command and documentation link.

All previously staged/unstaged work was preserved, including technical baseline dependency/configuration edits and the Login/UI/Phase F test refinement. Those prior changes remain in the working tree but were not reimplemented. No commit, push, reset, clean, or discard was performed. Dependencies were not reinstalled.

## Automated verification

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero warnings |
| `npm run test:baseline` | 5/5 |
| `npm run test:ui` | 6/6 |
| `npm run test:discovery` | 14/14 |
| `npm run test:application` | 24/24 |
| `npm run test:phase-d` | 37/37 |
| `npm run test:phase-e` | 36/36 |
| `npm run test:phase-f` | 16/16 |
| `npm run test:profile` | 44/44 |
| `npm run check:dependencies` | Pass against online Expo compatibility data |
| `npm run doctor` | 20/21; existing tracked `.expo` metadata warning |
| `npm run export:check` | Android and iOS Hermes exports pass |
| `git diff --check` | Pass; only Git LF/CRLF conversion notices |

Total: **182/182 tests passed**. TypeScript, lint, UI/Profile suites and both exports were repeated after the last implementation changes. CI includes the new command. Initial test failures were corrected for VM object-prototype comparisons and the expected order of newly registered routes; no tests or diagnostics were disabled.

The 44 new tests exercise actual screen callbacks with native modules stubbed, plus the real validation/reducers/document grouping. They cover six destinations, empty identity, malformed/long/international input, normalized immutable saves, form errors, reopening/cancel, guarded removal, reset, category associations and missing data, individual/all notification reads and zero badge, supported/missing destinations, security boundaries, FAQ toggling, absent contacts/policies, and back navigation. These unit tests do not themselves demonstrate device execution.

Installed baseline verified before editing: Expo 57.0.28, React 19.2.3, React Native 0.86.3, TypeScript 6.0.3, Screens 4.26.2, Reanimated 4.5.1, Worklets 0.10.1, and Navigation v7. Online dependency checking reports the set up to date.

The sandbox's initial Expo checks lacked network access; the approved online runs completed. Doctor's remaining warning is caused by already tracked `.expo/README.md` and `.expo/devices.json`. `.gitignore` already contains `.expo/`; new runtime evidence is ignored. The existing tracked files/index were preserved rather than untracked as an unrelated Git change.

## Android runtime results

Used the already-running Metro server on port 8082 and existing ADB reverse mapping; no competing development server was started. Reloaded the app so the current implementation was exercised in SDK 57 Expo Go on emulator-5554.

Completed journeys:

1. Personal Information: empty view → edit fictional name → save → Profile → reopen, confirming session retention and updated header identity. Native back raised the unsaved-change confirmation. Keep editing and Cancel editing/discard preserved the saved state.
2. My Documents: meaningful empty state → Explore → Property → existing five-step application flow using fictional details and three required category selections → save local record → Profile/Documents. Categories were selected for application `CS-LOCAL-MV798B1D-01`, funding remained unselected, and View application opened that exact ID/property. No file, provider submission, or booking was represented as successful.
3. Notifications: an individual item marked read → Profile count 2→1. Mark All Read → Profile count 0 and no badge. Missing destination feedback remained truthful.
4. Security: opened and inspected the capability/session sections and available return control.
5. Help: expanded/collapsed FAQ items and inspected the accurate application guidance.
6. Terms & Privacy: opened and scrolled the informational sections, including the final image-service disclosure.
7. Log Out: Cancel preserved the edited Profile. Confirm opened Login, and Continue without signing in returned to Home. Personal details reset and the starting unread count returned. A final logout removed the test application and restored the Documents empty state.

All six destinations were reached at these portrait configurations:

| Configuration | Pixels / density | Approximate width | System text scale |
| --- | --- | --- | --- |
| Standard | 1080×2400 / 420 | 411dp | 100% and 130% |
| Narrow | 840×1800 / 420 | 320dp | 200% |
| Large | 1440×2880 / 480 | 480dp | 100% |
| Tablet | 1600×2560 / 320 | 800dp | 200% |

These are representative combinations, not a full Cartesian matrix or separate physical devices. Captures showed readable wrapping, scrollable content and reachable controls. The narrow 200% pass was repeated after the badge/card refinement. Final standard captures show the completed alignment. Existing narrow bottom-tab captions abbreviate some labels, while retaining their full accessible names; bottom navigation was preserved.

Device size and density overrides were reset and font scale restored to 1.0. Verified physical settings: 1080×2400, density 420. Test personal details and the application were cleared using the established logout flow.

Screenshots and hierarchy XML are saved in ignored `.expo/profile-settings-evidence/`, outside tracked source. Useful local captures:

- [Final Profile](../.expo/profile-settings-evidence/final-profile.png)
- [Saved/reopened details](../.expo/profile-settings-evidence/personal-reopened.png)
- [Unsaved-change confirmation](../.expo/profile-settings-evidence/unsaved-confirmation.png)
- [Documents with actual application association](../.expo/profile-settings-evidence/documents-populated.png)
- [Linked application status](../.expo/profile-settings-evidence/documents-linked-status.png)
- [Zero unread badge](../.expo/profile-settings-evidence/profile-unread-zero.png)
- [Security](../.expo/profile-settings-evidence/security.png)
- [Expanded FAQ](../.expo/profile-settings-evidence/help-expanded.png)
- [Narrow 200% form](../.expo/profile-settings-evidence/narrow-200-personal.png)
- [Tablet 200% help](../.expo/profile-settings-evidence/tablet-200-help.png)

Expo Go's floating developer gear is visible in captures and temporarily intercepted notification/tab test taps. It was repositioned; it is not CampusStay UI. Earlier incomplete harness attempts were followed by completed checks and are not counted as passes.

## Regression review and remaining limitations

All existing baseline, UI, discovery, application, Phase D/E/F tests pass. The native run additionally exercised Explore/Property Details, the complete local application journey, exact status association, Login continuation and logout. Manager implementation and messaging reducers/screens were not changed; their existing automated regressions pass. A new complete native Manager/messaging journey was not repeated.

iOS runtime remains unverified on this Windows host; export success is not device execution. TalkBack/VoiceOver speech output, all long-name/university combinations, and a conventional full-height software keyboard were not separately tested. Native typing/dismissal used the emulator's input panel. The existing portrait orientation lock remains, so landscape was not tested.

Backend integration will eventually require authenticated account/profile services and server validation, explicit document file selection plus secure upload/private storage/access controls and real verification, actual application delivery/status updates, a genuine support channel, approved legal policies, and real notification delivery/preferences. None of those capabilities or their schemas/endpoints were implemented here.

Stopped after this Profile & Settings refinement.
