# UI Phase F: frontend stabilization and verification

## 1. Audit scope

Phase F reviewed the current Expo SDK 57 frontend without changing its product
scope. The audit covered startup, navigation, all student and manager surfaces,
session state, validation, responsive behavior, accessibility metadata, error
handling, build compatibility, CI, and Android execution. No backend,
authentication service, persistence, upload, payment, external messaging, or
booking confirmation was added.

The working tree was inspected before editing. Existing Phase 1-E dependency and
configuration changes were preserved. No reset, clean, commit, or push was run.

## 2. Screens reviewed

### Student

Android runtime rendering was verified for Home, Explore, Favorites, Compare,
Property Details, Apply, Application Status, Bookings, Messages, Chat,
Notifications, Profile, and Login. Rooms, About, and comparison-to-property
navigation were exercised. A complete fictional application was saved locally
and reopened from Bookings.

Splash, Onboarding, Register, and Forgot Password were statically reviewed and
covered by focused automated checks. Their navigation contracts remain
registered. A current-session Android pass did not manually exercise every
field on Register or Forgot Password.

### Manager

Android runtime rendering and navigation were verified for Dashboard,
Properties, Property Details and room controls, Applications, Application
Details, More, Tenants, Analytics, Settings, and the return to student Home.
Add Property and Edit Property forms were statically reviewed and their
validation, stable IDs, duplicate protection, reducer transitions, derived
totals, and local-only behavior were covered by automated tests. A full property
creation/edit transaction was not manually completed on the emulator in this
pass.

## 3. Issues discovered

- Property Details always opened conversation `c1`, including for unrelated
  properties.
- One manager tenant referenced a room that did not belong to the tenant's
  property.
- Manager property search claimed university support but searched only raw IDs.
- Direct reducer actions could save invalid room values even though the form
  rejected them.
- Onboarding used a module-level screen width and did not fully account for safe
  areas or expose Skip clearly to accessibility services.
- Discovery filters could become unreachable on a constrained viewport.
- Several decorative image states were exposed to accessibility services.
- Application Status could receive an invalid combination of parameters and
  previously had an invented reference fallback.
- Student and manager bottom-navigation labels clipped at large text sizes.
- Expo Doctor found tracked machine-specific `.expo` files despite the ignore
  rule.
- An existing Metro process occupied port 8081, while a second non-interactive
  launch could not take over that port.

No P0 defect was found. The property-to-conversation mismatch was treated as P1
because it could show the wrong local conversation. The remaining confirmed
issues were P2 or P3 consistency, accessibility, and responsive defects.

## 4. Issues fixed

- Property messaging now resolves only the conversation explicitly linked to
  the current property. Properties without a matching conversation show honest
  unavailable feedback.
- Manager tenant `mt-3` now references a room owned by property `p2`.
- Manager search resolves university names and abbreviations, and room reducer
  updates independently validate price and availability.
- Onboarding now uses `useWindowDimensions`, safe-area-aware spacing, an
  accessible Skip action, and accurate product language.
- Explore filters use a bounded vertical scroll area. Property CTA spacing,
  amenities, student tabs, manager cards, and manager navigation respond to
  viewport, safe area, and text scale.
- Compact tab labels use a bounded multiplier while the tab controls retain
  their complete accessible names. This prevented six-tab truncation at 200%
  Android text scale.
- Decorative remote-image overlays and nested card images no longer add screen
  reader noise. Low-contrast property text uses semantic muted text color.
- Application Status parameters are a typed union. Missing or mismatched local
  records render an unavailable state rather than an invented reference.
- The tracked `.expo/README.md` and `.expo/devices.json` entries were removed;
  `.expo/` remains ignored.
- Nine focused Phase F regression tests cover the defects above. CI and README
  include the Phase F suite.

## 5. Runtime environment

- Windows host; Node 25.8.1 and npm 11.11.0 during this pass. The repository
  continues to declare Node 24 in `.nvmrc` for reproducible development and CI.
- Android emulator: Android 16 / API 36, 1080x2400 physical display, density
  420.
- Expo Go: 57.0.9 (version code 444), running an SDK 57 manifest.
- Expo package: 57.0.28; local Expo CLI reported 57.0.29.
- Android runtime loaded the development bundle from localhost and logged
  `Running "main"`.
