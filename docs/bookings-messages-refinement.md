# Bookings & Messages refinement

## Initial audit and implementation plan

Read the supplied Bookings & Messages brief and apple-design skill before editing. No applicable AGENTS.md was found. The initial dirty tree and staged diff are recorded under `.expo/bookings-messages/`; preserve all previous phases and refinements.

Verified installed baseline: Expo 57.0.28, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3, React Navigation 7.5.0. All 304 existing automated tests passed before changes. No dependency installation or upgrade is planned.

- Applications use ApplicationContext, unique local references, a five-step Apply flow and `saved-locally` status. Bookings are three static on-device records with explicit categories, not dates inferred from applications. There are **five** existing tabs including Cancelled; retain all five despite the brief naming four.
- Bookings has a long fixed header, small horizontal tabs, top-weighted empty content, unchecked route sections and unguarded date/image presentation. AppStatus's reference-booking branch shows completed document steps and active manager review without evidence; replace those misleading milestones with accurate reference details. Keep the actual local application timeline.
- CommunicationContext owns messages, ordering, read counts and resets. Opening c1 clears two unread messages. Sends append locally and move the conversation first; notification n3 links to c1. Property links are explicit p1/p2; unsupported properties have no fabricated chat.
- c1's stored preview disagrees with its last message. Fixture `Yesterday` lacks a date basis. Seed replies about availability and turnaround must be identified as example conversation content. Chat currently calls every incoming author “Property manager”, lacks a send guard/length validation at the state boundary, and scrolls to the end on every content resize.
- Refine header hierarchy, tab spacing, empty-state balance, card labels, conversation rows, bubbles, composer and safe areas using existing navy/blue, Outfit/Inter, images, avatars, UI components and tokens. Use natural vertical expansion at large text and native list virtualization; add no animation or library.
- Use one shared conversation preview/time/unread interpretation, local-only send feedback, a synchronous composer guard, supported property navigation, and safe missing-record states. Do not create remote delivery, read receipts, provider decisions, bookings or persistence.
- Extend the existing CJS screen harness with faithful local communication/application transitions; add focused behavior regressions and CI registration. Run all existing suites, TypeScript, lint, dependency check, Doctor, Android/iOS exports and diff checks. Reuse the observed Metro 8081 process and Android emulator for native journeys and the requested 12 size/text configurations; restore settings afterward. Report actual evidence and limitations separately.

## Implementation

Bookings retains the white header, My Bookings title, blue underline and all five categories. The concise subtitle is “Your applications and accommodation records.” Tabs have natural widths, 48dp minimum height, vertical padding, selected accessibility state, native horizontal scrolling and automatic selected-label reveal without animation. The header participates in the virtualized list so enlarged text cannot permanently consume its viewport. Empty content grows into the available space with a 440dp maximum width, existing icon/button and concise guidance.

ApplicationContext remains the sole application source. Cards show the selected room, local reference, validated creation timestamp, existing property photo/fallback and “Saved for this session · No booking confirmed”. Their accessible actions identify the property and exact application. Invalid local statuses and missing properties/rooms cannot become booking cards. Monthly rent guards unavailable/non-finite/negative data. The three existing reference booking records retain their IDs, amounts, dates and explicit Upcoming/Active/Completed categories; current device time does not reclassify them. Cancelled remains a useful empty category.

AppStatus retains the local application summary and accurate five-step milestone presentation. Its reference-booking branch now says Booking Record and omits the unsupported completed-document/active-manager-review timeline. Reference information is explicitly not a live provider update. Return actions select Applications for local records and the matching category for reference bookings. Missing references keep their existing recovery state. No provider approval, payment or confirmation is created.

Messages retains its blue circular avatars, existing contacts, Outfit headings, Inter body, unread emphasis, dividers and white background. Natural-height rows allow full contact/property names; timestamps stack at narrow widths or enlarged text and previews expand vertically. Read counts use the existing message-count semantics (c1 initially has two), without secondary screen state. Zero badges disappear. Empty Messages reuses EmptyState with existing Explore navigation; no conversation search was added for two rows.

