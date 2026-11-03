# Application file selection and funding workflow

## Audit and implementation plan

Read the complete supplied brief, applicable instruction paths (no AGENTS.md found), the established apple-design guidance, existing application/property/profile reports, navigation and provider/reducer architecture. The live baseline is **415/415 tests passing** before edits. Installed Expo 57.0.28, React Native 0.86.3, React 19.2.3 and TypeScript 6.0.3 were verified. Existing user edits to app.json, package.json, package-lock.json and tsconfig.json and untracked assets are preserved in a starting snapshot under `.expo/application-funding/`.

Current application drafts live in Apply component state; saved applications live in ApplicationContext. Documents are category flags only, not files. Profile/My Documents reads those flags. Confirmed Log Out clears student applications and the other existing student providers before opening Login; Continue without signing in returns Home. ManagerScreen owns its independent reducer and illustrative portfolio records; it does not consume student applications. p1 has current r1 Single/R3,500/4 and r2 Shared/R2,200/6; archived r3 must remain unselectable.

Plan:

1. Keep Room, Personal, Documents, Emergency, Review. Add typed attachment metadata and a typed student funding declaration; legacy category flags remain readable history but never count as real attachments.
2. Use Expo's SDK-compatible document picker and the existing SDK file-system implementation for bounded temporary app-owned copies. Store file handles/URIs in a provider-owned session registry, not application records or navigation parameters. Validate type/extension/basic file signature, readable reference and a configurable 10 MiB maximum. No payloads/base64/logging/network uploads.
3. Preserve attachments through step/edit navigation; replace/remove per category; preserve valid attachments on cancellation/failure; block overlapping requests and discard late results after unmount/logout. Promote draft ownership on local save. Release only owned resources on replacement/removal/cancel/logout.
4. Add Self-funded and an independent optional payment-discussion preference inside Documents. Proof of Funding stays optional. Model future funding-source declarations without inventing verification/eligibility rules. Funding selection is optional because the existing form has no mandatory funding-source policy; only Self-funded is exposed in the initial student UI.
5. Display filenames/funding in Review, Status and My Documents with temporary availability handling. Add image preview and safe browser PDF opening where supported; otherwise retain accurate file information. Keep existing Profile data reuse explicit, never automatic.
6. Add funding fields to an isolated manager fixture, plus reducer-owned local funding-review statuses and existing internal notes. No student handles, documents, personal data, notifications, approvals or payments flow into the manager workspace.
7. Extend existing behavior tests and CI; verify all suites, TypeScript, lint, SDK checks/Doctor, exports, native Android picker journey and representative layouts. Report iOS/web runtime limitations precisely and preserve the starting tree/index.

## Compatibility references

[Expo SDK 57 DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/) specifies ~57.0.3, native Android/iOS and browser selection, Expo Go support, user-activated web picking and cache-copy behavior. SDK tooling maps expo-file-system to ~57.0.7; it is already installed transitively. It will be declared directly because application code now owns cleanup/readability checks. No Expo/expo-asset upgrade is planned.

The repository currently has no react-dom, react-native-web or @expo/metro-runtime installation or web script. A browser adapter will be implemented, but laptop app runtime testing requires those absent Expo Web runtime dependencies; this task will not install an unrelated web stack or claim Android runs directly on Windows/macOS.

## Implementation

The five existing steps remain Room, Personal, Documents, Emergency and Review. Funding is part of Documents. CampusStay colours, Outfit/Inter, shared buttons/inputs, rounded cards, selection controls and navigation are retained. The apple-design guidance informed hierarchy, spacing, feedback and responsive controls; no animation library, new font, palette or visual redesign was added.

Room selection still resolves exact property/room IDs. Campus View has r1 Single Room, capacity 1, R3,500 and four listed rooms, and r2 Shared Room, capacity 2, R2,200 and six listed rooms. Its retired r3 cannot be selected, including through stale route snapshots. Historical room/application references remain readable. Home, Explore, Compare and property inventory were not changed by this task.

