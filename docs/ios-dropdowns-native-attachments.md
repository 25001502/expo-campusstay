# iOS selectors and native document sources

## Baseline and preservation

The task began with 107 tracked/untracked files, extensive earlier uncommitted work, and 469 passing tests. No applicable AGENTS.md was found in the repository or ancestors. Task-start file copies, hashes and the Git index/status snapshot are in `.expo/native-attachments/before/`, `before-hashes.json`, `before-index.patch` and `before-status.txt`. The apple-design skill was applied with CampusStay's existing navy/blue colours, Outfit/Inter, rounded inputs/cards, button language and spacing. No new animation, backend, authentication, persistent storage, upload, payment, booking confirmation or web dependency was added.

## Root cause and selector fix

Both application fields embedded `@react-native-picker/picker` in an input-sized, overflow-hidden container. Application `Picker.style.height` was 52dp (scaled up to 104dp); its wrapper also clipped overflow. The installed picker’s `PickerIOS.ios.js` renders its native wheel at 216 points unless its separate `itemStyle` changes it. `style` styles the surrounding View, rather than supplying CampusStay item typography. A wheel cannot act as the closed selected-value label in a clipped text-input box: selection bands can fall outside the visible region, leaving clipped/default wheel text or an apparently blank field. University and Relationship share this implementation defect; neither requires a smaller font to mask it.

This is a confirmed source-layout defect consistent with the reported iPhone symptoms. Native iOS execution is still required to independently verify the corrected result; Android, TypeScript and exports cannot prove it.

`SelectField` now renders an ordinary multiline React Native Text value inside a full-width Pressable, with a chevron, existing rounded outline, CampusStay fonts, focus/error states and natural height. It has no absolute text overlay, fixed text height, ellipsis or font-scale cap. Accessibility includes label, required state, current value, expanded state and validation. Opening dismisses the keyboard; the shared modal has a heading, selected radio indicators, scrollable options, outside/Back dismissal, persistent Cancel and focus restoration.

University uses the existing eight records, including University of the Witwatersrand. Eight choices do not require another search component or dropdown dependency. Relationship preserves Parent, Sibling, Guardian, Spouse and Friend, including the existing Parent default. Missing required values still fail the existing validation. Draft selections remain in the existing application state through Back, Continue, Review and Edit.

The audit found the same wheel-in-input pattern in Register University, Profile Personal Information University, manager property University/Room type and tenant property filter. Those controls now reuse SelectField with their original data, callbacks and validation; manager business logic and isolation are unchanged. Optional Profile/tenant clear choices remain available. The supported picker package was not removed as unrelated dependency cleanup.

## Native attachment source controls

The application Documents cards and saved-application funding editor share `AttachmentSourceButton`. Choose/Replace offers Photo Library, Take Photo, Choose Files and Cancel. Existing buttons and labels remain. Btn gains an optional native button ref for anchoring/focus without changing its existing consumers.

