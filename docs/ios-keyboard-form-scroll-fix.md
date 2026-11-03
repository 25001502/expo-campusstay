# Keyboard and form scrolling correction

## Baseline and preservation

The task began with 486 tests passing, Expo 57.0.28 / React Native 0.86.3, and extensive uncommitted work. The 114 starting files, hashes, status and Git index were snapshotted in `.expo/keyboard-form/before/`, `before-hashes.json`, `before-status.txt` and `before-index.patch`. No applicable AGENTS.md was found in the repository or ancestors. The apple-design skill was applied to preserve predictable direct interaction, accessible text scaling, CampusStay's navy/blue palette, Outfit/Inter, rounded inputs, progress indicator and button styling. No dependency installation or upgrade was needed.

## Confirmed source mechanism

ApplyScreen wrapped its entire layout in `KeyboardAvoidingView` (`padding` on iOS, `height` on Android), while its inner ScrollView also enabled `automaticallyAdjustKeyboardInsets`. The sticky footer stayed inside that avoiding layout, reserving its button height and bottom safe area even while typing. ProfileLayout repeated the same pair; Login, Register and Forgot used the same pattern.

The installed RN 0.86.3 code confirms that these are separate adjustments. `Libraries/Components/Keyboard/KeyboardAvoidingView.js` computes keyboard overlap and changes bottom padding/height. `React/Fabric/Mounting/ComponentViews/ScrollView/RCTScrollViewComponentView.mm`, `_keyboardWillChangeFrame:`, separately changes `contentInset` and `verticalScrollIndicatorInsets`, measures the first responder, calculates `contentDiff`, and animates a new content offset. Enabling both makes viewport size, bottom inset and native focus scrolling change concurrently using different layout frames. The footer further reduces the remaining area. This is the concrete source-level conflict that can produce excessive scrolling and blank keyboard-sized space; its exact event sequence on the user's iPhone remains unverified here.

There was no `scrollToEnd`, per-field focus offset, text-change scroll handler or nested vertical list in Apply. Its explicit scroll commands only targeted zero for validation and step navigation. Those commands also did not dismiss the previous step's keyboard/focus. The fix addresses both competing geometry owners and stale step focus, rather than changing fonts, making the form non-scrollable or guessing a smaller keyboard.

Android also configured `softwareKeyboardLayoutMode: pan`. In the available Expo Go runtime, an initial resize-only experiment left the actual form ScrollView extending behind the IME: Email's native rectangle was below the keyboard. That approach was rejected. With the final Android `height` avoidance, the observed scroll viewport ended at y=1517; the focused Email occupied y=1364–1486, fully visible with approximately 12dp clearance. This was measured and captured, rather than inferred from a hidden footer.