The preview comes from the final message, fixing c1's stale cached preview. A shared timestamp formatter identifies seed messages as examples. Unsupported “Yesterday” is no longer presented as recent communication; existing clock-only labels are identified as examples. Local sends use the actual local clock consistently in list and chat. Seed content is retained, with contextual “Example conversation. Replies are illustrative, not live provider updates.” and example bubble/accessibility labels. There are no verified provider identities or delivery receipts.

Chat retains its identity header, blue outgoing/white incoming bubbles, avatars, property action, composer and Send control. Property identity resolves through the existing explicit ID, with a safe unavailable-details state. The property row/context scroll with the virtualized messages instead of compressing the composer at large text. Message text wraps naturally; bubble width increases modestly for narrow/enlarged layouts. Safe areas include lateral insets. Keyboard avoidance remains platform-specific; native drag dismiss and handled taps are retained. Scroll-to-latest follows initial layout, local sends and resizing near the end, while a reader viewing older messages is not pulled back on every content resize. A pending-send flag survives composer resize/scroll events until message content lays out, fixing the 480dp/200% race found on Android. No animation dependency or performance claim was added.

The controlled composer rejects whitespace and enforces the existing 1,000-character limit at input, provider and reducer boundaries. A synchronous draft ref prevents duplicate insertion from repeated taps before rerender; separate intentional compositions remain possible. Successful local additions clear the composer, move the conversation first, update preview/time and show “Saved here for this session. Not delivered externally.” Conversation changes clear the visible draft/feedback. All state remains in the existing session providers.

## Apple-design and accessibility

Used the explicitly requested [apple-design skill](C:/Users/mudau/.codex/skills/apple-design/SKILL.md): grouping by spacing, restrained heading tracking, clear size/weight/leading hierarchy, immediate native press feedback, readable touch targets and adaptable layouts. No fonts, colours, imagery, theme tokens, icons, gradients, motion or dependencies were replaced. Existing CampusStay buttons, EmptyState, StatusBadge, IconButton and RemoteImage are reused.

Bookings and Messages only set their status bar while focused, preserving Profile's light status bar. Headings, selected tabs, exact application/record actions, conversation-specific read descriptions, named authors, example timestamps, local send feedback and disabled Send states have explicit accessibility semantics. Decorative avatars/icons are hidden; only avatar initials have a size cap to fit their existing fixed circles. Content text retains scaling. Native hierarchy and visual checks are distinct from spoken TalkBack testing, which has not been performed. No measured performance, frame-rate or human usability study is claimed.

## Automated verification

All **360 tests pass: the original 304 plus 56 focused regressions**. Each of the 12 `test:*` npm scripts was executed successfully, and a combined TAP run independently records 360/360 without skipped tests. Focused cases exercise actual screen callbacks, the five-step Apply/save/duplicate guard, list/Profile synchronization, fixture categories and missing data, exact AppStatus routes, read counts, previews, timestamp boundaries, composer length/whitespace/repeated taps, scroll intent, property/notification links, logout reset, and 12 size/text layout contracts. Native modules are stubbed in these tests; effects and physical layout are verified separately on Android. Existing assertions were preserved: the baseline harness loads the new booking helper; the Profile test reads tabs from their new FlatList header and expects the refined empty-state wording.

| Check | Result |
| --- | --- |
| TypeScript strict typecheck | Passed |
| ESLint, zero warnings | Passed |
| All 12 npm test scripts | Passed, 360 total tests |
| Expo dependency compatibility | Dependencies are up to date |
| Expo Doctor | 21/21 passed |
| Android Hermes export | Passed |
| iOS Hermes export | Passed; not iOS device execution |

No dependency reinstall or upgrade, force flag or legacy peer resolution was used. CI runs the additional focused test script. Logs are under `.expo/bookings-messages/`.

## Android runtime evidence

