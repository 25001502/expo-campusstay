# Bookings & Messages final polish

## Audit and plan (before implementation)

Read the complete micro-refinement brief, apple-design skill, previous refinement report, current screen/helper/provider/navigation/theme/UI code and regression tests. No applicable AGENTS.md was found. The initial dirty tree, index diff and file hashes are saved in `.expo/bookings-messages-micro/`; all **360 existing tests pass** before edits. No installation or dependency change is planned.

- Preserve all five categories: Applications, Upcoming, Active, Completed and Cancelled. Current selected-tab reveal always uses tab x minus 4 and relies on native clamping; it ignores viewport/content width and adjacent-label boundaries. Replace this with measured, clamped, minimal reveal and prefer whole neighboring tabs where space permits. Wait for valid measurements and retain manual scrolling and route state.
- Three booking fixtures are illustrative reference records, distinct from ApplicationContext's student-created, session-only applications. Put the fixture explanation once beneath the category strip and once on its detail destination; retain each fixture's unchanged status, ID, room, date, price and property association. Keep local application wording and timeline intact.
- Message provenance already distinguishes local sends (`source: local`) from seed messages. Keep that contract. Present illustrative context once at list/conversation level, retain provenance in accessibility labels, remove repeated Example timestamp prefixes and suppress relative seed dates without a date basis. Mark local message timestamps as saved locally so new user text remains distinguishable.
- Keep the existing row structure, avatars, name/property/preview hierarchy and large-text expansion. Preserve provider-owned messages, IDs, order, unread counts and logout resets; add no parallel state or external communication.
- The current composer uses a flex layout, Android height/iOS padding keyboard avoidance, safe-area padding and bounded multiline input. Inspect full native captures with keyboard closed/open before changing layout. Retain the existing pending-scroll and synchronous duplicate-send guards. Test gesture/three-button navigation where available; report any runtime blocker accurately.
- Add focused behavior regressions using the existing harness; run strict TypeScript, lint, every suite, Expo dependency/Doctor checks, Android/iOS exports and diff review. Capture native evidence in a new ignored folder, preserve previous evidence, and restore any device settings changed.

## Implementation

The same CampusStay design is retained: navy/blue tokens, Outfit/Inter, imagery, card shapes/shadows, blue avatars and outgoing bubbles, white incoming bubbles, buttons, underline and student navigation. No dependency, theme, data fixture, provider, application-flow or manager-portal changes were made.

**Bookings:** all five categories remain. The reveal helper waits for complete finite tab/content/viewport measurements, clamps offsets, retains a fully visible selection when useful, and prefers tab boundaries that avoid tiny neighboring-label fragments. It considers the current offset rather than always pushing the selection to the left. Manual horizontal scrolling remains native; initial/reselection reveal does not animate. Existing selected accessibility state and natural-height touch targets remain. Route parameters still own category selection and detail returns.

One contextual line, “Illustrative booking records · Not actual stays”, replaces repeated fixture-card disclaimers. Cards retain the original property, reference, date, room, monthly rand amount and status. Booking detail independently identifies the illustrative record and does not show fabricated approval/payment milestones. Session-created applications remain in Applications with their genuine local ID/selected room/date and existing no-booking/provider-receipt wording. Historical fixture room labels remain independent of current property inventory; no unsupported room ID or date was invented.

**Messages:** the existing row arrangement, padding, avatar, divider, unread badge and natural large-text expansion are retained. Removing repetitive Example timestamp prefixes gives the name/time row more room. Previews continue to derive from the actual final message rather than cached text. Valid fixture clock labels remain; unsupported relative dates and malformed clocks are omitted. The list has one illustrative/session context line. A shared provenance predicate keeps mixed histories identifiable after a local send; accessibility labels distinguish illustrative content and local user text. Local previews say “Saved locally”. No fixture reply, unread count, date or identity was fabricated.

**Chat:** illustrative context appears once in the persistent header. Repeated visual Example labels are removed from bubbles; provenance remains in their accessibility labels, while user-created messages say “Saved locally”. Original bubble colours, widths, corners, wrapping and timestamps remain. Property navigation still resolves explicit IDs, and missing conversations/properties retain safe fallbacks.

## Composer investigation and scroll fix

Full 1080×2400 native captures before editing showed the complete input and Send button with keyboard closed. The screenshot concern did not justify a composer redesign or speculative safe-area padding change. The existing flex layout, iOS padding/Android height KeyboardAvoidingView, bottom/lateral safe areas, multiline limits and 44dp Send target are retained.

The emulator initially opened a floating handwriting panel. Temporarily changing its recorded handwriting/software-keyboard settings, followed by app reload, enabled a docked Gboard keyboard. Native multiline-send testing then exposed a real follow-latest failure: a new long bubble could remain below the keyboard-constrained viewport. Testing the first adjustment also revealed a three-button timing case; failed attempts are retained and are not counted as passes.