Personal and Emergency retain their existing fields and validation. Explicit **Use saved profile details** appears only when profile values exist; it copies non-empty values only after a user action. It never automatically replaces draft values. Picker height grows with text size, the compact progress indicator provides a full-width current-step caption, file actions wrap, and Review rows stack on narrow screens/enlarged text. Back/Edit opens the relevant step at its top, clears stale validation messages and preserves values/files. Keyboard avoidance, scrollable forms, sticky actions and safe-area spacing remain in place.

### File selection and validation

- Supported: PDF, JPG/JPEG and PNG. HEIC/HEIF are not accepted.
- The configurable limit is `MAX_DOCUMENT_BYTES` in `src/documents.ts`: 10 × 1024 × 1024 bytes per file (10 MiB, displayed as 10 MB). Zero-length, invalid and oversized sizes are rejected.
- Validate a bounded usable filename, supported extension, MIME when supplied, actual readable file size, basic PDF/JPEG/PNG signature and accessible reference. Missing picker MIME/size can be recovered from actual content/size; filenames alone cannot satisfy validation.
- Required categories remain Student ID, Proof of Registration and ID / Passport. They each require an owned, valid attachment. Student ID and ID / Passport remain separate existing policy categories; whether both should be required is a future policy decision.
- Proof of Funding remains optional. If an optional attached file expires, replace or remove it; leaving it absent never blocks a Self-funded application.
- Each card shows category, Required/Optional, local status, filename, format and size. Choose file, Replace, Remove and supported Preview actions have distinct accessible names. There are no completion checkboxes.
- A provider-wide synchronous picker lock prevents overlapping requests. Cancellation and invalid/unreadable replacement preserve the previous valid file. Valid replacement disposes only the previous attachment in the same draft/category.
- Continue from Documents, entry into Review and final Save recheck file availability. Expiry returns to Documents with the precise category error while keeping readable metadata. Native size is checked before copying and again on the owned copy; misleading source size metadata cannot leave an oversized copy accepted.

Android and iOS use Expo DocumentPicker. Android runtime testing found that its default copied cache URI was inaccessible through Expo Go's scoped `File` API (`exists` was false). Installed SDK 57 source places the Android picker copy under `context.cacheDir`, while FileSystem uses scoped app directories. Android therefore requests the granted SAF `content://` reference with `copyToCacheDirectory: false`, validates it and copies it into the app's scoped attachment cache. This corrected path was verified on the emulator with real PDF, PNG and JPEG files. iOS retains `copyToCacheDirectory: true`; actual iOS execution is unverified. No permissions are widened and no original document is deleted.

Web uses a small native browser file input instead of an additional picker library. It opens directly from the user event, removes its input/listeners after selection/cancellation, and handles both `cancel` and older-browser focus fallback. The installed Expo web picker leaves cancellation handling to browser behavior, so owning this input makes cleanup explicit. Blob URLs are created only after selection, validated and revoked on disposal. PDF viewing opens a local Blob URL with no opener; blocked popups return an availability error. Android/iOS PDF preview is intentionally unavailable without a PDF viewer dependency. Native images use a local modal preview with a decode-error fallback. Metadata remains readable when preview is unsupported.

### Temporary attachment lifecycle

`ApplicationProvider` owns one `AttachmentSession`. Draft/application records contain a whitelist of metadata (`id`, category, filename, MIME, size, local state), plus opaque reference IDs. URIs, native File instances, browser File/Blob objects and transient signature bytes stay outside serializable records, navigation parameters, manager fixtures and profile data. Signature bytes are discarded after validation. There are no raw payload/base64 records, persistent database, uploads or sensitive logs.