Used the existing Medium_Phone_API_36.1 Android 16/API 36 emulator (emulator-5554) and existing Metro process on port 8081. No competing Metro server, dependency install, emulator data reset or new backend was introduced.

Completed native journeys before viewport testing:

- Applications empty state → Explore → Campus View Residence → all five Apply steps → Save Application → Application Status → My Applications. The card appeared once; reopening showed the same local reference and selected Private Room. Profile showed one application. Upcoming, Active, Completed and Cancelled retained their separate categories and selected states.
- Messages → c1 → compose/send locally with the native IME → cleared composer → saved message/actual clock/local-only feedback → updated list preview and zero unread badge. The second conversation opened Priya/Varsity Heights. Notification n3 opened c1 and its property action opened Campus View Residence.
- Logout Cancel preserved both the application and local message. Confirmed logout opened the existing Login; Continue without signing in opened Home, applications cleared, local messages disappeared and the seed unread message count returned to two.

Two real UI findings were caught during native QA and fixed rather than counted as passes: (1) a selected off-edge category remained clipped at 200% text; tabs now reveal the selected label on route change, layout and press/reselection; (2) clearing a tall composer could cancel scroll-to-latest before the appended message laid out. The exact previously failing 480dp/200% Chat case passed after the pending-scroll fix. Its failed screenshot is retained as `before-scroll-fix-large-20-chat-local.png`. The related focused regressions are included in the 56 new tests.

**All nine phone configurations passed**, including final focused rechecks after the native findings were fixed. Physical configurations: 840×1800 at density 420 = 320dp; 1080×2400 at 420 ≈ 411dp; 1440×2880 at 480 = 480dp. Each was exercised at font_scale 1.0, 1.3 and 2.0. The checks covered empty Applications, explicit booking cards and last actions, horizontal tab reachability, conversation rows, long local messages, empty Send prevention, composer/IME state, scroll-to-latest and preview updates. At enlarged text, rows and cards expand naturally; long histories remain scrollable. Final tab-selection/reselection rechecks passed at all six 320dp/411dp configurations; the 480dp matrix also verified selected-label reveal.

| Width | 100% text | 130% text | 200% text |
| --- | --- | --- | --- |
| 320dp | Passed | Passed | Passed |
| ≈411dp | Passed | Passed | Passed |
| 480dp | Passed | Passed | Passed |
| 800dp | Native startup blocked | Not run after blocker | Not run after blocker |

The complete five-step application journey was additionally repeated at **320dp/200%**: saved successfully, application-card action reachable, AppStatus return preserved the student tabs, and Profile showed one application. The second conversation was reachable by scrolling and opened p2/Varsity Heights at the same configuration. Populated application/status screenshots are retained for both standard and narrow/enlarged layouts.

**Tablet runtime blocker:** attempted 1600×2560 at density 320 (800dp), 100% text. Expo Go remained on its native Compose startup screen after display recreation; the student UI was unavailable. The normal bounded wait and one longer bounded retry both failed. This was not an executed tablet UI pass. Tablet 130% and 200% were not attempted after that blocker. Restoring phone settings and reopening the observed existing project entry recovered the student app. Root cause remains undiagnosed; this report does not attribute it to CampusStay code or prove a fix. Tablet layout contracts passed in the automated harness, which is separate evidence.

The emulator uses a floating handwriting IME panel. Native input, disabled/enabled Send and composing/sending with that panel were exercised. A docked software keyboard, iOS keyboard and hardware-keyboard traversal are unverified. Native screen bounds and screenshots do not constitute spoken TalkBack verification.

Evidence is retained under `.expo/bookings-messages/`: `application-native.log`, `application-return.log`, `cross-native.log`, `matrix-native.log`, `large-20-recheck.log`, `finish-native-retry.log`, `journeys.log`, configuration result files and matching PNG/XML captures. Helper-label/bounds corrections were automation fixes, not application defects. They are not reported as app failures or extra passes.