The final fix tracks explicit reader drag/momentum separately from programmatic resize/scroll events. It scrolls using measured native content and viewport heights, rather than FlatList's estimate for variable-height cells. Layout changes coalesce into one requestAnimationFrame callback, which reads the latest measurements, respects a reader drag and is cancelled on cleanup. It preserves the existing pending-send and synchronous duplicate-send guards. This adds no visual animation, timer loop or library. A stable native list test ID supports checking the loaded screen. No measured performance improvement is claimed.

## State, accessibility and regressions

ApplicationContext and CommunicationContext remain the sole in-memory sources. Exact application/conversation/property IDs, local message ordering, actual local-clock timestamps, read/badge synchronization, notification n3 navigation, logout reset, direct Home entry and Continue without signing in are preserved. No network request, backend, persistence, authentication, upload, payment, booking confirmation, provider decision, external send, typing status or receipt was introduced.

All previous tests are retained. Existing copy assertions were updated to require the new truthful fixture context. Behavior tests cover the original Apply/save/Profile relationship, local application versus fixture separation, navigation back, local send/clear/repeated taps, unread/reset semantics and property links. Additional cases cover complete/clamped tab measurement and all width/text combinations, mixed provenance, valid/unsupported clock labels, long content, reader intent, measured scrolling and frame coalescing/cancellation. The existing harness now exposes an explicit frame queue for those callbacks; native rendering/effects remain separate from harness tests. Accessible selected/disabled states, full-content labels, unread descriptions, decorative avatars and uncapped content text remain. No spoken TalkBack verification is claimed.

## Automated verification

Final results are recorded under `.expo/bookings-messages-micro/`. No installation or dependency upgrade was performed. The installed baseline remains Expo 57.0.28, expo-asset 57.0.19, React Native 0.86.3, React 19.2.3 and TypeScript 6.0.3; package.json and package-lock.json are unchanged by this task.

| Exact command | Result |
| --- | --- |
| `npm run test:baseline` | 5 passed |
| `npm run test:ui` | 6 passed |
| `npm run test:discovery` | 14 passed |
| `npm run test:application` | 24 passed |
| `npm run test:phase-d` | 37 passed |
| `npm run test:phase-e` | 36 passed |
| `npm run test:phase-f` | 16 passed |
| `npm run test:profile` | 53 passed |
| `npm run test:home` | 26 passed |
| `npm run test:explore` | 39 passed |
| `npm run test:favorites-profile` | 48 passed |
| `npm run test:bookings-messages` | 67 passed |
| **Total** | **371 passed: existing 360 plus 11 focused cases** |
| `npm run typecheck` | Passed, strictness retained |
| `npm run lint` | Passed, zero warnings |
| `npm run export:check` | Passed, Android/iOS Hermes exports (exit 0) |
| `npm run check:dependencies` | Flags newer Expo 57.0.29 and expo-asset 57.0.20 patches |
| `npm run doctor` | **20/21**, same patch-version check fails |
| `git diff --check` | Passed (exit 0), using repository line-ending configuration |

The earlier 21/21 Doctor result is historical. Current live Expo compatibility tooling requests newer patch versions; the brief expressly prohibits upgrades. No exclusions, force installs, suppressed diagnostics or peer-resolution workaround were added to conceal that finding. This remains an explicit dependency-verification limitation for a later authorized maintenance task.


## Files changed in this task

| File | Purpose |
| --- | --- |
| `src/bookings.ts` | Typed, measured selected-tab offset calculation |
| `src/communication.ts` | Shared illustrative-history predicate and concise valid clock labels |
| `src/screens/BookingsScreen.tsx` | Measured strip reveal and one reference-record context line |
| `src/screens/AppStatusScreen.tsx` | Concise, accurate illustrative-detail banner |
| `src/screens/MessagesScreen.tsx` | Context/provenance presentation and uncluttered timestamps |
| `src/screens/ChatScreen.tsx` | Persistent illustrative context, local bubble labels and measured/coalesced scrolling |
| `scripts/bookings-messages.test.cjs` | Focused regressions and updated behavior expectations |
| `scripts/phase-d.test.cjs` | Preserve truthful-record assertion with refined wording |
| `scripts/profile-harness.cjs` | Explicit controllable animation-frame queue for scroll tests |
| `docs/bookings-messages-final-polish.md` | This audit, implementation and verification report |

No package, lockfile, CI, theme, data, provider, manager, Home, Explore, Favorites or Profile source changes are part of this task. All nine modified files existed in the initial dirty tree; the report is the only new non-ignored file. The review patch is relative to that starting tree rather than HEAD, so it isolates this task from previous phases.

## Android runtime evidence and limits

Used the existing Medium_Phone_API_36.1 emulator (Android 16/API 36, emulator-5554). Inspected both pre-existing Metro listeners; no new server was started and neither existing server was stopped. Reused the verified localhost listener on 8081 with ADB reverse. Expo Go was restarted during cold-launch/reconfiguration checks; no emulator data, app files or repository work was wiped.

Current representative checks (not a claim of the complete 12-configuration native matrix):