Native owned copies use opaque generated filenames in `Paths.cache/campusstay-attachments`. Read handles close in `finally`. Only app-generated copies are deleted on replacement/removal, leaving the draft, confirmed logout and provider unmount. The adapter can also release a picker-generated copy only when its exact parent is the expected private picker cache; it never deletes an external `content://` reference or an original phone/laptop file. Cleanup errors are best effort and never trigger deletion of another path. Abrupt OS termination cannot guarantee JS cleanup; private cache remnants may remain until OS cleanup. Metadata/references do not survive app restart, browser refresh or cache eviction and the UI makes no persistence promise.

Step Back and Review Edit preserve the draft and attachments. Leaving the Apply screen releases draft ownership and invalidates late picker results. Saving transfers the exact selected references to the new application ID before unmounting Apply. A second application has independent ownership. Confirmed Log Out calls the existing clearApplications/reset contract, releases resources and clears student state. Cancellation of logout preserves the session. No original file is modified or deleted.

### Self-funded and payment discussion

Self-funded records a student declaration, not financial verification. Its explanation says the student intends to use their own funds. No NSFAS number, funding letter, bank statement, balance or income information is requested. Proof of Funding stays optional; a supporting file can still be selected, replaced and removed.

The independent **I would like to discuss payment arrangements** preference records a boolean in the draft. Review and Status show Requested / Not requested, with the local-only boundary. It creates no payment plan, message, discount, extension, approval or reservation. Clearing the funding declaration explicitly clears that preference and leaves room, personal, emergency and document values intact.

`FundingSource` prepares five separate declarations: Self-funded, NSFAS confirmation declared, NSFAS awaiting confirmation, Parent/Guardian funded and Other bursary/sponsor. Only Self-funded is exposed as a complete student interaction because the existing form has no mandatory universal funding-source requirement. Funding-source declarations, manager review labels and future independently verified funding outcomes are deliberately distinct. Future NSFAS pending rules must follow actual residence policy and must never imply automatic rejection or conditional approval.

### Review, Status and My Documents

Review shows the exact room/price, existing personal/emergency fields, actual filenames/type/size/local status, declared funding source, student-provided/not-verified label, optional Proof of Funding and payment-discussion preference. Edit returns to the relevant existing step and retains other values.

Application Status shows the saved local record, funding declaration and per-category file information. The previous pending-provider/decision/booking timeline was removed. There is no claimed submission to a provider, manager response, financial clearance, accommodation approval or booking.

My Documents groups actual metadata by application ID and displays temporary availability. It refreshes references on focus, offers supported previews, keeps missing-file history readable and opens the exact associated Application Status. Legacy category-only records say **Selection recorded · No file attached**; they never display Attached or gain a fabricated file. Retired-room historical applications remain openable. Its back label is generic because it can now be opened from Profile or Status.

### Isolated manager funding review

The existing manager reducer/fixtures remain separate from student providers. Illustrative `ma-1` declares Self-funded, payment discussion requested and optional funding proof not attached. Its proof status is fixture data; no student File, URI, attachment metadata or newly saved application is copied into the manager workspace. Other legacy fixture records show Not declared / Not recorded where appropriate.

Funding Review supports **Not reviewed**, **Needs information** and **Reviewed locally**, using blue/neutral existing controls. The reducer validates both the application ID and status, stores the selected label per fixture and clears the explicit override when reset to Not reviewed. Existing internal review notes are reused. Saved notes/status survive list navigation and reopening during the active manager session. Exiting the workspace unmounts its local state; a new workspace starts with the fixture defaults.

These controls do not change application decision status, rooms, tenants, portfolio metrics, student notifications, bookings or payment state. Approve/Reject remain unavailable. Reviewed locally is an internal UI action, not a funding-verification outcome.

## Files changed by this task

Existing files modified:

1. `.github/workflows/ci.yml` — run the two new suites using existing CI conventions.
2. `package.json` — SDK-compatible picker/file-system declarations and two test scripts.
3. `package-lock.json` — corresponding additions/file-system hoist only relative to the starting tree.
4. `src/application.ts` — draft/record metadata, funding, real-document validation and review/summary mapping.
5. `src/state/ApplicationContext.tsx` — provider-owned reference lifecycle, actual-file checks and save/reset handling.
6. `src/screens/ApplyScreen.tsx` — genuine file controls, funding, Review integration, explicit profile reuse and responsive refinements.
7. `src/screens/AppStatusScreen.tsx` — truthful local documents/funding and removal of pending-provider milestones.
8. `src/screens/MyDocumentsScreen.tsx` — per-application metadata, availability, previews and legacy history.
9. `src/components/ProfileLayout.tsx` — optional back label; other profile screens keep their existing default.
10. `src/profile.ts` — document groups, historical navigation and updated attachment FAQ.
11. `src/manager.ts` — isolated illustrative funding fields and typed review reducer action.
12. `src/screens/ManagerScreen.tsx` — funding-review controls using existing notes/state, adaptive detail rows and explicit dark status-bar content over its light safe area (the enlarged-text runtime check exposed inherited light-on-light status text).
13. `scripts/profile-harness.cjs` — injected attachment-session behavior and reducer support for real screen-callback tests.
14. `scripts/application.test.cjs` — valid-file fixtures replace obsolete checkbox completion.
15. `scripts/baseline.test.cjs` — callback/focus mocks required by actual Status behavior.
16. `scripts/bookings-messages.test.cjs` — updated five-step asynchronous attachment journey and accurate Status expectations.
17. `scripts/profile-settings.test.cjs` — truthful legacy/empty-document expectations without treating flags as files.

Added:

18. `src/documents.ts` — typed metadata, size/type/signature rules and formatters.
19. `src/funding.ts` — student declaration and manager-review types/labels.
20. `src/attachmentSession.ts` — injected, testable ownership/availability/cleanup lifecycle.
21. `src/documentAdapter.ts` — native Expo picker and safe private-cache handling.
22. `src/documentAdapter.web.ts` — direct native browser selection and Blob URL lifecycle.
23. `src/components/LocalDocumentPreview.tsx` — safe local image preview/fallback.
24. `scripts/document-picker.test.cjs` — file validation, adapters, concurrency, ownership and cleanup.
25. `scripts/funding-workflow.test.cjs` — student/manager callbacks, real provider and funding regressions.
26. `docs/application-file-selection-and-funding.md` — this audit/implementation/verification report.

Machine-local synthetic files, screenshots, XML, logs, baseline snapshots, exports and the focused patch live under ignored `.expo/application-funding/`. They are not application assets or product fixtures.

## Dependency result

Ran `npx expo install expo-document-picker expo-file-system` after inspecting package scripts and the installed SDK's bundled module map:

- `expo-document-picker`: **57.0.3** (`~57.0.3`), new dependency.
- `expo-file-system`: **57.0.7** (`~57.0.7`), already transitive; now direct for actual bounded reads, copies and cleanup.
- Existing Expo **57.0.28**, expo-asset **57.0.19**, React Native **0.86.3**, React **19.2.3** and TypeScript **6.0.3** retained.

Comparison against the pre-task lockfile found **no version change at any existing package path**. Added package paths are the picker and hoisted file-system; removed path is Expo's nested duplicate file-system. `npm ls expo-document-picker expo-file-system` confirms one deduplicated file-system version. No force/legacy-peer-deps install, unrelated upgrade or repeated installation was used.

## Verification

Automated results and native evidence are recorded below. Successful exports are not evidence of native device execution.

### Automated checks