After the credit interruption, the emulator and original Metro process were no longer running. The implementation was retained; the same AVD was started without wiping data, with one localhost-only Metro server and the existing 8081 reverse mapping. The final unfinished smoke check passed: Explore → save p2 → Favorites count three → remove p2 → count two; Profile → confirmed logout → existing Login → optional manager entry; manager Properties and Applications opened their existing records; manager exit returned to credential-free student Home without manager controls. `final-smoke-resumed.log`, `manager-workspace.png` and `home-final.png` record those results.

Verified final emulator state: physical 1080×2400, density 420, font_scale 1.0, original show_ime_with_hard_keyboard value 0, gesture navigation mode 2 with its original overlay, and only TCP 8081 reverse forwarding. The app was left on student Home. Typecheck, lint, all 360 tests, dependency compatibility and Doctor 21/21 were reconfirmed after resuming; the successful Android/iOS exports cover the same final implementation. No completed phase was restarted.

## Regression review and review handoff

Home, Explore, Property Details, Favorites, Profile/settings, Login, Apply, navigation types, manager sources, theme tokens, dependency versions and lockfile retain their task-start hashes. The original 304 tests still pass alongside the 56 new tests. Native evidence covers discovery/application integration, messaging/property/notification links, logout Cancel/confirm, optional manager entry/exit and the final student Home state. The manager portal was smoke-tested at standard size, not exhaustively rerun across every viewport. No new authentication, real uploads, payment, reservation, provider response or external delivery was introduced.

Review the task-only changes with `.expo/bookings-messages/refinement.patch`, based on the dirty tree captured at task start. The 16-file patch contains only this refinement (13 existing files and three additions). Full repository Git diffs also contain previous phases and user work and must not be mistaken for this task's scope. The refinement is ready for code review with the native tablet, iOS and accessibility/keyboard limitations recorded above; it is not a claim of production backend readiness. Work stops after Bookings & Messages.

## Files and preservation

Modified: `src/screens/BookingsScreen.tsx`, `MessagesScreen.tsx`, `ChatScreen.tsx`, `AppStatusScreen.tsx`; `src/application.ts`, `src/communication.ts`, `src/data.ts` (optional local-message provenance only), `src/state/CommunicationContext.tsx`; `scripts/profile-harness.cjs`, `scripts/baseline.test.cjs`, `scripts/profile-settings.test.cjs`; `package.json` (test script only), `.github/workflows/ci.yml` (one test step).

Added: `src/bookings.ts` (existing reference records/category/format helpers), `scripts/bookings-messages.test.cjs`, and this report. No new booking/messaging provider was introduced. Native helper scripts, screenshots, logs, snapshots and the focused review patch remain ignored under `.expo/bookings-messages/`.

The final task-start SHA-256 comparison shows only the 13 intended existing files changed, with no missing original files and no unexpected changes. The staged binary diff is unchanged, and both locally retained `.expo` files still exist. `preservation.json` records these checks; `final-settings.txt` and `final-reverse.txt` record restored device settings. The focused review patch compares against the initial dirty tree, separating this refinement from earlier work. No commit, push, reset, clean, stage or discard operation was performed. `git diff --check` passed.

## Remaining boundaries

Applications and student communication are session-only. Restart/reload may restore fixtures and clear user interactions by design. Historical fixture booking dates and categories are reference data, not current live inventory or occupancy. External messaging, verified contacts, provider decisions, real booking confirmation, payments, uploads, persistence, authentication and push services remain unavailable and were not added. Manager tools and messaging remain separate. Future backend integration must establish those contracts before making remote-success claims.

iOS runtime, spoken TalkBack/VoiceOver, physical devices, docked/hardware keyboard behavior and measured performance are outside the evidence from this Windows/Android emulator environment. Tablet native UI remains unverified due to the blocker above. Missing-record and empty-conversation states have automated coverage; no unsupported UI was added merely to inject these states on a device. Historical booking room labels are retained reference information and are not reconciled into current live inventory.
