# CampusStay manager portal refinement

Verification date: 17 October 2026 (Africa/Johannesburg).

## 1. Initial findings

The existing manager workspace already provided local property/room editing, application review, tenants, analytics and settings. It was refined in place. It had no property gallery model or picker integration; the amenity field was comma-separated text. Manager details appended the city to addresses that already contained it. Selected navigation drew a separate blue line underneath its text. Funding displayed two overlapping declaration rows, and unavailable approval/rejection buttons looked actionable.

`Room.available` is already used as a **listed-room count** by the student `getListedRoomCount` helper. Tenant `roomId` values refer to room offerings/categories, not individual physical rooms. Equating active tenants to occupied rooms and dividing by tenants plus listed rooms was unsupported, especially for shared occupancy. No physical-unit occupancy ledger or verified vacancy feed exists.

The requested Android installation/runtime baseline could not be confirmed: `adb devices -l` returned an empty list. No emulator was started, reset, installed or reinstalled for this task. Earlier reports' native successes are not claimed as evidence for this change.

## 2. Exact files changed

Existing files modified, including files that were already untracked:

- `app.json`: expand the existing camera purpose description to include property photography. No permission or dependency was added.
- `src/manager.ts`: gallery-aware local property cloning; amenity normalization; accurate inventory/occupancy semantics.
- `src/propertyDetails.ts`: shared display-address normalization and city deduplication.
- `src/screens/ManagerScreen.tsx`: integrate gallery/amenities, dirty-state/save guards, photo preview, truthful inventory labels, funding presentation, disabled decisions, manager navigation indicator removal, responsive manager headings.
- `scripts/profile-harness.cjs`: injectable photo adapter and new component stubs for actual callback tests.
- `scripts/phase-e.test.cjs`: explicit listed-room/tenant/unknown-occupancy expectations.
- `scripts/funding-workflow.test.cjs`: concise declaration and genuinely disabled decision assertions.
- `scripts/nsfas-funding.test.cjs`: preserve private-file boundaries while allowing legitimate property-photo URI metadata.
- `scripts/home.test.cjs`: update one pre-existing stale assertion that still required two navbar label lines; retain order, safe-area and adaptive-wrapping checks.

New files:

- `src/managerGallery.ts`: gallery records, ordering, cover selection and workspace transaction/ownership logic.
- `src/managerPhotoAdapter.ts`: native picker and isolated SDK file staging.
- `src/components/ManagerPropertyGallery.tsx`: editor gallery and saved-photo preview.
- `src/components/ManagerAmenities.tsx`: selectable chips and custom amenities.
- `scripts/manager-refinement.test.cjs`: focused domain, adapter, callback and responsive-configuration regressions.
- `docs/manager-portal-refinement.md`: this report.

## 3. Property photo architecture

Only manager-local property records gain `photos` and `coverPhotoId`. Student `Property`, fixtures, applications, attachment providers and room snapshots are not extended or linked to manager galleries. Each photo has a stable ID, property ID, source kind, app-owned URI and display name. Local photos also record byte size and a content fingerprint for duplicate detection. No base64 or EXIF is stored.

Existing fixture image URLs are converted to stable, property-scoped seed IDs without changing those URLs. These are remote fixture images, not newly bundled files; their network availability is unchanged. `images` remains compatible with existing property cards. Its first element is the chosen cover, while the separate `photos` sequence preserves gallery order.

Limits: eight photos per property, 10 MiB per photo, 100 MiB of retained workspace photo copies, and a 10 MiB free-space reserve before copying. Replacement temporarily retains the prior saved copy until save/discard, so a replacement can fail safely when the workspace is full.

## 4. Image picker integration

The existing installed `expo-image-picker` handles library and camera selection. Library selection is bounded, ordered and supports multiple photos; replacements and camera captures select one. No broad library permission is requested. Existing camera permissions are checked, requested only when appropriate, and denial is explained.

Current asset representation is requested on iOS. JPEG and PNG metadata, actual source size, copied bytes, signature, image decoding and fingerprint availability are checked. HEIC/HEIF, GIF, unsupported files, empty/unreadable references, invalid image content and oversized images are rejected explicitly. No conversion is silently promised.

Cancellation returns the unchanged draft. Recovered Android results without an editor association are ignored. Synchronous busy guards prevent duplicate launches and saves while a picker is open. Late asynchronous results cannot attach to a discarded editor or a different workspace.

Implementation was checked against the installed SDK 57 package source and [Expo ImagePicker documentation](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) and [Expo FileSystem documentation](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/).

## 5. Ownership, storage and cleanup

The native student staging module was inspected and **not reused**: it owns student-specific sessions, backup protections and destruction cleanup. Sharing that session would couple property photos to identity-document lifecycles. Its Kotlin/Swift code and student protections are unchanged.