- iOS native execution was unavailable on this Windows host. The iOS Hermes
  export completed successfully.

## 6. Expo Go connection diagnosis

Port inspection established that an existing Node/Expo process already owned
8081. Starting another non-interactive Expo process therefore exited instead of
providing a second usable server. The existing server answered `/status`, and
ADB already supported reverse mappings.

The successful bounded recovery was:

1. Verify the existing Metro process and its project command line.
2. Confirm `http://127.0.0.1:8081/status` responds.
3. Apply `adb reverse tcp:8081 tcp:8081`.
4. Launch `exp://127.0.0.1:8081` in Expo Go.
5. Confirm the manifest requested the Android bundle and React Native logged
   `Running "main"`.
6. Inspect real rendered screens and accessibility hierarchies.

Later, Android's UI-inspection helper and the Expo Go process entered an
uninterruptible I/O state during repeated hierarchy capture. There was no
ReactNativeJS or Android fatal exception. One emulator reboot recovered the
environment. Compare was then reopened with a bounded screenshot-only check and
rendered correctly. The earlier reported remote-update failure was not
reproduced, so no root cause is claimed for that separate observation.

## 7. Student journey results

1. **Discovery:** Home, Explore, Property Details, result counts, filters, sort
   controls, and property navigation rendered on Android. Combination and empty
   recovery behavior passed automated tests.
2. **Favorites:** the shared saved state rendered two properties, comparison
   selection updated from 0 to 2, and duplicate/removal behavior passed tests.
3. **Comparison:** two saved properties rendered in the horizontal comparison,
   best values were identified, and View Property returned to the exact property.
4. **Application:** Private Room was preselected from Property Details. Fictional
   personal data, the three required document categories, and an emergency
   contact progressed through all five steps. Review showed the entered data.
   Saving created `CS-LOCAL-...-01`, with explicit statements that no provider
   received it, no files were uploaded or verified, no decision was made, and no
   booking was confirmed.
5. **Bookings:** the saved application appeared under Applications with the
   same property, room, price, and ID, separately from booking tabs.
6. **Messaging:** opening a conversation cleared unread state; `PhaseF local
   check` remained visible after send with an explicit session-only delivery
   notice. The property link and preview/state reducers were verified.
7. **Notifications:** opening an unread notification reduced the count and
   produced accurate unavailable-destination feedback. Mark-all behavior and
   missing-record handling passed automated tests. The Expo Go floating tools
   button overlapped the visual mark-all control, so mark-all was not tapped
   manually in this dev-client session.
8. **Profile and logout:** Cancel preserved state. Confirm opened Login; Continue
   without signing in returned to Home without credentials or stale back-stack
   navigation. Fresh launch still opens Home directly.

## 8. Manager journey results

1. Dashboard rendered 2 properties, 20 available rooms, 3 active tenants, 2
   awaiting applications, and 13% occupancy.
2. Properties rendered the scoped portfolio, search/filter controls, exact IDs,
   property details, and room editors.
3. Property creation required fields, stable IDs, duplicate prevention, and
   dashboard derivation passed automated tests; the full form was not saved
   manually on Android during this pass.
4. Property editing preserved stable IDs and seed immutability in automated
   tests; its populated controls rendered in the runtime workspace.
5. Room management rendered the correct rooms; reducer tests rejected invalid
   prices and fractional/negative availability and recomputed totals.
6. Applications rendered three scoped records. Details and local review notes
   were available; Approve and Reject remained visibly unavailable and could not
   change state.
7. Tenants rendered correct property/room relationships, including Keanu
   Williams at Varsity Heights / Apartment. Search and property filters passed.
8. Analytics rendered 13% portfolio occupancy, matching Dashboard, with 14% and
   11% per-property summaries.
9. Dashboard, Properties, Applications, More, Tenants, Analytics, and Settings
   navigation rendered with selected states and safe-area spacing. Return to
   Student Home did not expose manager controls in student tabs.

## 9. Responsive testing

Android runtime checks covered:

- Standard: 1080x2400 at density 420 (about 411x914 dp).
- Narrow: temporary 900x2000 override (about 343x762 dp).
- Larger: temporary 1440x2560 override (about 549x975 dp).
- Text scale: 1.0, 1.3, and 2.0.