Official references: [KeyboardAvoidingView](https://reactnative.dev/docs/0.86/keyboardavoidingview), [ScrollView keyboard insets and bounded layout](https://reactnative.dev/docs/0.86/scrollview), [Expo Android keyboard layout configuration](https://docs.expo.dev/versions/latest/config/app/#softwarekeyboardlayoutmode). The installed source was inspected alongside these references.

## One keyboard strategy

`KeyboardForm` supplies one bounded scroll area and one avoidance layer: iOS `padding`, Android `height`. Automatic keyboard/content insets are explicitly disabled and `contentInsetAdjustmentBehavior` is `never`. Existing safe-area padding remains with its screen/header/content/footer; there is no second keyboard-height spacer or footer height added to content.

The native stack hides its own headers for these screens, and the existing custom header/progress live inside the application wrapper. `keyboardVerticalOffset=0` therefore adds no guessed header correction. Manager's header remains outside its content wrapper; the wrapper's own layout position is accounted for by native avoidance. Both the input and visible ScrollView are measured in the same native window coordinate system. The public native scroll ref and `TextInput.State.currentlyFocusedInput()` APIs are used; no private Expo import or diagnostic suppression was added.

Android config now requests `resize` rather than `pan`, avoiding whole-window panning in a rebuilt app. KAV's overlap calculation uses the actual layout/keyboard frame; there is no independent keyboard-height padding added on top. Expo Go's installed window behavior is not proof of the rebuilt CampusStay manifest. A native rebuild is required to verify this config change in a standalone/development client. Chat retains its existing avoidance/composer behavior; no Chat implementation change was needed.

## Focus, scrolling and footer

The ScrollView receives bubbling focus/blur events from its existing TextInputs; their design, callbacks, validation and keyboard types are unchanged. A focused native element is measured after the viewport layout and keyboard transitions. iOS measurements wait for the did-show/did-change-frame phase, rather than racing the will-show animation. Focus, layout and content-size requests coalesce into one animation-frame job. Revision and element-identity checks discard stale native measurement callbacks after focus changes, step changes or unmount. A user drag takes priority over pending focus scrolling; typing does not schedule a scroll on every character.

`focusedFormOffset` calculates only the delta needed to put the input within the viewport, with a comfortable 12dp margin (reduced for exceptionally small areas). Already visible fields do not move. Taller multiline inputs align their beginning without oscillating between opposite edges. Every requested offset is clamped to `0…max(0, contentHeight - viewportHeight)`. Content shrinking and keyboard dismissal clamp old offsets to the new real bounds; content is never extended with blank keyboard padding.

Apply's original footer is temporarily absent while the keyboard is shown, freeing the typing area. After did-hide it returns with the same safe-area padding, styling and Continue / Review Application / Save Application actions. Drag dismissal uses native interactive behavior on iOS and on-drag on Android. Back/step changes blur the old input, dismiss the keyboard, cancel pending focus work and reset the new step to the top. Validation's explicit reset goes through the same controller. University/Relationship and attachment menus keep their existing keyboard dismissal and native presentation.

## Screens and scope

- Apply Personal: Full name, Student number, Phone number, Email address; University remains the shared selector. Keyboard types remain text, number-pad, phone-pad and email-address respectively.
- Apply Emergency: Full name and Phone number; Relationship and existing validation remain unchanged.
- Documents/Funding: FundingFields currently has choice/checkbox controls, not editable funding/payment-detail text. Its rules and attachment pipeline were not modified. Update Funding inherits the corrected ProfileLayout, so native source/picker return cannot retain an extra automatic keyboard inset.
- ProfileLayout: Personal Information, Security and other existing profile/funding screens receive the same bounded layout, with their original content/card widths and safe areas.
- Manager: Editable property fields, multiline description and internal review notes use the same measured content wrapper. Local fixtures, save callbacks and student isolation are unchanged.
- Login/Register/Forgot: Replaced the confirmed duplicate avoidance pattern while retaining their existing layouts, styles, navigation, credential-free entry and feedback. No authentication was implemented.

The five application steps, Single/Shared IDs and pricing, retired Studio restriction, funding declarations, real file/photo/camera adapters, temporary ownership, saved application IDs, My Documents, Status and logout cleanup remain unchanged.

## Automated verification

The 16 new regressions use the real component/hooks with controlled native measurement and keyboard events, plus actual screen callbacks. They exercise visible/obscured fields, minimal movement, clamping, empty/short/large/tiny viewports, oversized multiline inputs, both platform strategies, keyboard transitions, footer removal/restoration, request coalescing, repeated focus, stale callbacks, drag priority, validation resets, step cleanup/return, listener/frame cleanup, Personal and Emergency state/types/selectors, preserved content padding and manager-local notes. These tests do not claim native device execution. Existing navigation, attachment, funding and application tests remain enabled. Old assertions that specifically required automatic keyboard insets now assert the replacement shared form boundary; they do not require the defective mechanism.

| Check | Actual result |
| --- | --- |
| Task-start tests | 486 passed |
| Final full suite | 502 passed; 0 failed, cancelled or skipped |
| Strict TypeScript | Passed |
| ESLint, zero warnings | Passed |
| Android and iOS exports | Passed; both Hermes bundles approximately 5.4 MB |
| Git diff and whitespace | Passed; `git diff --check` exit 0 and all 16 task files, including untracked files, passed a trailing-whitespace scan |
| Expo dependency compatibility | Existing Expo 57.0.28 → ~57.0.30 and expo-asset 57.0.19 → ~57.0.20 recommendations remain |
| Expo Doctor | 19/21; patch recommendations and existing tracked `.expo/devices.json` finding |

No package upgrades, install exclusions, tracked-file removals, reduced strictness, blanket casts or diagnostic suppression were used to silence checks. `.expo/` is already ignored, but its previously tracked device file was left untouched.

## Android runtime environment

The existing Android 16/API 36 emulator and existing localhost Metro listener were reused. No competing server was launched or existing server killed. Fast Refresh was off, so explicit fresh loads were used. Only synthetic names, numbers, email and documents were entered/selected.

The emulator had roughly 396 MiB free. Its known proactive cache reclamation recurred: Expo Go reported an Ionicons asset-download error although the existing local Metro asset returned HTTP 200 / 389,724 bytes. The resulting development error overlay intercepted footer taps; those failed automation attempts are not application-navigation passes. As in the preceding task, `sys_storage_threshold_percentage` was temporarily changed from unset to 1 to collect controlled native evidence, without deleting files or changing app storage. This is an environmental QA adjustment, not an app fix. It must be restored afterwards, and low free space remains a limitation.

Screenshots include the real keyboard, with matching XML in `.expo/keyboard-form/` and assertion logs in `journeys.log`. UI hierarchy rectangles and screenshot inspection are used together; successful export is not treated as device evidence.

Expo Go's floating developer-tools button is visible in some captures and can overlap a corner of an input. That overlay belongs to the development host, not CampusStay's production layout. Native assertions check the complete input rectangle against the form viewport; screenshots also show the actual keyboard and caret. Long single-line values may scroll horizontally within their native input at 200% text, preserving the caret rather than shrinking text.

### Completed Android keyboard matrix

All 12 combinations below passed against the live Android app. Each case typed into Personal Full name, Student number, Phone and Email; dismissed and refocused Email; then typed Emergency Full name and Phone. Assertions checked the actual typed value, focused native element, input rectangle inside the scroll viewport and absence of the sticky action while typing. The real IME was checked as shown. Each case then dismissed the keyboard, selected Wits/Guardian, continued to Review and navigated Back to Personal with its data intact. Preparing the three required synthetic PDFs also exercised Files return without stale keyboard geometry.

| Width | 100% text | 130% text | 200% text |
| --- | --- | --- | --- |
| 320dp | Passed | Passed | Passed |
| 411dp | Passed | Passed | Passed |
| 480dp | Passed | Passed | Passed |
| 800dp | Passed | Passed | Passed |

These were emulator window overrides at density 320, not 12 physical devices. Phone cases used 900dp height and the 800dp case used 1100dp height; a separate short-height check is recorded below. `matrix-{width}dp-{scale}-personal-name`, `-student-number`, `-personal-phone`, `-email`, `-email-refocus`, `-emergency-name`, `-emergency-phone` and `-review-restored` give eight matching PNG/XML pairs per combination: **96 pairs**, including **84 keyboard-visible captures**. Original CampusStay padding, header/progress, native keyboard types, university/relationship values and action styling are retained.

### Short viewport, validation and open-keyboard Back

A separate fresh session at **320×568dp / 200% text** passed all four Personal text fields with the real keyboard open. The focused native input fits in the much smaller visible area; captures `short-height-320dp-200-name` and `-student`, and `validation-320dp-200-phone` / `-email` show the actual keyboard and entered characters. Entering invalid Phone/Email, dismissing and continuing displayed the real “Enter a valid phone number with 7 to 15 digits.” validation summary (`validation-320dp-200-summary`). Correcting both inputs while typing passed the visibility checks (`…-phone-corrected`, `…-email-corrected`).

Pressing the application header's Back while Email's keyboard was still open reached Room and dismissed the IME. Returning to Personal retained the entered name (`step-back-while-typing` plus live assertions). The short-height emulator resize sometimes returned to the launcher or resumed an old screen; those interrupted helper attempts were excluded. A fresh Expo Go process at the target dimensions and visible-intersection taps for oversized property cards established the actual passing short-screen result. No app storage reset was used.

### Navigation modes, selectors and other forms

- Three-button mode: real Phone/Email typing passed (`three-button-phone-keyboard`, `three-button-email-keyboard`). Tapping the on-screen system Back triangle dismissed the IME and restored Continue above navigation (`three-button-navigation-before-back`, `…-after-back`).
- Gesture mode: a real left-edge swipe dismissed Email's keyboard while remaining on Personal, with Continue restored (`gesture-email-keyboard`, `gesture-back-footer-restored`). This supplements the keyboard/Back checks throughout the gestural-mode matrix.
- University was tapped while Full name's keyboard remained open; its trigger was inside the visible viewport. The modal opened, Wits was selected and the IME stayed dismissed without a stale inset (`three-button-name-before-selector`, `university-opened-while-typing`). Relationship also remained functional through all matrix Review/Back journeys.
- Profile: Email and Phone were typed visibly, edits cancelled through the existing discard confirmation, then navigation returned to Profile (`profile-email-keyboard`, `profile-phone-keyboard`). Login Email was typed visibly without submitting credentials (`login-email-keyboard`).
- Manager: multiline Review note and Description were typed visibly (`manager-review-note-keyboard`, `manager-description-keyboard`). The review note saved through its existing manager-local callback. No student record received it. The first helper's final Cancel tap targeted an off-screen action and triggered automatic environment restoration; it was not counted as a Cancel pass. A targeted recheck scrolled the action into view, discarded the unsaved description through the real confirmation, and returned through the existing student Home action (`manager-description-gesture-keyboard`, `student-home-after-manager`).

Only Apply supplies a sticky footer to KeyboardForm. Existing inline Profile/manager actions keep their original behavior and remain reachable after keyboard dismissal. These are Expo Go/API 36 checks, not evidence of a standalone native build, physical Android devices or iPhone execution.

### Final environment restoration

`restoration.txt` confirms physical 1080×2400 and density 420 with overrides removed, font scale 1.0, hardware-keyboard soft-IME setting 0, original gestural navigation enabled and three-button mode disabled, and the storage threshold unset (`null`) again. Camera permission remained denied with its original sensitivity flags; this task never requested it. The five original synthetic Downloads files remain at their original sizes (629, 629, 6,502, 21,020 and 6,502 bytes). No original document was deleted. `final-restored-home.png/.xml` shows credential-free student Home after restoration. Both pre-existing Metro listeners were left untouched. Automatic finally-block restoration also ran after the interrupted manager helper, then ran again after its successful targeted recheck.

## iPhone validation still required

No iOS simulator or accessible real iPhone runtime is available in this Windows environment. The corrected source strategy, iOS keyboard timing, interactive dismissal and focus geometry therefore remain **unverified on iPhone**. This report does not claim the real-device bug is fully fixed. Spoken VoiceOver/TalkBack testing was not performed.

1. Rebuild the native client as needed, launch directly into student Home, open Campus View and apply for Single or Shared.
2. In Personal, focus Full name, type several characters, switch to Student number, type, then Phone and Email. At each field, capture a screenshot with the keyboard visible and all entered text readable above it; verify the header/progress stays in place.
3. Repeat Email → Phone → Full name → Email. Dismiss and refocus the same field repeatedly, including keyboards without a Done key. Try keyboard drag dismissal, tapping unused space and hardware-keyboard input if available. There must be no blank keyboard-sized scroll region or unexpected jump while typing.
4. Confirm the footer is hidden during typing and returns above the bottom safe area on dismissal. Scroll to the real end of the form, then back up. Verify invalid/missing fields still display accessible validation.
5. Open University with the keyboard up, select Wits and cancel another choice. Verify the field and scroll state remain sensible. Continue/Back must preserve entered values and the university.
6. In Documents, test NSFAS pending/Self-funded and the existing Photo Library / Take Photo / Files menus using synthetic JPEG/PNG/PDF files. Cancel a source and system picker; return without stale keyboard space, lost form data or replaced evidence.
7. In Emergency, type Full name and Phone, switch repeatedly, select Guardian, cancel another relationship choice and navigate Back/Continue/Review. The selected relationship and typed values must remain.
8. Save locally, inspect Status/My Documents and Update Funding. Confirm cancellation still preserves saved evidence and the application ID. No upload or external verification should be claimed.
9. Test Profile Personal Information and manager-local multiline Review note/Description. Verify the caret/active text remains reachable, note editing works and manager data stays isolated.
10. Repeat with enlarged text (100/130/200%), small visible heights, long labels and validation messages. Check VoiceOver reading/focus order, required/error announcements and keyboard dismissal. Log out and continue without credentials afterwards.

Stop scope: keyboard/focus/scrolling and related confirmed layout conflicts only. No backend, website, authentication service, persistent storage, upload, payment or booking confirmation was introduced.

## Exact task files

| Files | Change |
| --- | --- |
| `src/components/KeyboardForm.tsx`, `src/formScroll.ts` | Single avoidance owner, native focus measurements, bounded scrolling and lifecycle/gesture handling |
| `src/screens/ApplyScreen.tsx` | Existing header/progress/content/footer in the shared layout; step/validation resets through its controller |
| `src/components/ProfileLayout.tsx` | Remove duplicate avoidance/insets; share bounded focus handling |
| `src/screens/ManagerScreen.tsx` | Shared manager content layout for existing editable fields/notes |
| `src/screens/LoginScreen.tsx`, `src/screens/RegisterScreen.tsx`, `src/screens/ForgotScreen.tsx` | Replace the same confirmed duplicate mechanism; preserve original styling, content and callbacks |
| `app.json` | Request Android resize instead of whole-window pan; native rebuild required |
| `scripts/keyboard-form.test.cjs` | 16 meaningful keyboard regressions |
| `scripts/profile-harness.cjs` | Preserve header/footer interactions when stubbing the new native layout boundary |
| `scripts/funding-workflow.test.cjs`, `scripts/phase-f.test.cjs` | Replace assertions requiring the defective inset mechanism; retain previous functionality checks |
| `package.json`, `.github/workflows/ci.yml` | Keyboard test script and CI execution |
| `docs/ios-keyboard-form-scroll-fix.md` | Investigation, implementation, evidence and limitations |

The task-start comparison identifies 16 changed/new task files and zero missing starting files; the Git index, package-lock, dependency versions, App.tsx, tsconfig.json and room data remain unchanged. `.expo/keyboard-form/task-only.patch` contains the focused task diff separately from previous work. Nothing was reset, cleaned, discarded, committed or pushed.