| Command | Actual result |
| --- | --- |
| Pre-edit `node --test scripts/*.test.cjs` | 415 passed, zero failed/skipped |
| Final `node --test scripts/*.test.cjs` | 452 passed, zero failed/skipped |
| `npm run test:documents` / underlying `node --test scripts/document-picker.test.cjs` | 19 passed |
| `npm run test:funding` / underlying `node --test scripts/funding-workflow.test.cjs` | 18 passed, including manager UI/reducer tests |
| `npm run typecheck` | Passed, strictness retained |
| `npm run lint` | Passed, zero warnings |
| `npm run check:dependencies` | Nonzero: existing Expo ~57.0.29 / expo-asset ~57.0.20 recommendations only |
| `npm run doctor` | 19/21: those two patch recommendations plus pre-existing tracked `.expo/devices.json` |
| `npx expo export --platform android --platform ios --max-workers 2 --output-dir .expo/application-funding/export-final` with `CI=1` | Passed both Android and iOS; separate Hermes bundles |
| `git diff --check` | Passed; Windows LF/CRLF advisories are not whitespace failures |

All existing suites run through the same `scripts/*.test.cjs` aggregate: baseline, shared UI, discovery, application, Phases D/E/F, profile/settings, Home, Explore, Favorites/Profile, Bookings/Messages and Property Details. New tests cover actual screen callbacks, the real ApplicationProvider, isolated manager screen/reducer transitions and injected native/browser adapters. They are automated JS tests with native modules stubbed, not device execution.

Coverage includes PDF/JPG/JPEG/PNG, extension/MIME/content/size/readability errors, missing metadata, cancellation/failure/empty results, overlap prevention, failed replacement preservation, removal, required vs optional files, exact categories, expiry, filename/size rendering, step/Edit preservation, Review/Status/My Documents, session transfer, multi-application ownership, logout/unmount/late-result cleanup, no original-file deletion, Self-funded/no NSFAS requirement, proof replacement/removal, discussion toggles, profile reuse, manager status/note persistence/reset, state isolation and unchanged room/authentication/navigation regressions.

### Android execution and responsive evidence

Executed on **emulator-5554**, `sdk_gphone64_x86_64`, Android **16 / API 36**, through the existing Expo Go + Metro session. Existing Metro listeners were inspected and reused; no competing server or destructive emulator reset was created. Only generated non-sensitive QA PDFs/PNG/JPG were used. No actual identity/student/bank document was selected.

| Native configuration | Executed checks |
| --- | --- |
| ~411dp, 1080×2400, density 420, 100% text | Full Single Room r1 five-step application; actual PDF, PNG and JPEG; replacement, picker cancellation, required-file removal/error, image preview, optional funding proof omitted, Self-funded/payment discussion, funding Edit, Review, Save, Status, My Documents and logout. Manager fixture status/note/list/reopen/exit and student cleanup also exercised. |
| 320dp, 840×1867, density 420, 200% text | Shared r2 preselection, Personal/Emergency fields, actual keyboard entry and university menu (selected long University of the Witwatersrand name), funding/discussion, required-document errors, real PDF/JPEG and a 110-character PNG filename, Review and local Save/Status. Manager review radios, internal note input/save and student return also executed. |
| 480dp, 1260×2800, density 420, 130% text | Direct Home, Shared r2 preselection, Personal/keyboard, funding/discussion, real long-filename PNG and Back/leave-draft navigation. |
| 800dp, 1600×2400, density 320, 200% text | Direct Home, Shared r2 preselection, Personal/keyboard, funding/discussion, real long-filename PNG and Back/leave-draft navigation. |

These are representative native cases, not a claim that all 12 width/text combinations or every form section at every size were exhaustively executed. Separate automated layout contracts cover 320/200%, 411/130%, 480/100% and 800/200%; existing Property Details matrix tests also remain passing. Automated layout contracts inspect structure/props, not rendered pixels.

Native observations and corrections:

- The Android copied-cache access failure was reproduced and corrected using granted SAF access plus an app-owned scoped copy; subsequent PDF/image selections succeeded.
- Cancellation preserved the previous filename. Replacement changed only its category. Removing Student ID blocked Continue and showed the exact missing-category error; selecting it again recovered.
- The native PNG preview displayed the generated image successfully from the owned `.local` copy. PDF preview is not offered natively; filenames/type/size remain available.
- Review retained filenames, exact room/price, Self-funded and payment discussion after Edit. Single r1 and Shared r2 were each exercised; the retired offering never appeared in selection.
- After Save, the same attachment filenames and attached-local states appeared in Status and My Documents. No provider timeline or verification/booking confirmation appeared.
- Manager `ma-1` retained Needs information → Reviewed locally and an explicitly saved internal note across list/reopen. No real student name/files were visible. Its review did not alter student records. A new workspace used default fixture state.
- Confirmed logout cleared student application documents and opened Login. All four original synthetic files in Downloads were checked with `stat` and remained intact. App-owned disposal paths are also covered by injected-adapter/provider tests; this is not a claim of forensic inspection of every private cache file.
- At 200% text, Gboard displayed a large first-use keyboard/font-size notice. After dismissing that OS notice, numeric text entry and the university dropdown worked. Automation also needed shorter scroll gestures, padding-area scrolling on Login and explicit editable-input targeting; those test-driver issues were not treated as product defects.
- Long names/filenames wrap and can be scrolled above sticky actions; the long filename was read in full in Review at 320dp/200%. Manager funding controls wrap without approval-like colours.
- Form labels, required/optional text, selection state, action names, errors, safe areas, keyboard behavior and visible bounds were inspected. Spoken TalkBack/VoiceOver testing was **not** performed. Expo Go's floating Tools gear appears in debug screenshots and is not a CampusStay control.

Screenshot evidence under `.expo/application-funding/`:

- `01-single-room.png`, `02-documents-before.png`, `03-self-funded-discussion.png`, `04-native-picker.png`, `06-pdf-owned-copy.png`.
- `07-required-validation.png`, `08-real-image-preview.png`, `09-required-files-attached.png`, `10-optional-proof.png`, `11-emergency.png`.
- `12-review-top.png`, `13-review-funding.png`, `14-edit-funding-preserved.png`, `15-review-filenames.png`, `16-status-saved.png`, `17-status-funding.png`, `18-my-documents.png`, `19-my-documents-files.png`.
- `21-logout-login.png`, `22-manager-funding-initial.png`, `23-manager-reviewed-local.png`, `24-manager-note-retained.png`, `25-student-home-after-manager.png`, `26-documents-cleared.png`.
- `320dp-200-shared.png`, `320dp-200-university-menu.png`, `320dp-200-university-selected.png`, `320dp-200-student-number-keyboard.png`, `320dp-200-funding.png`, `320dp-200-validation.png`, `320dp-200-long-filename.png`, `320dp-200-review-room.png`, `320dp-200-review-funding.png`, `320dp-200-review-long-file.png`, `320dp-200-status.png`, `320dp-200-status-funding.png`.
- `320dp-200-manager-funding.png`, `320dp-200-manager-status-controls.png`, `320dp-200-manager-note.png`.
- `480dp-130-room.png`, `480dp-130-funding.png`, `480dp-130-real-file.png`, `800dp-200-room.png`, `800dp-200-personal.png`, `800dp-200-funding.png`, `800dp-200-real-file.png`, `27-restored-home.png`.

Original emulator settings were restored and read back: physical **1080×2400**, density **420**, font scale **1.0**, `show_ime_with_hard_keyboard=0`, `stylus_handwriting_enabled=null` (unset). Student Home loaded after restoration. No emulator/app data was wiped. `journeys.log`, UI XML and `adb-actions.log` retain the machine-local evidence.

The finished source was then exercised once more at the restored default configuration: a complete Single Room r1 application with genuine PDF/PNG/JPEG attachments, Self-funded/payment discussion, Emergency, Review, **Edit Funding information opening at the top without losing values**, Review again, local Save, Status and My Documents. Confirmed Log Out then opened the separate manager workspace with default fixture state, and exit returned to student Home. The explicit manager status-bar correction was visually inspected. Final screenshots: `28-final-edit-funding.png`, `29-final-status.png`, `30-final-my-documents.png`, `31-final-manager-statusbar.png`, `32-final-manager-funding.png`, `33-final-home.png`. `restoration-final.txt` confirms the original settings still held after this final run and **all five** original synthetic files, including the long-named PNG, remained intact.