iOS uses [ActionSheetIOS](https://reactnative.dev/docs/actionsheetios.html), with Cancel index 3, CampusStay blue tint and the actual trigger's native anchor for iPad. Android uses the shared themed ChoiceSheet modal, with safe-area padding, bounded width/height, scrollable actions, Android Back/outside dismissal and a separate Cancel action. Keyboard dismissal precedes presentation. A synchronous lock prevents duplicate source menus/choices; the Android modal closes before the native picker launches. Cancellation restores focus and leaves files unchanged. The web path retains its existing file input; no mobile capability is claimed for web.

## Dependency and platform APIs

`npx expo install expo-image-picker --npm` installed **expo-image-picker 57.0.20 (~57.0.20)** and its required **expo-image-loader 57.0.1**. This matches the installed Expo 57.0.28 `bundledNativeModules.json` recommendation and the [Expo ImagePicker documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/). No existing lockfile package entry changed except the root dependency list; no package was removed or upgraded.

Photo Library uses `launchImageLibraryAsync` with images only, single selection, no editing/crop, quality 1, no base64/EXIF payload request, and the current iOS asset representation where supported. It does not request full photo-library permission. Take Photo checks camera access and requests it only when necessary and still requestable, then launches `launchCameraAsync` for an image without forced cropping. Denial or unavailable camera gives an accessible explanation with the other sources available; a permanently blocked permission is not repeatedly requested. Choose Files retains expo-document-picker and its existing PDF/image filters and Android SAF access.

These options do not promise image conversion or stripping embedded file metadata. HEIC/HEIF and other unsupported images are rejected clearly; bytes are never merely renamed as JPEG. A library's returned filename is retained where valid. Missing filenames get a non-sensitive `document-photo-image-…` name with an extension consistent with the provided image metadata; the actual bytes are subsequently checked.

## One attachment pipeline and safety

The source choice passes through `chooseDocument(owner, category, source)` → AttachmentSession → documentAdapter. Photos normalize into the same PickedDocument shape used by Files. There is no second document store or independent camera/photo attachment model.

All sources use existing filename/MIME validation, actual readable-copy size checks, the **10 MiB (10×1024×1024 bytes)** limit and PDF/JPEG/PNG signature checks. Media type/extension conflicts, videos, missing metadata, invalid content and oversized captures are rejected. Images do not bypass document checks. Private opaque cache filenames are separate from displayed names. Application records contain metadata, not raw payloads or public URIs.

A new candidate replaces an attachment only after validation and readability succeed. Source cancellation, picker cancellation, permission denial, errors and invalid/oversized candidates retain the current attachment. The funding editor still stages evidence under its editor owner until Save; Cancel/back releases staging only, preserving the saved original. Save updates the same application ID without changing room, price, personal/emergency details or unrelated documents. Review, Status and My Documents consume the existing shared record/registry. Logout retains its existing record/handle cleanup.

Cleanup is restricted to the app's opaque attachment copies or SDK-created files directly inside its private DocumentPicker/ImagePicker cache directories. External content references, Downloads originals and arbitrary paths are never deleted. Invalid normalized image candidates and abandoned SDK results also use that restricted cleanup. Android `getPendingResultAsync` is drained before a new image operation: an orphan result after activity/process recreation is discarded rather than guessed onto another draft/category. Without persistence, a killed JavaScript process cannot restore a lost application; this task does not promise otherwise. Normal picker return preserves the current form.

Manager fixtures receive no student files, handles, metadata or application context. No remote action or funding verification is generated.

## Permissions and native rebuild

The expo-image-picker plugin declares `NSCameraUsageDescription`: “Allow CampusStay to take photos of documents you choose to attach.” `photosPermission:false` and `microphonePermission:false` remove unnecessary full-library/microphone purpose strings. Android explicitly blocks RECORD_AUDIO, READ_EXTERNAL_STORAGE and WRITE_EXTERNAL_STORAGE. The dependency supplies CAMERA; image selection uses the modern system picker rather than broad storage access. Files needs no new general storage permission.

Expo config introspection confirms only the camera usage description and the storage/audio removal directives. A real native development/release build must incorporate this configuration and the new native module. An export changes JavaScript/assets, not an installed app's native manifest. Expo Go has its own shared permission declarations and prompt wording; its runtime tests do not establish that CampusStay's final permission configuration is installed. A rebuilt iPhone development client or release app is needed to verify the actual purpose text.

## Automated verification

The new suite exercises actual shared controls and screen callbacks, plus the real ApplicationProvider/AttachmentSession with controlled native adapters. Coverage includes platform source menus, cancellation/duplicate taps, original university/relationship choices, validation and step persistence, camera permission states, JPEG/PNG normalization, Files/PDF reuse, HEIC/video/size rejection, abandoned-result handling, mixed-source application Review, exact-ID funding updates, My Documents, original ownership, failures and logout. Existing 469 regressions remain enabled. Mocked tests are not native device execution.

| Check | Result |
| --- | --- |
| Initial automated baseline | 469 passed |
| Expanded suite, `node --test scripts/*.test.cjs` | 486 passed, 0 failed/cancelled/skipped, including 17 new tests; rerun after final assertions |
| `npm run typecheck` | Passed, strict TypeScript unchanged |
| `npm run lint` | Passed, zero warnings |
| `npm run export:check` | Passed for Android and iOS; both Hermes bundles approximately 5.4 MB |
| Expo image-picker compatibility | 57.0.20 matches the installed SDK recommendation |
| Expo config introspection | Passed |
| Git diff / whitespace | `git diff --check` passed; all 24 task files (including untracked files) passed the trailing-whitespace scan |
| Expo dependency check | Existing Expo 57.0.28 → ~57.0.30 and expo-asset 57.0.19 → ~57.0.20 recommendations remain |
| Expo Doctor | 19/21: those patch recommendations and existing tracked `.expo/devices.json` setup issue |

`.expo/` is already ignored, but an older device-history file remains tracked. No upgrades, diagnostic exclusions or Git tracking changes were used to hide Doctor findings. Installation also reported 26 npm advisories (8 moderate, 18 high) across the dependency tree; this task did not attribute or remediate them, and no audit-fix command was run.

## Android environment and cache diagnosis

The existing Android 16/API 36 emulator and existing IPv4 localhost Metro listener were reused; no additional server was launched. Another pre-existing listener was left untouched. Expo Go initially retained pre-change JavaScript with Fast Refresh off, so native evidence was collected again after explicit reload. Native testing also caught a source-button composition warning: Btn passes non-string children through, so icon/label compositions must contain an explicit Text node. This was corrected and covered by a regression assertion.

Photo Library selected a real synthetic PNG through Android's system picker, whose UI states that Expo Go can access only selected photos. The returned display filename was `139.png` (6,502 bytes), rather than assuming the original Downloads name. Camera denial showed alternatives while preserving a selected attachment. A subsequent camera intent opened, but early validation observed cache files disappearing after initial successful reads.

The emulator had approximately 402 MiB free on its 5.8 GiB data volume. Android's storage-monitor logs repeatedly reported proactive cache reclamation and failure to reach a 622,811,544-byte free-space target. Diagnostics showed an image copied to the owned directory, distinct source/target URIs, successful initial size/readability, then `exists:false`; other newly selected files still existed. The monitor reported a 311,405,772-byte low threshold. [Android's StorageManager implementation](https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/os/storage/StorageManager.java) derives this from the global storage-threshold setting. The evidence supports OS cache reclamation as the cause, rather than changing validation to accept missing files.

