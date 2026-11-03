# CampusStay complete mobile frontend audit

Audit dates: 16–17 October 2026 (Africa/Johannesburg). Scope: mobile React Native/Expo frontend, safe demonstrated repairs, regression verification and readiness. This report supersedes older verification claims only where current evidence is stated. Native evidence and command logs are local, ignored files under `.expo/full-frontend-audit/`.

## 1. Executive summary

CampusStay has a substantial, usable session-only student frontend and a separate illustrative manager workspace. It opens directly into Home without credentials. Core accommodation discovery, favorites, comparison, application validation, real local file selection, declared funding and local communication are implemented. These capabilities do not authenticate a person, send an application/message, verify funding, reserve inventory or confirm a booking.

The audit found six confirmed frontend defects: invalid required routes could crash; three listing starting rents contradicted room prices; onboarding asserted unsupported verification; rating text and inactive student tabs lacked normal-text contrast; manager property edits could be discarded silently when changing tabs or exiting the workspace. Targeted repairs preserve the existing navy/blue palette, Outfit/Inter, cards, screen flows and previous work. UI completeness, frontend behavior and backend readiness must be assessed separately. Successful exports and test counts do not establish production readiness.

## 2. Actual repository baseline

Before edits: 120 tracked/nonignored untracked files snapshotted, including earlier uncommitted Phase 1–F and later refinements. Git status/index captured without staging. No applicable AGENTS.md found in this repository or ancestors. Apple Design skill read and applied as refinement guidance, subordinate to CampusStay's existing design. No package installation, SDK upgrade, persistence, backend work, commit, push, reset, clean or discard.

Initial typecheck/lint passed; all 530 tests passed across 19 test files. Scripts were inspected before execution. Current source rather than historical report totals determines this audit's results. Existing `.expo/devices.json` remains tracked despite `.expo/` being ignored; the former Phase 1 report's clean Doctor result is not the current baseline.

## 3. Screen inventory

| Area | Source screens inspected | Functional scope |
| --- | --- | --- |
| Public | Splash, Onboarding, Login, Register, Forgot | Preserved routes; bounded font startup; credential-free guest path; account services honestly unavailable |
| Student tabs | Home, Explore, Favorites, Bookings, Messages, Profile | Shared session providers; six tabs, no manager controls |
| Accommodation | Property, Compare | About/Rooms/Reviews/gallery; 2–3 saved properties; exact room offering selection |
| Applications | Apply, AppStatus, UpdateFunding, MyDocuments | Five steps, real local files, exact application IDs, session-only funding updates |
| Communication | Chat, Notifications | Local sends/read state; illustrative existing conversations and notifications |
| Profile/settings | PersonalInformation, Security, HelpSupport, TermsPrivacy | Optional profile editing, FAQ expansion, availability explanations, logout cleanup |
| Manager | ManagerScreen: Dashboard, Properties, PropertyDetail, RoomEditor, PropertyForm, Applications, ApplicationDetail, More, Tenants, Analytics, Settings | Independent local reducer and fixtures; no real authorization or student-file access |
| Shared | UI, PropertyCard, RemoteImage, ProfileLayout, KeyboardForm, SelectField, ChoiceSheet, FundingFields, AttachmentSourceButton, LocalDocumentPreview | All consumer families inspected before shared rating repair |

There are 24 screen modules; manager panels are internal views of one root screen.

## 4. Navigation audit

`App.tsx` registers Main as initial root; Home is first student tab. Public/auth/manager routes remain available. Typed root/tab params and explicit nested `popTo('Main', ...)` returns are used. Login guest resets to Home; confirmed Profile logout clears student providers and replaces Main with Login; Cancel leaves the session intact. Login's explicit manager-workspace confirmation replaces Login with Manager; manager exit replaces Manager with Main. This separation is presentation only, not authorization.

Missing params reproduced TypeError in four actual exported screen functions through the VM harness. Property/Apply/AppStatus now guard a known, structurally usable listing snapshot; no fallback listing actions are rendered. Hooks keep stable order. UpdateFunding treats a missing ID as unavailable. Apply also refuses to display/save a draft against a different property after param changes. Invalid-route recovery points to Explore or Bookings. Chat missing conversation, Compare invalid/deduplicated IDs, stale MyDocuments application ID and unknown funding ID already have explicit recovery. Valid Single/Shared preselection and retired Studio historical reading remain tested.