| Width / text | Native checks in this task |
| --- | --- |
| ≈411dp / 100% | Five categories, booking detail/return, both conversations/property link, composer, gesture/three-button navigation, local sends; final docked-keyboard capture and real A-key touch verified |
| ≈411dp / 130% | Completed reveal/reselection, Applications, conversation rows, composer and keyboard open/closed |
| ≈411dp / 200% | Same screens plus long multiline local send, clear, latest feedback, timestamp and preview |
| 320dp / 200% | Same flow, plus scroll-reachable empty-state action; latest timestamp verified after keyboard dismissal |
| 480dp / 200% | Same flow, long multiline local send/clear/latest feedback/preview and keyboard dismissal |
| 800dp / 100% | Completed/Applications, Messages, Chat and composer with keyboard closed/open |

Physical configurations were 1080×2400/density420, 840×1800/420, 1440×2880/480 and 1600×2560/320 respectively. The new automated layout contracts cover all four widths at 100/130/200%; they are not physical rendering tests. Other native width/text combinations were not repeated here. The previous nine-phone Android results and evidence remain untouched in `docs/bookings-messages-refinement.md` and `.expo/bookings-messages/`.

All five actual booking categories were selected. Completed retained its exact p3/#CS-19845 detail association and returned to Completed. Applications retained its separate empty/populated state contract. Native c1 sends updated the same conversation preview and cleared its unread state; c2 opened Varsity Heights through its explicit property ID. The existing automated suites verify the full five-step local application journey, Bookings/Profile counts, notification links, logout resets, all student routes and manager separation. The full Apply journey and manager portal were not re-executed natively in this micro-refinement.

The keyboard-closed composer was fully visible before editing. Docked-keyboard native checks now include gesture and three-button navigation. The final three-button capture shows the actual Gboard keys, input and complete Send button; touching its visible A key inserted A into the composer. Earlier three-button captures had an unpainted keyboard-key area, and some captures after live display changes partially painted the Messages heading. Fresh cold-launch captures show the full keyboard and full 320dp/200% heading. No screenshot was edited. Live display-reconfiguration rendering still warrants physical-device confirmation; it is not claimed to be universally resolved by app code.

At 320dp/200% the keyboard leaves a small message viewport. A very long bubble requires scrolling; its timestamp and feedback need not fit simultaneously. Local feedback was visible with keyboard open, and the timestamp was checked after dismissal. The empty Applications action is likewise reachable by vertical scrolling, rather than forcing all enlarged content into the initial viewport.

Expo Go sometimes returned to its developer sheet or launcher after display changes. Its remembered LAN project URL also produced “Packager is not running at http://10.10.21.49:8081”. Reopening the verified localhost experience recovered testing; a single foreground recovery was needed after some display changes. Bounded failed startup/scroll attempts are retained as findings and are not counted as passes. The previously blocked tablet width was exercised successfully at 100% in this task; tablet 130/200%, physical devices and iOS runtime remain unverified. iOS export success is not iOS execution. Spoken TalkBack and measured frame performance were not tested.

Representative full screenshots and matching native hierarchies are under `.expo/bookings-messages-micro/`:

- `tabs-beginning.png`, `completed-selected.png`, `standard-20-completed.png`
- `messages-list.png`, `large-20-messages.png`, `tablet-10-messages.png`
- `narrow-20-fresh-heading.png`, `narrow-20-empty-action-reachable.png`
- `threebutton-final-closed.png`, `threebutton-final-keyboard.png`, `threebutton-final-local.png`
- `standard-20-sent-keyboard.png`, `large-20-sent-keyboard.png`, `narrow-20-keyboard-dismissed.png`

No external message delivery, booking confirmation or provider activity was claimed. The remaining work for real communication/bookings requires a separately authorized backend phase; none was started here.

## Final restoration and preservation review

The final native keyboard send cleared the composer and updated c1's preview. Logout Cancel preserved that local message; confirmed logout removed it and restored the two seed unread messages. Continue without signing in returned to Home without credentials. `logout-reset-messages.png` and `final-home-restored.png` record the end of the journey.

Restored and verified the original emulator configuration: physical 1080×2400 with no size override; density 420 with no override; font_scale 1.0; gesture navigation (navigation_mode 2); show_ime_with_hard_keyboard 0; stylus_handwriting_enabled unset/null. The original AVD remains running on student Home. Existing Metro processes and repository index were retained.

The final task-start hash comparison reports exactly the nine intended existing-file modifications, no missing files and no unexpected changes. The staged diff is unchanged, including the previously approved `.expo` tracking removals, and both local `.expo` files still exist. The only new non-ignored file is this report. No reset, clean, discard, staging, commit or push was performed. Final `git diff --check` passes under the repository's configured line-ending rules.

The focused review artifact is `.expo/bookings-messages-micro/refinement.patch`, generated read-only against the task-start copies; `preservation.json` records the hash/index audit. All prior phase documentation and evidence are retained. Stop here: no backend or unrelated screen implementation was started.
