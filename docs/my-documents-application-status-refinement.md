# My Documents and Application Status refinement

## Scope and initial audit

The task began with 118 existing tracked/untracked files snapshotted under the ignored `.expo/documents-status/before/` directory. No applicable `AGENTS.md` was found in the repository or its ancestors. The apple-design skill informed restrained typography, spacing, predictable navigation, immediate press feedback and text-size adaptation; existing CampusStay tokens, navy/blue palette, Outfit/Inter, headers and rounded cards remain.

My Documents previously stacked category, filename, format/size, status and a full-width Preview button as separate blocks. Application Status repeated both the funding status and declaration qualification, repeated the saved milestone, and duplicated every document's metadata. Image preview put an unbounded filename above the image and its Close action below it.

## Implementation

- My Documents keeps one card per application, showing the real property name and application reference. Each divided file row contains category/requirement, full wrapping filename, concise format/size/availability metadata and an image Preview action with at least 48dp height. PDF, image and missing-file icons use existing Ionicons. Missing required, optional, legacy selection-only and unavailable temporary references retain distinct wording. No filename deduplication occurs.
- A short screen-level explanation covers session-only availability and absence of transmission/verification. PDFs retain their filename and metadata with “PDF preview unavailable”; there is no broken PDF button or new renderer.
- Rows stack their action below the file at 320dp or enlarged text above 130%. No filename line cap or text scaling override is used. Existing profile safe areas, scrolling and 640dp content limit remain.
- Application Status retains property, room, rent, reference, creation date and Saved locally badge, alongside the truthful saved-session notice. The redundant one-item timeline is removed. Narrow/enlarged layouts stack the property image and text; content is constrained to 640dp.
- Funding rows now read Funding source, Declaration/Declared status, Supporting document, Payment discussion, then Update Funding Information. Non-NSFAS sources show the student-provided/not-verified qualification once. NSFAS outcomes retain their separate student-reported status and one explicit qualification. Neither a selected Confirmed outcome nor an attachment becomes verification. Payment discussion retains “Requested · Recorded here only”.
- Documents in Status become owner-scoped usable required/optional counts, with missing-required and unavailable-reference warnings. Category selections, invalid metadata and expired references cannot count as files. Full metadata remains available in My Documents.
- View My Documents passes the exact application ID through the existing route. That application appears first and is marked Selected application; other applications are retained. An expired requested ID shows an alert and preserves the remaining records. Profile's existing parameter-free route remains supported.
- Image preview keeps aspect-fit rendering and its error fallback. Close is placed above the filename, which has its own bounded scroll region; the image retains the remaining space. All four safe-area edges are respected. Android's preview window draws its white canvas under both system bars, with explicit safe-area padding protecting the controls. The paired window flags follow the [React Native 0.86 Modal requirements](https://reactnative.dev/docs/0.86/modal#navigationbartranslucent). No uploads or remote preview service is used.
- Optional attachment counts use correct singular/plural wording. An unavailable requested application receives a concise alert without implying other records exist when the list is empty.

## State, privacy and regression boundaries

The application provider, registry, picker adapters, funding editor, manager state, room records, entry point and keyboard controller remain unchanged in this task. Each category retains its own document association. Availability, preview and counts use the owning application ID. Funding saves still stage, validate and commit through the established provider, preserving personal/emergency details, unrelated attachments and the exact application ID. Logout releases owned copies and clears current-session applications. Source documents are never deleted by these screen changes.

Single r1 (R3,500; four rooms) and Shared r2 (R2,200; six rooms), retired Studio restrictions, five-step applications, NSFAS Pending/Confirmed/Unsuccessful and Self-funded/Parent/Guardian/Sponsor declarations remain covered by existing suites. Manager fixtures and notes remain isolated; student updates do not create manager messages, approvals, notifications, reservations, uploads, authentication, payments or bookings. No dependency installation or upgrade was performed.

## Verification

Native iOS execution is unavailable on this Windows host. The brief's real-iPhone observations are user-reported prior evidence, not execution performed in this task. Spoken VoiceOver/TalkBack has not been performed.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `node --test --test-reporter=tap scripts/*.test.cjs` | 530 passed, zero failed/skipped; includes 28 new focused tests and all 502 previous tests |
| `npm run check:dependencies` | Failed with unchanged patch recommendations: Expo 57.0.28 → ~57.0.30, expo-asset 57.0.19 → ~57.0.20 |
| `npm run doctor` | 19/21; the same patch recommendations and existing tracked `.expo/devices.json` finding. `.expo/` is already ignored; the tracked file was left unchanged |
| `npm run export:check` | Passed for Android and iOS, both Hermes bundles 5.4 MB. First sandboxed attempt failed to write a temporary `.hbc`; rerun outside that restriction completed |