Route objects still contain Property snapshots rather than only IDs. There is no configured external deep-link resolver or durable navigation restore. This is a future integration risk, not proof of malicious deep-link protection. The guard is not a general untrusted JSON schema validator.

## 5. Design-system audit

Existing navy `#0F1B2D`, blues, theme colours, Outfit/Inter, radii, shadows and native components remain. No redesign, glass material, new font, decorative animation or dependency was introduced. Existing press feedback, focus borders, scaled layout branches and safe-area handling are retained. The shared StarRating used decorative amber `#F59E0B` for 13pt text on light surfaces. It now uses the existing semantic amber foreground `#92400E` and an explicit spoken numeric label. Rating contrast improves from 2.15:1 to 7.09:1 on white (2.05:1 to 6.78:1 on slate50). Inactive student tab tint also changes from existing slate400 to existing slate600; routes and layout are unchanged. Numeric contrast regressions cover these actual surfaces. This does not certify every screen or image overlay.

## 6. Student discovery experience

Home derives a first-name/generic greeting from optional Profile state, refreshes time greeting on focus, dismisses keyboard before Explore navigation and reuses PropertyCard for favorites. University shortcuts supply stable university IDs; unsupported/no-results combinations remain empty rather than fabricating listings. Images use explicit loading/failure/retry presentation. The existing Available Now quick filter reads listed fixture counts; it is not evidence of real-time inventory.

Explore owns one vertical FlatList, inline filter panel, route query/university/quick-filter context, independent price/amenity/sort state, clear controls, result counts and empty recovery. Amenity matching is AND (`every`), query spans property/university/location/amenities/tags; therefore searching “Campus” legitimately matches several properties. Price slider normalizes finite values; sorts are stable and reject invalid numeric metadata. The audit corrected p3/p4/p5 metadata to the actual lowest eligible rent: R2600/R3800/R2400 respectively. Cards, comparisons, filters and Details now agree for all current fixtures. Room prices and historical booking records did not change.

Favorites uses stable IDs and provider state; removal prunes comparison selection even when performed elsewhere. Compare validates favorites, removes duplicate/unknown IDs and caps at three. It supports horizontal scrolling and shared price/count data. No single-offering inference is made for a multi-offering property.

## 7. Property and application flow

Details gallery has bounded pagination, source fallback, back/favorite actions, actual address/amenities/rules and separate About/Rooms/Reviews. Room totals derive from eligible current offerings. Campus View remains r1 Single occupancy/capacity 1/R3500/four rooms and r2 Shared/capacity 2/R2200/six rooms; ten total, starting R2200. Retired p1/r3 is excluded by property+room ID even in stale snapshots. Its historical label/price remain readable; unrelated p5 Studio variant data is intentionally preserved under the existing Single/Shared taxonomy.

Reviews distinguish illustrative aggregate metadata, no property-linked records, missing breakdowns and opt-in unassociated examples. No fake recent reviews, verification badge or map was introduced. Apply validates Room → Personal → Documents → Emergency → Review; field selections persist across Back/Edit. Required category flags do not substitute for usable files. Explicit profile reuse copies details, never silently overwrites. Review/save use validation and synchronously guarded repeated taps. Saved records are local applications, not bookings. Current summary rent is resolved from fixture rooms, not an immutable submission snapshot; freeze accepted terms when defining future server contracts.

## 8. Document lifecycle audit

Native SDK adapters call Expo DocumentPicker/ImagePicker/FileSystem, not filename-only mocks. Supported PDF/JPEG/PNG files require valid name/MIME/actual size, maximum 10MiB, readable owned copy and matching magic bytes. HEIC/HEIF is rejected honestly, without renaming/conversion. Camera permission is requested on demand; broad storage/microphone access is blocked in config. Library uses system selection. iOS source sheet uses ActionSheetIOS with anchor; dropdowns use scaled text in shared ChoiceSheet.

AttachmentSession isolates private resource handles from serializable application metadata. Draft/application/funding-editor owners are distinct. Original selected Downloads/content references are never deleted; only owned copies or directly scoped SDK picker copies are eligible for cleanup. Failed/cancelled replacement retains valid previous evidence. Late picker results after logout/closed draft are discarded; source busy lock prevents overlapping selection. Promotion transfers references to exactly one saved application. Funding edits stage resources until Save; Cancel preserves the original. No manager module imports student application/attachment access.