The narrow and larger Home layouts, horizontal cards, filter chips, and bottom
tabs remained reachable. At 200% text scale content wrapped and remained
scrollable; compact tab labels were adjusted after runtime evidence showed
truncation. Full action names remain available through accessibility labels.
All temporary emulator size, density, and font-scale settings were restored to
1080x2400, 420, and 1.0.

## 10. Accessibility findings

Runtime hierarchy inspection confirmed named tabs, selected states, named
favorite/comparison controls, radio selection for the preselected room, required
form labels, required document checkboxes, progress descriptions, status
descriptions, manager navigation labels, and honest unavailable-state dialogs.
Touch targets use the existing 44 dp control minimum. Decorative image states
are hidden from accessibility services.

Spoken TalkBack output was not exercised, so this phase does not claim complete
TalkBack or WCAG conformance. Expo Go's developer-tools overlay was present in
screenshots and can overlap top-right app controls; it is not part of CampusStay
or production exports.

## 11. Performance findings

Lists use stable record IDs or stable data labels, and discovery state uses the
existing centralized selectors. The only application timers are the bounded
font wait and splash timer; both clean up on unmount. No subscriptions or
unbounded reply simulation were found. Remote images have bounded loading/error
states. No new memoization was added without evidence.

Android `dumpsys` for the shared Expo Go development process reported 420,332 KB
total PSS, 406,024 KB total RSS, and 29.33% janky frames over 225 accumulated
frames. These values include Expo Go, development instrumentation, repeated
configuration reloads, and the floating tools overlay; they are diagnostic only
and are not a production CampusStay benchmark. No ReactNativeJS or Android fatal
error was present after the final journeys.

## 12. Automated verification

Final results:

- `npm run typecheck`: pass.
- `npm run lint`: pass with zero warnings.
- `npm run test:baseline`: 5/5 pass.
- `npm run test:ui`: 6/6 pass.
- `npm run test:discovery`: 14/14 pass.
- `npm run test:application`: 24/24 pass.
- `npm run test:phase-d`: 37/37 pass.
- `npm run test:phase-e`: 36/36 pass.
- `npm run test:phase-f`: 9/9 pass.
- Total: 131/131 tests pass.
- `npm run check:dependencies`: dependencies up to date against Expo guidance.
- `npm run doctor`: 21/21 checks pass using online Expo metadata.
- `npm run export:check`: Android and iOS Hermes bundles exported successfully
  (1,569 Android modules; 1,572 iOS modules). The first sandboxed attempt reached
  Hermes but could not write its temporary bytecode file; the same command
  passed with the required filesystem permission.
- `git diff --check`: pass.

CI installs from the lockfile and runs typecheck, all seven test suites, lint,
Expo dependency validation, and the Android/iOS export check. Doctor was run
separately in this pass because its metadata checks require live Expo services.

## 13. Remaining limitations

- **P0/P1 confirmed defects:** none remaining from this audit.
- **P2 unverified runtime behavior:** spoken TalkBack behavior; iOS native
  rendering; a complete manual manager add/edit save; mark-all notification tap
  underneath the Expo Go developer overlay.
- **P3 environment limitations:** development profiling numbers are polluted by
  Expo Go and repeated emulator configuration changes. The current shell used
  Node 25 although the repository and CI target Node 24.
- Authentication, authorization, external messaging, push delivery, uploads,
  provider decisions, inventory reservation, payments, leases, and booking
  confirmation remain backend-dependent by design.

## 14. Backend integration boundaries

Favorites, applications, manager edits, messages, notifications, and account
interactions remain in memory only. Login/Register/Forgot Password validate and
explain availability but create no identity or session. Manager access is a
separate UI route without role enforcement. No API client, database SDK,
persistent store, payment provider, file upload, or remote event service exists.

## 15. Frontend readiness assessment

**Frontend ready with documented limitations.** Android real rendering, the
complete student application path, manager navigation, responsive variants,
131 focused tests, Expo compatibility checks, and both platform exports pass.
Backend integration can begin after its architecture and security model are
defined. Native iOS, spoken TalkBack, and production-build performance should be
included in the next platform QA cycle rather than inferred from Expo Go.