### Web/laptop result

Full CampusStay browser execution is **blocked** by the existing target's missing `react-dom`, `react-native-web` and `@expo/metro-runtime` packages. There is no configured web script. They were not added because the task permits a small picker addition and asks to preserve the established native baseline, not expand the web stack.

The actual `.web.ts` adapter was executed in automated tests with injected DOM/window/File/Blob APIs. Tests exercised direct picker triggering, selection, cancellation/input removal, metadata, local PDF popup success/blocking and URL revocation. This is **not** desktop-browser application E2E evidence. Browser-specific picker cancellation/focus behavior and rendered desktop navigation remain unverified until Expo Web is enabled and tested in real browsers.

### iOS result

iOS Metro/Hermes export passed. A compatible iOS simulator/device is unavailable on this Windows host, so iOS document-picker/copy access, replacement/removal, image preview, keyboard, VoiceOver and full form execution are **unverified**. Successful iOS export is not runtime proof. The native adapter retains Expo's supported iOS cache-copy option and closes/deletes only owned resources; this still needs physical/simulator verification.

The installed Doctor warning count differs from the older reported 20/21 because `.expo/devices.json` is currently tracked even though `.expo/` is ignored. It was already tracked at task start. No index changes, diagnostic exclusions or package upgrades were made to hide either warning. Existing CI's dependency-check step therefore remains subject to the known patch-version failure.

### Privacy and future integration

No backend, auth service, API, database, persistent personal-document store, upload, external message, payment execution or accommodation confirmation was introduced. Existing remote property images are unrelated to document handling. Actual student personal data and file handles do not enter manager fixtures. No new permission broadening, blanket `any`, strictness disable or diagnostic suppression was added.

Future backend work requires authenticated students, approved managers, property ownership authorization, private storage, per-application file permissions, server-side type/content/size and malware validation, secure uploads, retention/deletion policy and audited decisions. Basic client signatures do not fully parse a PDF/image or certify that it is safe/authentic. Filesystem/cache cleanup is best effort; no encryption or document-verification claim is made. Declarations and internal review remain separate from any future independently verified funding outcome.

## Preservation and review handoff

The task's starting snapshot, original byte copies/hashes and staged diff were retained under `.expo/application-funding/`. Final comparison identified exactly the **26 files** listed above. Starting `app.json` and `tsconfig.json` edits and the untracked `assets/google-g.png` are byte-for-byte unchanged. Other original files outside this task remain unchanged. Existing package manifest/lock edits are retained; the task-specific dependency delta is only the two declared Expo modules and the file-system hoist described above.

The staged diff remains identical to the starting empty staged diff. No reset, clean, discard, stage, commit or push was performed. The pre-existing tracked `.expo/devices.json` was not removed from tracking because this task prohibits index changes.

`task-only.patch` in `.expo/application-funding/` is a focused patch from the pre-task bytes to the final files, including new files. It excludes unrelated pre-existing changes relative to HEAD. Its reverse applicability was checked read-only against the finished workspace. `preservation-final.json` records the changed-file list, preservation checks and lockfile comparison. The final Git whitespace check passed.

The requested local frontend workflow is ready for review. Remaining verification gaps are real-browser Expo Web execution, iOS runtime behavior, spoken screen-reader testing and an exhaustive native 12-case size/text matrix. Existing Doctor/dependency warnings remain visible. Actual provider delivery, authorized manager access to student files, funding verification, messaging, payments, durable retention and booking confirmation require future authenticated backend work and were not implemented. Stop here; no subsequent backend or product phase was started.