MyDocuments groups by application and category, retains full filenames/metadata and distinguishes missing, legacy selection and unavailable files. Same filename never becomes an identity. Image preview exposes a URI only from an owner-scoped registry; full name and Close remain independently usable. Native PDF preview is intentionally unavailable and labelled as such. Magic-byte checks are format sanity checks, not malware scanning, encryption or authorization. Cache eviction/restart can expire files; deletion is best effort and not secure erasure.

## 9. Funding audit

Funding source is independent from NSFAS status, supporting evidence, discussion preference and manager review. Self-funded, NSFAS pending/student-reported confirmed/unsuccessful, parent/guardian and sponsor branches exist. Proof of Funding stays optional. No confirmation/verification/payment-plan/provider notification is inferred from declarations or files. UpdateFunding validates and updates the exact application ID, preserving personal/emergency/room/other files; asynchronous revision checks reject logout/concurrent stale saves. Legacy NSFAS values normalize for display without mutating historical source objects. Manager review labels only modify separate manager-local state.

## 10. Bookings

Applications, Upcoming, Active, Completed and Cancelled are a horizontal, measured tab strip. Selected labels are revealed with bounded offsets, including narrow widths. Cancelled being offscreen before horizontal scrolling is intentional. Applications use saved IDs; illustrative dated booking records remain separate and clearly described, without pretending a local application is approved. Unknown properties are skipped safely. Historical unsupported room labels do not acquire fabricated current room IDs.

## 11. Messages and notifications

Communication reducer uses stable conversation/message IDs, local send sequence and immutable updates; outgoing messages move the conversation first. Send validates nonempty/1000-character maximum and clears a synchronous draft ref to avoid double taps. Chat uses a virtualized list, measured latest-scroll behavior and respects readers who scroll back. Unread counts are shared; conversations mark read on open; notifications support individual/all-read actions. Sample messages are labelled illustrative; local messages say saved locally, never delivered. Missing conversations recover. Notification n3 links explicitly to c1; other fixture notifications truthfully explain no destination. They do not route to arbitrary newly created applications. Fixture relative time labels lack absolute dates; redesign their data contract when connecting real events.

## 12. Profile and settings

All six menu destinations are implemented. Profile name/initials and application/favorites/unread statistics derive from providers. Optional Personal Information validates bounds/email/phone/university/control characters, supports Save/Cancel and guards navigation away from dirty edits. Applications retain independent personal details. Security, support and policy screens state unavailable services rather than fake support submission, MFA, password changes or legal acceptance. Logout confirmation preserves Cancel, clears personal/application resources and restores starting favorite/conversation/notification fixtures. No authenticated logout or remote deletion is implied.

## 13. Manager portal

ManagerState clones only p1/p2 into a separate portfolio and maintains scoped applications, tenants, notes and funding reviews. Create/edit property and room paths validate numeric price, count and Single/Shared capacity; reducer rejects invalid room actions and duplicate property IDs. IDs and room variants survive edits. Portfolio availability and metrics recompute; notes/review survive internal screen navigation, reset in a new manager workspace and do not update student data. Approval/rejection/settings explicitly unavailable; no booking or student notification is created. Funding detail states that no student application/files were received.

Manager 'available rooms' and occupancy are illustrative local calculations: active tenant counts plus available counts are not authoritative physical-room inventory. Manager panels currently share a ScrollView and locally mounted editor state. Dirty property forms now use the existing Keep editing/Discard prompt for internal tabs and root removal, extending the prior Cancel-only protection. This is reasonable for tiny fixtures; pagination/virtualization and durable edit policies need definition before remote scale. Manager room creation beyond the first room of a newly created property is not implemented; existing rooms can be edited. Do not claim broader inventory CRUD.

## 14. Privacy and trust boundary

No API/fetch/auth/storage service was found in the app source. No document payloads, URIs, base64, EXIF or credentials are logged or sent. Only bounded font warnings are logged. Source inspections and ownership/race tests support separation; they are not a penetration test. External Unsplash images make network requests, as disclosed in TermsPrivacy. Auth screens validate locally but cannot authenticate; credentials remain form state, so avoid entering real passwords. Formal terms, privacy policy, data-retention rules, consent and operational support do not yet exist.

## 15. Accessibility