Existing tests were adapted to the intentional presentation changes: one saved overview instead of a repeated milestone, summary counts and exact-ID navigation instead of filenames duplicated in Status, and the concise session explanation. The full filenames remain asserted in My Documents. No suite was disabled. The new suite is exposed as `test:documents-status` and added to the existing CI workflow.

New regressions cover full long filenames, real metadata, category/requirement/status wording, owner-scoped availability counts, unavailable and malformed references, legacy no-file selections, equal names across categories/applications, exact-ID navigation, PDF preview absence, image-preview integration/error/safe areas, logout cleanup, six funding declarations/outcomes, update isolation, and all twelve requested width/text-scale layout decisions. Existing suites continue covering native adapter normalization, replacement/cancellation, temporary ownership, five-step applications, rooms, profile and manager isolation.

The implementation follows React Native's standard [Text scaling and accessibility behavior](https://reactnative.dev/docs/text) and [scroll container behavior](https://reactnative.dev/docs/scrollview). Structural tests are not proof of native layout or spoken assistive-technology operation.

### Outstanding iOS manual checklist

Use synthetic files only: save a Camera capture to a category and preview it; select a sample PDF in Files and verify name/size (no in-app PDF viewing); replace a file, cancel a subsequent replacement and confirm the valid replacement and unrelated files survive; check My Documents association and Status counts/funding; open Update Funding Information and return/cancel without changing the record. Check long filenames, portrait/landscape image content, small screen heights, safe areas, enlarged Dynamic Type and VoiceOver reading order.

### Android native journey

The existing API 36.1 emulator and localhost Metro were inspected and reused. No competing development server was started. Native Files returned the synthetic PDF with its actual 629-byte size. Photo Library returned the inspected synthetic QA PNG; cancelling a native Files replacement retained it. Camera returned a JPEG, which opened in the shared aspect-fit preview. A five-step Shared Room application was saved locally with three required files and optional funding evidence, shown correctly on Status and My Documents.

In Update Funding Information, a saved PNG was replaced by a PDF in the editor. Cancelling a further Files selection retained that replacement. Cancelling the editor preserved the application's original PNG. Saving NSFAS Pending and removing optional funding evidence retained the same application ID, property, Shared Room and R2,200 monthly rent, with three required and zero optional usable attachments. Screen captures and matching native XML are under `.expo/documents-status/`.

This emulator has limited free storage and can reclaim cached fonts/files. For controlled QA, its `sys_storage_threshold_percentage` was temporarily changed from unset to 1, as in prior verification. This does not guarantee attachment persistence in normal use; unavailable references retain truthful UI states.

An initial camera attempt used Android's “Only this time” permission and spent long enough in the external camera for Android to revoke it. The OS exit record explicitly reports `PERMISSION CHANGE`, “one-time permission revoked”; Expo Go restarted and that session-only draft was lost. Capture/return/preview subsequently passed with “While using the app”. Process death does not restore an in-memory application; no persistence or speculative pending-result reassignment was added. This remains a real session-lifecycle limitation.

### Responsive native verification

All twelve populated-screen combinations completed on Android:

| Width | 100% text | 130% text | 200% text |
| --- | --- | --- | --- |
| 320dp, 568dp height | Passed | Passed | Passed |
| 411dp | Passed | Passed | Passed |
| 480dp | Passed | Passed | Passed |
| 800dp | Passed | Passed | Passed |

Each combination checked the exact local application reference, Shared Room/R2,200 rent, usable required/optional counts, application association, Selected application marker, full Preview/document navigation controls of at least 48dp, no horizontal overflow in those controls, scrolling to final actions and header Back returning to Status. Long filenames remain available through wrapping and scrolling. Image preview with the long filename was also exercised at 320dp/200%. Native captures were visually inspected at small, regular and wide sizes. Expo Go's floating Tools control is a development overlay visible in some captures.

Changing Android's font-size setting restarts this Expo Go experience, clearing in-memory applications. The remaining combinations therefore created new synthetic records through the actual five-step UI and real native Files picker, rather than injecting screen fixtures or adding persistence. Initial helper failures caused by scrolling from the system gesture area, fast scrolling past text, or expecting an offscreen Preview in the current accessibility tree were corrected in ignored QA scripts; those failed attempts are not counted as passes. The 100% 320dp result is recorded in `journeys.log`; the other eleven completions are recorded in `matrix-completed.txt`.

The main matrix precedes the final three small deltas: Android preview window flags, optional-count pluralization and stale-route copy. Final TypeScript, lint, all 530 tests and both exports passed again after those changes. A final targeted native pass at 320dp/200% verified the corrected counter and preview, scrolling to the filename's `2026.png` suffix, and the image remaining visible independently of the filename and Close control. The underlying screen no longer appears through the preview's system-navigation area.