Property photos use the existing Expo FileSystem API in a separate app-private Documents namespace:

`campusstay-manager-photos-v1/property-photos-<session-id>/`

This avoids disposable picker-cache references for saved galleries and requires no new native module or npm package. Only SDK picker-cache sources are admitted; arbitrary Documents paths and native student staging paths are rejected. Originals and picker source files are never deleted by gallery cleanup.

**These manager-photo Documents copies are OS-backup eligible.** They do not inherit the native student store's backup exclusion or iOS Complete protection. No protection was removed from student documents. If backup-excluded manager photos become a requirement, an independently owned native namespace and appropriate Android/iOS build verification are needed; that change is not silently included here.

A workspace registry owns copied files. Unsaved removals release copies only when no saved property/draft still references them. Saving removes superseded copies after the valid new record is prepared. Discard keeps the saved gallery. Closing the workspace releases its copies. Recognized stale workspace directories from an earlier crash are swept on the next photo-storage initialization; active workspaces in the same runtime are skipped. Failed deletion is retried, and another selection is blocked while failed candidate cleanup remains outstanding.

Photo/property records are in memory only. Leaving the manager workspace or restarting JavaScript loses those records. A crash, locked file or interrupted cleanup can leave residual app-private photo copies until later cleanup; their existence does not restore a portfolio. No restart persistence or secure physical erasure is promised.

## 6. Cover and ordering

Cover selection does not change gallery ordering. Move earlier/later actions reorder stable IDs with bounded controls; no drag dependency was introduced. Replacing a photo creates a new asset ID at the same position and transfers cover selection if necessary. Removing a cover selects the next surviving photo. Empty galleries remain valid, preserving the existing optional-photo property workflow.

Preview, cover, replace, camera replacement, removal and ordering controls have descriptive accessible names and existing button touch targets. Filenames are visually bounded to two lines and expose their full accessible text. Cover/preview images remount when photo identity changes so a previous image error does not stick to its replacement.

## 7. Add Property

Existing required fields and first-room validation remain. A draft uses the next stable manager property ID before selecting photos; save validates file ownership/availability and commits the ordered gallery/cover with that ID. A synchronous guard prevents duplicate saves. Invalid saves retain the draft/gallery and create no property. No save publishes a listing or changes student fixtures.

## 8. Edit Property and dirty-state protection

Existing seed images remain visible and are editable through the same gallery controls. Editing starts with a cloned saved gallery. Property fields, gallery changes, in-progress selection, dirty room edits and unsaved review notes participate in leave confirmation. Keep editing retains the draft; Discard preserves saved data and releases unreferenced candidates. Tab changes, nested back actions and root exits use the existing confirmation mechanism.

## 9. Address formatting

Manager and student property details now share `getPropertyAddress`. Display formatting trims whitespace/comma fragments, detects an existing city case-insensitively, handles city fragments before postal codes and appends a missing city once. Street-only and empty optional fragments are supported. Historical/raw addresses and IDs are not rewritten.

## 10. Amenities

Existing amenities are displayed alongside common selectable chips. Custom names are supported; normalization trims whitespace and deduplicates case-insensitively while preserving first spelling/order and uncommon existing names. The underlying `string[]` property model and filtering compatibility remain.

## 11. Room management verification

Campus View retains `r1` Single Room: capacity 1, R3,500, four listed rooms; `r2` Shared Room: capacity 2, R2,200, six listed rooms. Total ten; starting price R2,200. The retired `r3` Studio remains historical-only and excluded from current inventory. Room IDs, categories, capacities and historical labels are not changed. Price validation remains finite and positive; counts remain nonnegative integers. Edits target property ID plus room ID and retain existing save feedback. Student submitted snapshots are untouched.

## 12. Inventory semantics

Dashboard, cards, details, room fields, filters and Analytics now consistently say **listed rooms**. Internal legacy names such as `available`/`getPropertyAvailableRooms` remain compatible; they are not a live vacancy claim. Tenant count remains a separate local-record count. Occupied physical rooms and occupancy percentage are `null`/“Not recorded” because unit-level data is absent. The six Dashboard cards and Analytics summary/property-card structure remain; unsupported percentage/meter output is omitted rather than fabricated.

## 13. Manager navigation

The perceived underline was a separate `navIndicator` view, not `textDecorationLine`. It was removed without changing Dashboard/Properties/Applications/More order, blue selected icon/text, selected font weight, accessible tab roles or selected state. Functional borders, form outlines and unrelated dividers remain. No text underlines were introduced.

## 14. Funding review