Inputs expose labels/required/errors, buttons roles/states, modal choices selected state, list images descriptions or decorative exclusion, controls generally 44dp minimum and document Preview 48dp. Shared sheets manage focus and native Back/Cancel; document modal supports close/back. StarRating contrast repaired. Large-text branches stack important layouts. Bottom tab labels deliberately cap at 1.2 while navigation height adapts up to 2. At 320dp/200%, Favorites, Bookings and Messages visibly wrap within their individual targets, including awkward word breaks; all six tabs remained independently reachable in native checks. This retained density is a usability limitation, not a new redesign or complete large-text accessibility pass. Splash has fixed spring/timing transitions and no reduced-motion subscription; root stack slides likewise need a real reduced-motion audit. Spoken TalkBack/VoiceOver and accessibility certification were not performed. Source review cannot establish announcement timing or rotor/focus order.

## 16. Performance

Main discovery/favorites/bookings/messages/chat/notifications use virtualized lists and stable keys. Home horizontal lists do not nest vertical virtualization. Small finite room/review/FAQ/manager fixture maps are justified. Context callbacks and derived selectors use memoization where useful. Keyboard subscriptions, RAFs and splash timers clean up; stale geometry callbacks are guarded. No confirmed profiler-measured performance defect was found, so no speculative memoization/library refactor. Whole-context updates can rerender consumers; MyDocuments inspects all application files on focus and manager panels are unvirtualized: test at realistic future sizes before optimizing. No frame-rate/memory/physical-device performance certification.

## 17. Dependency audit

No dependencies or lock entries changed. Installed top-level tree is valid (`npm ls --depth=0`, exit 0). All 36 direct dependency/devDependency installed versions match lock entries and satisfy declared ranges. Expo 57.0.28, React 19.2.3, React Native 0.86.3, TypeScript 6.0.3; navigation native 7.5.0/native-stack+tabs 7.20.0; Screens 4.26.2 / SafeArea 5.7.0; Reanimated 4.5.1/Worklets 0.10.1. Expo's installed SDK compatibility tooling, not guessed latest versions, is the basis. Babel retains babel-preset-expo; strict TypeScript remains. React types 19.2.18; Babel preset 57.0.15; document-picker 57.0.3, file-system 57.0.7, image-picker 57.0.20. Local Node 25.8.1/npm 11.11.0 satisfies package engines; CI selects Node 24 via `.nvmrc`, so this audit does not claim an identical local/CI Node runtime. No unnecessary reinstall. Native permission/config changes from prior work require their own standalone build; Expo Go does not prove config-plugin output.

## 18. Test coverage assessment

The 19 test files cover domain reducers/selectors, callbacks, fixture associations, application/room validation, document adapters/lifecycle, real provider transactions, funding races, manager isolation, responsive decisions and keyboard event/geometry controller. VM-native stubs do not perform native layout, navigation transitions, permission UI or screen-reader announcements. Some tests are source-pattern contracts; these are weaker evidence than behavior tests. Existing suites also encoded old inconsistent listing prices: those expected IDs/order were corrected while preserving filtering/limit/sort assertions, and a new inventory-consistency test prevents recurrence. The baseline harness now loads the real route helper and a complete property fixture rather than a malformed partial object. No tests disabled/suppressed and strictness unchanged.

New coverage: missing/unknown/malformed listing routes on 3 screens; invalid recovery destination; missing/stale funding routes; inventory/affordable sort consistency; wrong-property Apply param transition; unsupported onboarding verification claim; shared rating contrast/label; actual student-tab contrast and retained six tabs. Manager dirty-form tests exercise internal tabs, confirmed root removal and unchanged clean navigation. Total 13 new tests, each tied to a demonstrated repair. Further gaps: production navigation integration, automated device E2E, actual native configuration build, iOS and spoken accessibility, large datasets/offline remote images, all-screen full width/text cross-product and process death.

## 19. Android runtime results

Native student checks completed at the original 1080×2400 / density 420 / font 1.0: direct credential-free Home; search → Explore AND filters → Details; favorite remove/re-add; Single Room preselection; five-step application with actual synthetic PDF/PNG/JPEG selection; Self-funded save; exact Status ID `CS-LOCAL-MVBA0S43-01`; grouped MyDocuments and private image preview; NSFAS pending → student-reported confirmed → unsuccessful → parent/guardian alternative funding on that same record; all five Bookings tabs; Favorites comparison; Messages/Chat composer with visible keyboard and truthful local save; Notifications mark-all read; Profile edit; Security/Help/Terms; logout Cancel, logout Confirm, guest Home and empty MyDocuments. The status screenshots retain Single Room and R3500 throughout funding changes. This is local frontend execution, not service delivery.