For controlled runtime QA, `sys_storage_threshold_percentage` was temporarily set to 1 from its original unset value. This changed only the emulator's proactive threshold; no files were deleted to make space, no app storage location was changed, and the full-storage threshold was untouched. With that adjustment, Photo Library PNG, camera JPEG (64,254 bytes) and Files PDF validated together. Files already reclaimed had to be explicitly replaced, as the UI correctly required. The emulator's low free space remains an environmental limitation after restoring its original setting. Temporary diagnostic logging contained only types, sizes and lifecycle booleans, never document contents, filenames or URIs; it is removed from final source.

This is Expo Go execution, not a standalone native build or iPhone result. Screenshots have matching UI hierarchy XML files in `.expo/native-attachments/`; `journeys.log` records assertions against the live UI.

| Android evidence | Actual result |
| --- | --- |
| `01-university-options`, `02-wits-selected` | Shared selection sheet, existing choices, long Wits selection visible |
| `03-attachment-source-menu` | All three labelled source actions and Cancel in the corrected Android sheet |
| `04-android-photo-picker`, `05-library-image-attached` | Real system photo selection; returned PNG metadata displayed |
| `06-camera-permission`, `07-camera-denied-preserves-image` | Native permission prompt; denial preserves attachment and explains alternatives |
| `08-native-camera`, `09-camera-capture-review`, `10-camera-image-attached` | Native camera capture/review; actual JPEG accepted after the environmental cache issue was controlled |
| `12-relationship-options`, `13-guardian-selected`, `14-review-wits`, `15-review-actual-camera-file` | Guardian and Wits survive Back/Edit/Review; actual camera filename appears |
| `16-saved-application` | Application `CS-LOCAL-MVA24VOS-01` saved locally with library PNG, camera JPEG and Files PDF; Shared r2 / R2,200 retained |
| `17-funding-library-image`, `18-my-documents-library-funding` | NSFAS pending update saved with real library image; same application ID; metadata in My Documents |
| `19-funding-staged-camera`, `20-funding-cancel-preserves-original` | Real camera replacement staged, then cancelled; previously saved library image remains readable on reopening |
| `21-funding-files-my-documents` | Student-declared confirmed update with real Files PDF, same ID/room/price and correct current-session metadata |