Both the native edge Back gesture and a tap on the observed three-button Back control closed the preview to My Documents. View application opened the exact saved application ID. Switching navigation modes restarted Expo Go, so the three-button check used a fresh synthetic application. Logout cleared the local application/document list, Continue without signing in returned to the student app, and My Documents showed its empty state. These are native Android checks, not Babel transformation or export claims.

The emulator was restored and read back: physical size 1080×2400 with no override; density 420 with no override; `font_scale=1.0`; `show_ime_with_hard_keyboard=0`; gesture navigation enabled; original Camera permission denied with only its original sensitivity flags; `sys_storage_threshold_percentage=null`. An initial reopen raced Android's configuration transition and remained on the launcher; reopening after configuration settled passed the bounded startup check. The final capture shows CampusStay Home. All five synthetic Downloads originals remained present at their recorded sizes (629, 629, 6502, 21020 and 6502 bytes). No original was deleted to make space.

### Evidence

- [My Documents, compact rows](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/20-documents-compact.png)
- [Application Status, Self-funded](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/18-status-overview.png)
- [Camera image preview](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/15-camera-image-preview.png)
- [411dp/200% full filename and Preview action](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/matrix-411-2.0-documents-long-name.png)
- [Final preview, gesture navigation](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/final-gesture-preview-safe-areas.png)
- [Final preview, filename scrolled to its end](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/final-preview-long-filename-end.png)
- [Final preview, three-button navigation](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/final-three-button-preview-safe-areas.png)
- [Logout clears My Documents](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/final-logout-cleared-documents.png)
- [Restored Home](C:/Users/mudau/Documents/GitHub/expo-campusstay/.expo/documents-status/final-restored-home.png)

Matching XML, native action logs, configuration readback, matrix completion records and command outputs remain in the ignored `.expo/documents-status/` directory. Final command logs are `final-typecheck.txt`, `final-lint.txt`, `final-all-tests.txt`, `final-exports.txt`, `resume-dependencies.txt`, `resume-doctor.txt` and `final-diff-check.txt`. The final export produced Android `AppEntry-82efcec9f6de1da2dbcf59ccbb43f547.hbc` and iOS `AppEntry-eb8d48a84951f3f4b2b461f670eaafe7.hbc`, each 5.4 MB.

### Remaining limits

Real iOS runtime, iPhone safe areas and spoken VoiceOver/TalkBack remain manual checks. In-app PDF rendering remains unavailable. Temporary references can expire, and session-only records do not survive Expo Go/process recreation. Native QA used the documented temporary low-storage threshold adjustment. Expo Doctor/dependency checks retain the two baseline findings; The local equivalent of CI's dependency-check step still fails with those patch mismatches. No remote CI run was triggered and no dependency was upgraded to conceal the findings.

## Files in this task

The exact focused diff is recorded in `.expo/documents-status/task-only.patch` relative to this task's snapshot, including changes to files already modified by earlier work. The final preservation check reports file and index integrity.

The final comparison identifies exactly 14 task files, zero missing starting files and an unchanged Git index. Dependency lock entries, `App.tsx`, `tsconfig.json`, `src/data.ts` and `src/rooms.ts` retain their task-start values. Git diff whitespace checks and UTF-8/trailing-whitespace checks across all task files passed. No reset, clean, discard, commit or push was performed. No backend, persistent storage, authentication, upload, payment, reservation or booking confirmation was added. Work stops at this refinement.

| Files | Change |
| --- | --- |
| `src/screens/MyDocumentsScreen.tsx` | Compact document rows, honest status/preview metadata, selected application identification |
| `src/screens/AppStatusScreen.tsx` | Compact accommodation/funding presentation, availability-based document summary, exact-ID document route |
| `src/components/LocalDocumentPreview.tsx` | Independent Close control, safe areas, scrollable full filename and aspect-fit image space |
| `src/documents.ts` | Pure owner-scoped document summary helper |
| `src/navigation/types.ts` | Optional application ID on the existing My Documents route |
| `scripts/documents-status.test.cjs` | 28 new focused tests |
| `scripts/baseline.test.cjs` | Native dimension mock and real funding helper in the existing VM harness |
| `scripts/bookings-messages.test.cjs` | Saved overview assertion replacing the repeated milestone expectation |
| `scripts/funding-workflow.test.cjs` | Summary and exact application navigation, retaining filename/ownership tests in My Documents |
| `scripts/nsfas-funding.test.cjs` | Declared-status/evidence/count expectations, retaining full document metadata checks |
| `scripts/profile-settings.test.cjs` | Concise truthful session explanation assertion |
| `package.json`, `.github/workflows/ci.yml` | Focused suite script and CI invocation; dependencies unchanged |
| `docs/my-documents-application-status-refinement.md` | This audit, implementation and verification report |