Evidence: `06-current-details`, `07-room-inventory`, `08-single-preselected`, `10-real-attachments`, `11-review`, `12-saved-status`, `13-my-documents`, `14-private-image-preview`, `15-nsfas-pending` through `18-alternative-funding`, `20-bookings-*`, `21-compare`, `24-chat-keyboard`, `24-chat-local-saved`, `26-notifications-read`, `27-profile-edited`, `31-login-after-logout`, `32-guest-home`, `33-logout-cleared-documents`. Every named PNG has a matching native hierarchy XML; actions and assertions are in `adb-actions.log` and `journeys.log`.

Native test-script interruptions are recorded without counting them as app failures: an initial “Campus” search assertion expected one result but correctly matched four via tags/university text; a comma-specific rent assertion did not account for locale nonbreaking spaces; the generic form helper tried to locate Chat's fixed composer inside its message-list scroll viewport. The corrected queries/observed composer bounds completed those checks. No product change was made to satisfy these test assumptions. Existing emulator Medium_Phone_API_36.1, emulator-5554, Expo Go and pre-existing Metro processes were inspected and preserved. Tests use only synthetic files already in Downloads. No wipe, package reinstall or server replacement. Initial font retrieval interrupted QA: /data was 94% full (392MiB free), while the font endpoint returned HTTP200. A temporary cache-reclamation threshold of 1 is a controlled QA condition, not an application fix; original unset setting was restored after the run. Initial forced-stop reopen remained on Launcher; bounded wait failed, then a warm reopen succeeded. These are recorded as environment/test interruptions, not successful app journeys or a proven product crash.

Manager-native evidence: Dashboard/Properties; existing Single Room price edited 3500→3550 in manager-local state; synthetic property created with Single capacity 1/R3100/two rooms and renamed through Edit; Applications/funding review changed to Needs information and an internal note saved. Leaving and reopening the application confirmed the radio was selected and the exact note remained, before any second edit (`42-manager-retention-asserted`). Tenants, Analytics and Settings opened; Dashboard subsequently showed three properties (`44-manager-dashboard-completed`), then the explicit exit returned to student Home (`45-student-home-after-manager`). Expo Go's floating Tools overlay intercepted Dashboard-centre taps; those overlay captures are not counted as dashboard passes. An unobstructed portion of the actual tab completed the check. No real provider decision was invoked. Manager records had no student private-file controls; stronger owner/isolation assertions come from the actual provider/registry automated tests and source import boundary, not a native authenticated authorization test.

Fresh native file testing here uses Files and private image preview. Camera/Photo Library/denial/unsupported-image/replacement/cancellation paths retain automated coverage and the separately documented prior Android evidence in `docs/ios-dropdowns-native-attachments.md` and `docs/my-documents-application-status-refinement.md`; they were not all repeated in this audit. Prior twelve-case documents/status and keyboard matrices are supporting evidence for unchanged components, not a current whole-product matrix claim.

Additional native checks after the matrix: Login email, Forgot email, Register name, manager multiline property description and manager review note accepted synthetic typing with the complete input above the keyboard. Forgot's result explicitly stated no reset email was sent and no password changed (`auth-forgot-honest-result`). The initial auth helper tap failed after changing the emulator keyboard setting; a settled before/after tap showed normal focus, and the checks passed without app-source changes. An old restoration helper also assumed Main was already active; it was corrected to cold-open the existing bundle before checking Home. These instrumentation interruptions were not counted as passes or silently classified as product defects.

F06 native confirmation passed: Applications from a dirty property form displayed the existing discard prompt; Keep editing retained `Synthetic Unsaved Audit`, and Discard opened the intended application list. Root exit likewise retained `Synthetic Unsaved Root` on Keep editing and returned to student Home only after Discard. Evidence 46–51 contains matching screenshots/XML. No synthetic property was saved in these confirmation checks.

### Current width/text matrix

All twelve representative student cases completed on 16–17 October, with gesture navigation. Each case exercised Home, Explore, Gym+Parking AND filtering (one result), Clear all, Details → Rooms → exact Single Room r1 preselection, Personal field typing with visible keyboard, university sheet/Cancel, leaving the application, Favorites, horizontally revealed Cancelled, Messages and Profile. This covers representative surfaces and interactions, not every screen at every setting.