Android Back dismissed the source sheet, and cancelling the native library picker preserved saved funding evidence. Required files were validated together before Emergency and Save. Native capture used a virtual emulator scene and every selected document was synthetic. The camera supplied its own UUID JPEG filename, which was preserved; missing-name generation is covered separately by automated tests. No funding verification, upload or external submission was claimed.

### Responsive native matrix

All 12 combinations below were executed against the live Android app. Every case opened the university options, selected Wits, inspected the multiline value, opened/cancelled the three-action attachment source sheet, continued with the required files intact, selected Guardian and returned to Personal with Wits preserved. Scroll access, Cancel, sticky Continue/Review and system-navigation clearance were checked. Each case has five PNG/XML pairs (`matrix-{width}dp-{scale}-…`), totalling 60 paired captures. This does not claim every native system picker was repeated at every width; native picker/camera journeys are recorded separately above.

| Width | 100% text | 130% text | 200% text |
| --- | --- | --- | --- |
| 320dp | Passed | Passed | Passed |
| 411dp | Passed | Passed | Passed |
| 480dp | Passed | Passed | Passed |
| 800dp | Passed | Passed | Passed |

Long university values wrap using the existing Inter font, rather than clipping or reducing accessibility scaling. Option lists scroll when needed; the separate Cancel action stays reachable. Blank required-field validation and selected/required accessibility properties are also exercised by the automated screen tests. Spoken screen-reader behavior and iOS keyboard behavior remain manual checks.

Additional 320dp/200% checks passed: enabling the soft keyboard, focusing Personal and opening University left the keyboard dismissed (`dumpsys input_method` reported `mInputShown=false`, capture `22-narrow-enlarged-keyboard-dismissed`). A real Files-selected 110-character synthetic PNG name wrapped within its document card (`23-narrow-enlarged-long-filename`). Emergency → Review → Save remained usable (`24-narrow-enlarged-review-action`, `25-narrow-enlarged-saved`). The resulting saved record was cleared by Log Out, Continue without signing in still opened the student app, and My Documents showed “No application documents” (`26-logout-cleared-documents`). The initial logout automation swiped over the tab bar; correcting the helper's scroll area above the tabs completed that check without changing app code.

### Restored emulator state

`restoration.txt` confirms the original physical 1080×2400 size and density 420, no size/density override, font scale 1.0, soft keyboard for hardware input setting 0, and the storage-threshold percentage unset (`null`). Expo Go camera permission is again denied, with its original sensitivity flags and no user-set/user-fixed flags. All five original synthetic Downloads files still exist with unchanged sizes: PDFs 629/629 bytes, PNG 6,502 bytes, JPEG 21,020 bytes and long-named PNG 6,502 bytes. No original document was deleted. `final-restored-home.png/.xml` confirms credential-free Home startup after restoration. The existing Metro listeners were left running and unchanged.

## Real iPhone verification required

No iOS simulator/iPhone runtime is available in this Windows environment. The iOS layout correction, ActionSheetIOS, photo picker, camera, focus restoration and native permission purposes remain unverified on an actual iPhone. Successful TypeScript or iOS export is not an iPhone pass.