Funding source and one Student declaration row replace the redundant declaration pair. The row uses real model values and retains NSFAS pending/confirmed/unsuccessful declaration context and “Not verified” wording. Supporting-evidence metadata, payment-discussion flag and local funding review remain distinct. Manager records still receive no student private files.

## 15. Disabled approval/rejection

Both decision buttons use disabled secondary styling with no press handler. A contextual explanation identifies authenticated server decisions as unavailable. No approval/rejection transition, booking, payment, notification or student message is generated. Not reviewed / Needs information / Reviewed locally remain available independently.

## 16. State isolation

Manager properties are cloned from the portfolio fixtures. Notes and local review status are keyed by manager application ID. Switching applications loads the corresponding saved note; cancelled note edits do not overwrite saved notes. Property/photo ownership is local bookkeeping, not genuine authenticated authorization. Tenants remain read-only, and Settings retains its existing availability messages and Return to Student Home.

## 17. Automated checks

Final evidence is recorded in `.expo/manager-refinement/`.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `node --test --test-reporter=tap scripts/*.test.cjs` | **669 passed, zero failed/skipped** |
| `npm run check:dependencies` | Passed against online Expo metadata; dependencies up to date |
| `npm run doctor` | **21/21 passed** with network access |
| `npm run export:check -- --output-dir .expo/manager-refinement/export-final` | Android and iOS Hermes exports passed |
| `git diff --check` | Passed |

The first dependency check used the installed SDK's offline map, and the first Doctor run reached 19/21 with DNS/metadata failures. The authorized online reruns passed. The first export hit a sandbox temporary-file permission error in Hermes; the authorized rerun and final-source export passed. No dependency workaround, reinstall, compiler change or diagnostic suppression was used.

Coverage includes add/edit galleries, cancellation, atomic replacement failures, ID collisions, cache independence, source boundaries, missing files, low storage, failed cleanup, duplicate content, cover/order/removal, correct associations, late results, save/launch races, saved-reference retention, address/amenity behavior, room validation/history, occupancy semantics, disabled decisions, local note isolation and existing student regressions.

Headless configuration checks cover gallery, Dashboard and manager navigation at 320/411/480/800dp × 100%/130%/200%. They do not measure native glyph layout or prove pixel-perfect device rendering. Existing KeyboardForm, SelectField and ChoiceSheet are reused; headers allow wrapping and long brand/room headings have constrained flexible columns.

## 18. Android runtime evidence and limitation

`emulator-5554` was unavailable; `adb devices -l` returned no devices. Therefore no new Android photo selection/camera/filesystem, gesture-navigation, three-button navigation, keyboard or manager journey is claimed. No emulator was restarted/reset, no APK was installed and no duplicate Metro was started. Successful Hermes exports are build checks, not device execution.

## 19. iOS limitations and manual checklist

No iOS runtime is available in this Windows environment. iOS export is checked, but native picker, camera permission, image decoding, file staging and VoiceOver remain unverified. The existing camera purpose string now includes property photography; a new iOS binary is needed to display updated native permission wording. No new native module functionality was added. Existing student native storage still requires its appropriate custom build.

Manual iPhone/Android follow-up:

1. Open Manager Workspace; add a property with JPEG/PNG library images and a camera photo; test camera denial and cancellation. Confirm HEIC/unsupported/oversized files receive truthful errors.
2. Preview each image, choose a cover, reorder and save. Reopen the correct property and verify order, cover and local-only messaging.
3. Replace and cancel replacement; simulate failed/missing/low-storage selection. Confirm the saved gallery remains intact and originals remain in the device library.
4. Remove a draft photo; test Keep editing/Discard across nested back, tabs and root exit. Verify unrelated properties and student applications/documents remain unchanged.
5. Exercise room-price/count errors, applications, NSFAS declarations, local review notes and disabled decisions. Confirm no external actions are claimed.
6. Repeat relevant forms/gallery at the requested widths/text settings; inspect keyboards, safe areas, long names/filenames and both Android navigation modes. Verify spoken TalkBack/VoiceOver names, selected states and focus return.
7. Return to Student Home and smoke-test student tabs, room preselection, document/funding flows and the absence of navigation text underlines.

## 20. Remaining backend/native requirements and preservation

Future services need authenticated property ownership, stable server photo IDs, private/public media policy, upload limits and image processing, durable metadata and deletion/refcount contracts. Real tenant/unit inventory is required before occupancy/vacancy calculations. Application decisions and notifications require authenticated ownership and idempotent policies. None of those services, persistence, remote uploads, authentication, payments, genuine bookings or communications were introduced.

All starting tracked/untracked source files are retained. The existing staged removal of `.expo/devices.json` is preserved; the Git index is unchanged. No reset, clean, discard, commit, push, dependency upgrade or installation was performed. Existing phases and the student navbar changes remain intact. Work stops after this manager refinement.