| Logical width / height | Pixel size at density 320 | 100% | 130% | 200% |
| --- | --- | --- | --- | --- |
| 320×569dp | 640×1138 | Completed | Completed | Completed |
| 411×731dp | 822×1462 | Completed | Completed | Completed |
| 480×850dp | 960×1700 | Completed | Completed | Completed |
| 800×1280dp | 1600×2560 | Completed | Completed | Completed |

`matrix-completed.txt`, `matrix-evidence.json` and matching `matrix-{width}-{scale}-{surface}.{png,xml}` record 120 screenshot/hierarchy pairs. The evidence checker confirmed measured pixel dimensions, selected r1/Single/capacity 1 state, and a focused Synthetic input in the reduced form viewport in every case. Runtime assertions checked complete input bounds and hidden Apply footer while typing. UI hierarchy dumps expose the app only; keyboard appearance comes from the screenshots, not a claimed system-IME XML node.

The interrupted 320dp/200% room check was a helper overscroll: its large flick skipped the action. Bounded 140px swipes reached the full r1 Apply button above the fixed footer (`room-diagnostic-4`) and opened Apply (`room-diagnostic-selected`), then the full case passed. No product change or waived target was used. Remaining awkward narrow-tab word wrapping is described in section 15.

Three-button navigation also completed at 320×569dp/200%: fresh Home, Explore → Rooms → r1 Apply, focused input wholly above the visible keyboard with the sticky footer hidden, observed native Back-button tap dismissing the keyboard, university sheet/Cancel, Cancelled and return to Home. Evidence is `threebutton-320-2.0-*`. The first attempt's top-edge Explore tap stayed on Home; a centre tap completed that navigation. The subsequent centre Home tap hit Expo Go's floating Tools bubble: `threebutton-320-2.0-returned-home` is an overlay interruption, not a successful Home return. A separate Bookings → Home check through an unobstructed portion of the actual tab passed and asserted selected Home (`threebutton-320-2.0-home-return-verified`). No app change was made for these targeting interruptions. Gesture and three-button configurations are both exercised, but this is one additional boundary case, not twelve three-button cases.

Final restoration readbacks confirm 1080×2400, density 420, font 1.0, hardware-keyboard IME override 0, gestural overlay enabled, three-button overlay disabled and the temporary cache threshold unset. Camera permission remains denied with the original flags. All five original synthetic Downloads files remain present with their original recorded sizes. `restoration.txt` and `final-restored-home.{png,xml}` record the final state. Pre-existing emulator and Metro services were not stopped or replaced; only Expo Go was reopened during QA.

## 20. iOS verification status

No iOS runtime is available on this Windows host. The supplied brief reports recent real-iPhone passes for keyboard scrolling, university/relationship selectors, Camera/Photo Library/Files, PNG preview, funding display, MyDocuments and Application Status. That user-reported evidence is retained; it was not independently rerun on this Windows host and does not establish complete iOS journey/PDF coverage. This audit inspected iOS keyboard timing/interactive dismissal, ActionSheet anchoring, source/picker APIs, permission config, safe areas and preview flags. iOS export success is compilation evidence only. Real iPhone keyboard focus, selector accessibility, Camera/Photo Library/Files return, permission denial/cancellation, preview Back, safe areas and text-size matrix remain required manual checks.

## 21. Expo Doctor findings

`npm run check:dependencies`: exit 1. Expo 57.0.28 expected~57.0.30 and expo-asset57.0.19 expected~57.0.20. `npm run doctor`: 19/21, exit 1: compatibility patches plus tracked `.expo/devices.json`. `.expo/` is already ignored; blindly adding the ignore line would not remove tracked files. These findings are unchanged from the recent baseline. CI includes the same dependency check and cannot be reported green. No upgrade, exclusion, force/legacy-peer-deps, lock rewrite or Git untracking was used to hide failures. The audit explicitly forbids dependency upgrades and Git tracking changes; resolve these in a separate authorized baseline task.

## 22. Confirmed defects