1. Open the updated build directly at Home without credentials. Open Campus View, select Single or Shared and start an application.
2. In Personal, open University and select University of the Witwatersrand. Check the whole value, Outfit/Inter styling, padding, chevron and focus outline at normal and enlarged text sizes. Cancel a different choice and confirm the value stays unchanged.
3. Continue to Documents. Choose NSFAS pending or Self-funded. Confirm the three required documents remain required and funding proof optional.
4. Choose a synthetic JPEG/PNG through Photo Library; verify no full-library permission request, correct metadata and local preview. Try an HEIC/HEIF asset and confirm a clear unsupported-format message without replacing a current file.
5. Tap Replace, then Cancel at the source menu and inside each system picker. Existing evidence must remain. Test an oversized/unsupported image too.
6. On a real camera-equipped iPhone, Take Photo. Deny permission first and verify alternatives/original evidence. Enable camera access through device settings where needed, capture a non-sensitive sample without cropping, and inspect its filename/size/preview. Check the rebuilt app's document-camera purpose text and absence of microphone prompts. A simulator cannot establish camera capture.
7. Use Choose Files for a synthetic PDF. Verify all required files, then continue to Emergency. Select Guardian or another existing relationship; check visible selected text, Back/Continue persistence and Review. Blank required data must show validation.
8. Save locally. In Status → Update Funding Information, test Photo Library, Take Photo and Choose Files for funding evidence. Cancel a change/removal and confirm the saved original survives. Save another update and verify the same application ID/room/price and correct file in My Documents.
9. Test VoiceOver reading order, selected/required state, Cancel, sheet anchoring on iPad where applicable, and focus return. Spoken VoiceOver/TalkBack is not covered by structural checks.
10. Log out, continue without signing in, verify empty current-session documents and normal Home/navigation. Original device files must remain.

The future website, backend integration, storage, uploads, verification and payments are outside this task.

## Files changed in this task

This list is relative to the task-start snapshot, rather than HEAD, which also contains earlier unfinished work.

| Files | Purpose |
| --- | --- |
| `src/components/SelectField.tsx`, `src/components/ChoiceSheet.tsx` | Readable selected values and accessible, scrollable selection interface |
| `src/components/AttachmentSourceButton.tsx`, `src/components/UI.tsx` | Platform source presentation and native trigger ref |
| `src/screens/ApplyScreen.tsx`, `src/screens/UpdateFundingScreen.tsx` | Shared selectors/source controls in existing application and funding flows |
| `src/screens/RegisterScreen.tsx`, `src/screens/PersonalInformationScreen.tsx`, `src/screens/ManagerScreen.tsx` | Replace the same defective embedded wheel pattern; preserve existing choices/callbacks |
| `src/nativeImagePicker.ts`, `src/imageAttachments.ts` | Native image APIs, permission handling and typed normalization |
| `src/documentAdapter.ts`, `src/attachmentSession.ts`, `src/documents.ts`, `src/state/ApplicationContext.tsx` | Source routing through the existing validation/ownership pipeline and specific errors |
| `app.json`, `package.json`, `package-lock.json` | Minimal native permissions, SDK-compatible image picker and test script |
| `scripts/native-attachments.test.cjs`, `scripts/document-picker.test.cjs`, `scripts/application-provider-harness.cjs`, `scripts/profile-harness.cjs` | New meaningful regressions and compatible existing test adapters |
| `.github/workflows/ci.yml` | Run the new suite alongside existing checks |
| `docs/ios-dropdowns-native-attachments.md` | Implementation, evidence and remaining verification |

The ignored `.expo/native-attachments/task-only.patch` records this focused change separately from all earlier edits. Evidence in `.expo/` remains local and is not newly staged.

Task-start comparison finds 24 task files, zero missing starting files and an identical Git index. `App.tsx`, `tsconfig.json`, `src/data.ts` and `src/rooms.ts` retain their task-start hashes. The lockfile adds only the two stated modules; every pre-existing package entry is identical apart from the root dependency list. Earlier uncommitted changes remain present. No commit, push, reset, clean or discard was performed.