| ID | Severity | Reproduction / actual vs expected | Root cause / evidence | Status / tests / risk |
| --- | --- | --- | --- | --- |
| F01 | P1 | Invoke Property, Apply, AppStatus or UpdateFunding with missing params: TypeError instead of usable unavailable/recovery state; unknown property could crash Details | Actual exported-screen harness reproduced all 4; unguarded destructuring/lookup | Repaired guards, exact recovery and changed-Apply-property test. Valid snapshot shape is checked, not general external input security |
| F02 | P2 | Compare p3/p4/p5 cards/filter/compare with their Rooms:4100vs2600,6200vs3800,3900vs2400 | Duplicated listing price stale; room-derived Details helper and data inspection | Three metadata values corrected; all current fixture prices/counts and affordable ordering tested. Future server inventory still needs one authoritative source |
| F03 | P2 | Open first Onboarding slide: “verified student accommodation” despite absent verification | Hardcoded copy, source and screen callback | Removed claim; explicit regression. Onboarding native visual matrix remains unverified |
| F04 | P2 | Read normal-sized shared rating on white/slate50: decorative amber text below 4.5:1 | Numeric colour calculation and live screenshots; UI StarRating consumers audited | Existing semantic amber used; numeric contrast and spoken-label regression. Spoken screen-reader behavior unverified |
| F05 | P2 | Read inactive student tab labels/icons on Home/Explore: slate400 on white measures 2.56:1 | Actual root tab options and native captures; small normal text needs 4.5:1, essential icons 3:1 | Only inactive tint changed to existing slate600; actual MainTabs configuration contrast/six-tab regression. No tab routes, dimensions or icons changed |
| F06 | P2 | Manager → Properties → Add/Edit → change name → Applications or exit workspace: edits disappear without the existing discard confirmation | Actual ManagerScreen harness reproduced alerts=0 and form removed; internal goTo cleared editor state, root removal was unguarded | Repaired with existing prompt for tabs/Cancel and usePreventRemove for root exit; three behavior tests and native Keep editing/Discard retention/navigation checks (section 19). Unsaved room-price/review-note drafts remain separate, session-only controls |

No confirmed P0 was identified in the reviewed source/tests/runtime scope. This is not proof that none exists. No separate P3 repair was necessary. ENV01 below is a release/development gate, not a fabricated frontend feature defect.


## 23. Targeted repairs and checks

Only the six demonstrated defects were repaired. No keyboard strategy, document ownership mechanism, manager/student state joining, backend service, persistent storage, real authentication, remote upload, payment, booking confirmation or unsolicited new feature was introduced. All prior work remains part of the task-start baseline. A focused task-only patch distinguishes these repairs from earlier uncommitted work.

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, exit 0, strictness retained |
| `npm run lint` | Passed, exit 0, zero warnings |
| `node --test --test-reporter=tap scripts/*.test.cjs` | All 19 test files (the targets of all 19 existing `test:*` scripts): 543 tests, 543 passed, 0 failed/skipped/cancelled |
| `npm ls --depth=0 --json` | Passed, exit 0; 36 direct installed/locked versions agree and satisfy manifest ranges |
| `npm run check:dependencies` | Exit 1, two existing SDK patch recommendations |
| `npm run doctor` | Exit 1, 19/21 checks; existing patch guidance and tracked device state |
| `npm run export:check` | Passed, exit 0; Android and iOS Hermes bundles, each 5.4MB |
| `git diff --check` | Passed, exit 0; task-specific UTF-8/trailing-whitespace scan also passed |

Final bundle files: Android `AppEntry-a71294bc55b9f1c18e79671a1abdef60.hbc`, iOS `AppEntry-0a975e169aa3619c577a555a5aab85ca.hbc`. Logs: `final-typecheck.log`, `final-lint.log`, `final-tests.log`, `final-exports.log`, `dependencies.log`, `doctor.log`, `installed.json`, `diff-check.log`. The resumed sandboxed export first failed because Hermes could not write its temporary index.hbc (export-sandbox-failure.log). The authorized rerun outside that filesystem restriction passed for both platforms; this was an environment failure, not a TypeScript/Babel repair. No remote CI run was triggered. Exports are compilation evidence, not device execution.

Task files (17): `App.tsx`; `src/components/UI.tsx`; `src/data.ts`; new `src/navigation/routeProperty.ts`; `src/screens/{Property,Apply,AppStatus,UpdateFunding,Onboarding,Manager}Screen.tsx`; `scripts/{baseline,discovery,explore,property-details,ui-components,phase-e}.test.cjs`; this report. The new tests extend existing suites already invoked in CI, so neither CI nor package scripts required editing. Snapshot-relative `task-only.patch` and `preservation.json` distinguish this task from earlier changes. Package/lock/dependency config, theme tokens, room offerings and stable IDs remain unchanged except the three documented current listing price fields in data.ts.

### Exact files changed in this audit

| File | Focused change |
| --- | --- |
| `App.tsx` | Inactive student-tab tint only |
| `src/components/UI.tsx` | Rating text contrast and numeric accessibility label |
| `src/data.ts` | Correct p3/p4/p5 current starting rents; no room/history changes |
| `src/navigation/routeProperty.ts` (new) | Shared known-listing snapshot guard |
| `src/screens/PropertyScreen.tsx` | Invalid-listing recovery with stable hook order |
| `src/screens/ApplyScreen.tsx` | Missing/unknown/wrong-property draft recovery |
| `src/screens/AppStatusScreen.tsx` | Missing params/property recovery |
| `src/screens/UpdateFundingScreen.tsx` | Missing application-ID recovery |
| `src/screens/ManagerScreen.tsx` | Protect dirty property forms across tabs and root removal |
| `src/screens/OnboardingScreen.tsx` | Remove unsupported verification claim |
| `scripts/baseline.test.cjs` | Real route-helper fixture loading; actual tab-contrast check |
| `scripts/discovery.test.cjs` | Expected affordable IDs reflect corrected rents |
| `scripts/explore.test.cjs` | Corrected price-filter/order expectations, retained exclusion/limit checks |
| `scripts/property-details.test.cjs` | Route/inventory/preselection/copy regressions |
| `scripts/phase-e.test.cjs` | Dirty manager tab/root removal and clean-navigation regressions |
| `scripts/ui-components.test.cjs` | Measured rating contrast and label regression |
| `docs/campusstay-full-frontend-audit.md` (new) | This full audit, evidence, limits and readiness assessment |

## 24. Unresolved issues and limitations

- ENV01: existing Expo patch guidance and tracked device metadata keep Doctor/dependency gates failing. Separate approval/change required.
- Native iOS, physical Android and standalone builds unverified; spoken accessibility unverified.
- Runtime width/text checks must be read at their stated scope; prior document/keyboard-only matrices do not establish whole-product compliance.
- Native PDF rendering intentionally unavailable; no broken success action substituted.
- In-memory session state and temporary file expiry are explicit design constraints; OS process death can lose drafts/records. No persistence was added.
- Backend-only gaps: authenticated roles/ownership, real listing verification, live inventory, submission/delivery, private remote files, actual reviews, booking lifecycle, payments, provider decisions and operational policies/support.
- Potential risks requiring future evidence: large-scale rerenders, full modal screen-reader focus, reduced motion on retained Splash/root transitions, complete onboarding enlarged-text layout. These are not presented as repaired or fully verified.

## 25. Future backend integration boundaries

| Boundary | Smallest safe future contract |
| --- | --- |
| Identity/roles/ownership | Auth service and server authorization; manager visibility cannot rely on MANAGER_PROPERTY_IDS or navigation |
| Listings/room inventory | Repository returning stable property+offering IDs; distinguish listed units, occupants and real availability; derive starting rent/counts from eligible inventory |
| Favorites | Per-user association with explicit session migration policy |
| Applications | Immutable accepted room/rent/contact snapshot, validation errors, idempotent submission and versioned updates |
| Private files | Authenticated object ownership, scoped upload/download, retention/deletion, scanning and audit events; keep metadata separate from transport handles |
| Funding | Preserve source, student outcome, evidence and authorized review as independent fields; optimistic concurrency for exact application |
| Reviews | Property-linked authorship, dates and provenance; never promote illustrative examples into real reviews |
| Booking/payments | Separate application from offer/reservation/contract/payment lifecycle; no inference from local status |
| Messages/notifications | Conversation participant authorization, server IDs/timestamps/delivery/read contracts, notification target IDs and deduplication |
| Audit/policies/support | Authorized append-only operational history, accurate privacy/retention terms and real support channels |

Keep current domain helpers/provider APIs as seams initially; introduce typed repository/service interfaces when the backend contract is approved. Avoid a global state-library rewrite. Manager fixtures and student private records must remain isolated until server-scoped access is implemented. Centralize route ID resolution and shared inventory projection when remote data begins; do not move private URIs into route params or general app records.

## 26. Recommended next phase

1. Resolve the existing SDK patch/tracked-state gate in a separately approved, bounded baseline task.
2. Close current iPhone/standalone/native-accessibility and full product responsive verification gaps; reproduce any remaining layout/navigation issues before repairs.
3. Define identity, ownership, room inventory, immutable application and private-document contracts with explicit operational policies.
4. Implement the approved backend in increments, preserving truthful UI state and testing authorization/ownership/idempotency at the service boundary.

No next phase has begun. Audit results do not authorize connecting real accounts, documents or payments.
