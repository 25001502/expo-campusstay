# CampusStay G.1 — document storage reliability

Status, 17 October 2026: **Option A explicitly approved and implemented; Android build passed, but device installation is blocked by insufficient emulator storage.** The user approved backup-excluded native staging and building/installing an Android development app. No npm package was added or upgraded. The complete app compiled, including the Kotlin module; Android rejected its first installation. Post-change Android journeys and iOS native compilation/runtime remain unverified. G.1 implementation is reviewable, but its runtime verification gate is not complete.

## 1. Original low-storage failure

Phase G's post-restart Android run had approximately 392MB free on a 5.8GB data volume (94% used). After actual file selection, Student ID `qa-student.pdf` and registration `qa-registration.png` became unavailable while the identity image remained available. Application validation rejected the missing copies and retained their filenames and category history. Reattachment with a temporary cleanup-threshold override allowed that earlier test to finish. G.1 does not use or endorse that workaround.

Evidence retained without modification: `.expo/phase-g/post-restart-smoke/initial-settings.txt`, `application-interruption.xml`, its PNG, and the Phase G report. The older native investigation in `.expo/native-attachments/diagnostic-counts.txt` records a distinct owned copy, a successful initial read, then `exists:false` while the owner was neither closed nor stale. Its storage-monitor evidence and accompanying report record proactive cache reclamation. These are prior native results, not newly executed G.1 tests.

## 2. Confirmed root cause and exact location boundary

The pre-G.1 native adapter in `src/documentAdapter.ts` created **`Paths.cache/campusstay-attachments/<opaque-id>.local`** for every native candidate. These are CampusStay-owned copies, not merely the picker originals. The installed SDK explicitly defines `Paths.cache` as reclaimable when storage is low. Retained diagnostics show disappearance of an owned copy, not only loss of a picker permission. This cache placement is the retention defect demonstrated by the evidence.

The affected directory is identified exactly relative to the SDK's scoped cache root. The Phase G capture identifies the affected Student ID and registration attachments. Their historical opaque file IDs/full private URIs were not retained; this report does not invent them or claim a per-inode deletion trace. Separate failures such as insufficient space, permission loss, failed copy, cancellation and app-driven cleanup must retain separate handling.

## 3. Filesystem locations investigated

Installed versions: Expo 57.0.30, expo-asset 57.0.20, expo-file-system 57.0.7, DocumentPicker 57.0.3 and ImagePicker 57.0.20. React 19.2.3, React Native 0.86.3 and TypeScript 6.0.3 remain unchanged.

| Location | Finding |
| --- | --- |
| Android Files `content://` selection | Current DocumentPicker disables its cache copy and grants access to the selected reference; CampusStay subsequently copies it. Originals must never be deleted. |
| iOS Files selection | Current picker uses its supported private cache copy before CampusStay stages its own copy. |
| Photo Library / Camera | Installed ImagePicker creates private temporary/cache outputs. Both already enter the common validation/copy pipeline. |
| Current owned cache directory | Private and normally excluded from backup, but eligible for cache reclamation. |
| SDK `Paths.document` | Private non-cache storage with no ordinary cache eviction; persists beyond process termination and is backup-eligible by platform default. |
| Android `Context.getNoBackupFilesDir()` | Native private non-cache location excluded from Android backup. Not exposed by the installed filesystem Paths API. |
| iOS private Application Support with backup exclusion | Native Foundation resource flags can exclude non-cache staging from backup. No equivalent setter is exported by the installed Expo filesystem API. |

Inspection covered the installed TypeScript API and Swift/Kotlin implementation, including `Paths.ts`, `Directory.types.ts`, `File.types.ts`, `FileSystemModule.swift`, `FileSystemModule.kt`, `AppContextConfig.swift` and the picker modules. `Paths.availableDiskSpace` is backed by a native property on both platforms, not a one-time JS snapshot. No supported per-file backup-exclusion or iOS protection-class setter was found. A folder merely named `no_backup` under Documents would not obtain Android's native no-backup semantics; path traversal outside Expo's scoped roots is not an acceptable workaround.

## 4. Staging strategy and approval checkpoint

The brief explicitly says:

> If changing the file location creates an unavoidable conflict with the existing privacy or session-only contract, STOP and present the smallest safe options for approval rather than silently relaxing those requirements.

The confirmed tradeoff is that a simple cache-to-Documents move fixes routine eviction but introduces backup eligibility for sensitive session files. Cleaning on the next launch cannot remove a copy already captured by an OS backup. Non-cache files also remain on disk after an abrupt process exit until cleanup can run. The brief anticipates next-start cleanup, but backup participation is an additional privacy boundary that should not be silently accepted. This is the engineering interpretation triggering the brief's explicit checkpoint; it is not an Apple Design approval requirement.

| Decision | Concrete scope and consequence |
| --- | --- |
| **A — Backup-excluded native staging (recommended for the stated privacy boundary)** | A narrowly scoped local native storage helper: Android no-backup storage; iOS private Application Support with directory/file backup-exclusion flags and an explicit data-protection policy. Shared JS ownership/validation remains. No dependency upgrade is proposed. Requires native development builds; Expo Go cannot acquire this missing native capability from a JavaScript export. Building/installing the Android development app needs explicit approval; iOS build/runtime verification remains separate on this Windows host. |
| **B — Existing-SDK Documents staging with explicit acceptance of limitations** | Opaque session folders under `Paths.document`, stale-session cleanup before attachment use, the existing in-memory application model and no app-driven uploads. Works with the existing Expo Go API. Accept that OS backups may include the unencrypted-by-CampusStay document bytes and that abrupt termination leaves residual files until a later successful cleanup. No backup-exclusion or encryption guarantee would be made. No package or native configuration change is proposed for this option. |
| Do not approve either | Keep the investigation and current code intact; the known cache-retention defect remains unresolved. |

**Approved choice: A.** Approval is recorded in this chat and `.expo/phase-g1/approval.json`. A local Expo module is discovered through the installed autolinker’s default `./modules` directory. It does not require an npm dependency or app-wide backup flag. An Android-only `allowBackup:false` change would not solve iOS exclusion and does not by itself establish all device-transfer exclusions. Expo Go remains usable for navigation, but attachment selection fails explicitly with an installed-app requirement; there is no cache/Documents fallback.

## 5. Privacy, encryption and backup implications

Private storage is not a promise of application-level encryption. The existing adapter does not encrypt document bytes. OS filesystem protection, backup encryption and device lock policies are distinct and must not be fabricated as CampusStay guarantees.

[Android's official backup guidance](https://developer.android.com/identity/data/autobackup) includes ordinary private files by default and excludes native cache/no-backup directories. It also documents limitations of app-wide backup flags for some device transfers. [Apple's backup guidance](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup) requires resource-value exclusion for nonpurgeable data that should not be backed up. Directory/file operations can require reapplying that exclusion. These are platform requirements, not controls exposed by the current JS adapter.

Option A must verify requested exclusion/protection properties before committing a candidate and fail closed if unavailable; it must not silently fall back to cache or backup-eligible Documents. Option B explicitly accepts the listed residual risks. Neither option introduces remote storage, document sharing, base64 metadata, network upload requests, manager handles or authentication.

## 6. Ownership and references

Application records remain metadata-only: ID, category, original display name, MIME, byte count and availability. URIs/bytes/native objects remain outside records and navigation. Each selection gets a new opaque ID and independent native copy, including identical filenames/originals selected for different categories/applications. Remaining room and application IDs are unchanged. Native deletion accepts a validated opaque ID, never a caller-supplied path. Shared JS resource URIs are reference-counted across all registered owners before physical disposal, including failed candidate disposal.

## 7. Transactional replacement

The picker opens through its existing source routes. Metadata is checked before staging; native source/copy validation, signature/readability and session epoch/owner checks precede commitment. An independent SDK volume reading also classifies initial directory-creation failure as insufficient storage when less than the reserve remains; unknown readings are never interpreted as zero. The new registry entry is installed before old references are released. Cancel, denied access, unsupported content, >10 MiB, partial copy, storage failure and native bridge rejection preserve the old attachment and form fields. Candidate prefixes are erased from retained resources. Browser selection still occurs synchronously under user activation and continues to use memory-only Blob resources.

## 8. Available space and bounded copying

The native module checks actual source size (provider descriptor length on Android when known; native attributes on iOS). Android unknown provider lengths reserve the maximum 10 MiB plus 1 MiB; known sizes reserve their byte count plus 1 MiB. Android uses the staging volume’s `usableSpace`; iOS uses filesystem free-size attributes when available. Unknown iOS readings do not mean zero. A bounded 64 KiB copy loop rejects actual streams over 10 MiB even when picker metadata understates them. Known size mismatches, empty/short copies and invalid PDF/JPEG/PNG signatures cannot succeed. Output is synchronized, then moved from an opaque `.partial` file to a collision-free `.local` target. Native copies never overwrite an existing ID.

## 9. Storage and read errors

Free-space preflight is advisory because free bytes can change. Actual ENOSPC (including nested native causes) maps to a concise free-space/retry message. Source-read errors, staging failures and cleanup errors remain distinct safe codes. Native error details, source URIs and file content are not logged or returned in errors. JS verifies successful native results and availability before creating metadata, and cleans candidates even if the bridge rejects after copying. No unrelated file is deleted to make space. Severe OS/storage failure can still make files unavailable; this is not a universal retention guarantee.

## 10. Controlled cleanup

Removal, replacement, draft cancellation, funding cancellation/save, provider unmount and confirmed logout release only unreferenced app-owned copies. Failed physical deletion stays in a retry ledger at the JS/native boundary; new sensitive selections are blocked until cleanup succeeds. Private SDK picker cache copies retain the existing exact-parent cleanup restriction; `content://`, Downloads and original user files are never deleted. A native lock serializes startup, atomic commit and deletion; provider reads run outside it so a slow source cannot block Leave/Log Out. A late picker result is released without staging after logout/draft exit. Copies already in flight are disposed on completion and cannot repopulate application state. Cleanup failure can leave residual bytes until a successful retry/startup; no silent deletion guarantee is made.

## 11. Startup and abrupt termination

Importing the native adapter attempts initialization even when no application screen opens. Native startup sweeps only recognized session folders inside the versioned CampusStay root; unknown entries, symlinks and failed cleanup block new attachments. A native live-session set protects another active module/runtime from sweeping. Startup is idempotent within an active native module; repeated providers do not erase its live files. OnDestroy attempts cleanup, but abrupt termination cannot guarantee it. A new native runtime sweeps recognized stale files before accepting a new attachment. There is no metadata/file recovery or persistent application database. Development hot refresh is not a promise of recovered drafts.

## 12. Application/funding associations

Existing promotion transfers draft entries to the saved local application without recopying. Funding edits use a separate editor owner; Cancel releases its candidate and preserves saved funding. Save validates ownership/availability/revision, transfers the new file and releases only replaced funding. Identity/registration/student-ID files remain attached to their application. Existing NSFAS Pending and Self-funded behavior stays enabled.

## 13. My Documents

The existing screen, cards, per-application grouping, counts and private image preview are preserved. PDF preview remains explicitly unavailable. No upload/verified/delivered status was introduced. A temporary access denial can recover after a subsequent owner/metadata/readability check (relevant to complete iOS file protection); an absent registry entry cannot recover from disk or forged metadata.

## 14. Application Status

Counts include usable owner-scoped attachments only. Missing-file names/history remain readable and progression remains blocked until valid replacements exist. Funding updates do not replace unrelated application details. Manager fixtures never receive native handles or local student application documents.

## 15. Android build and normal-storage verification

ADB state, boot completion and Activity Manager responded; the final pre-install Activity Manager command returned user 0 without a timeout. The existing emulator initially had **400,160 KiB free (390.8 MiB), 94% used**, 1080×2400 at 420 dpi, font scale 1.0. No normal/high-free-space case was available. The native app **built successfully** with 382 tasks (196 executed, 186 up-to-date) in the final 5m29s run. Kotlin compilation of `CampusStayDocumentStorageModule` and native C++ linking passed. Existing dependencies emit upstream deprecation warnings; none was suppressed or upgraded.

The required missing host SDK components were provisioned alongside existing SDK installations: API 36 revision 2, NDK 27.1.12297006, Build Tools 35.0.0 and CMake 3.22.1. Google’s published size/SHA-1 were checked for manually downloaded API/NDK archives. Gradle installed its other required components using already accepted licenses. No emulator reinstall/reset or npm install occurred. An initial optional JVM-argument quoting error in PowerShell was corrected. The first resource-linking attempt exposed the existing color-only splash configuration’s absent `splashscreen_logo`; the installed splash plugin’s supported `android.drawable.icon` option now copies a transparent XML drawable, preserving the existing navy launch background and React branding. That native resource fix passed the final build.

The APK is `android/app/build/outputs/apk/debug/app-debug.apk`, **78,833,619 bytes (75.2 MiB)**, package `com.campusstay.app`, emulator ABI x86_64. It is a debug app requiring Metro, without adding expo-dev-client. The first `adb install -t` failed:

```text
INSTALL_FAILED_INSUFFICIENT_STORAGE: Failed to override installation location
```

A guard confirmed that the native package did not exist before installation; it remained absent afterward. No existing CampusStay/Expo Go package was overwritten. App startup, student tabs, nested navigation, Property, the five-step journey, camera/library/PDF staging, preview, funding, removal, logout and next-start cleanup therefore have **no post-change runtime pass**. A successful build/export is not device execution. Evidence: `.expo/phase-g1/android-build.log`, `android/install.log`, `android/install.err`, `android/am-before-install.txt`, package inventories and settings snapshots. Free enough emulator storage through user-chosen actions, then install this APK and run those journeys; this task does not delete unrelated data to enable installation.

## 16. Android storage-pressure verification

The earlier cache-eviction evidence remains unchanged. This run recorded the same low-free-space environment without changing `sys_storage_threshold_percentage` (still unset), filling the device or deleting caches/data. After Android rejected installation, available space was **401,204 KiB (391.8 MiB), still 94% used**. Original synthetic PDF/PNG/JPEG/replacement PDF SHA-256 hashes are identical before and after. Display size/density, font scale and hardware-keyboard setting remain unchanged. The task-owned Metro process was stopped, and only the newly added ADB 8081 mapping was removed.

**The install failure is not an application staging/ENOSPC test.** Native retention under pressure, actual insufficient-space staging, next-start native sweep and file cleanup remain blocked/unverified. Controlled bridge/session tests cover safe error propagation and state preservation; they do not prove Android filesystem behavior. No threshold override, broad cleanup, source deletion or repeated install attempt was used to force a pass.

## 17. iOS protection and verification limits

The iOS module uses canonical private Application Support paths, excludes root/session/candidate from backup, applies `FileProtectionType.complete`, and verifies requested properties before commitment, including after the final move. Failure returns a staging error, never a downgrade to cache or Documents. This is OS data protection, not application-level encryption. A locked device can deny reads; cleanup may need to retry after unlocking. No macOS/Xcode/iOS runtime is available here: Swift compilation, entitlement/device-backup behavior and lock/unlock remain unverified. Prior user-reported iPhone selection/image preview is retained only as pre-change evidence. Real-iPhone checklist: build module; inspect backup/protection flags; Files PDF, Library image, camera; navigate five steps; preview; cancel/replace/save funding; remove; logout; force termination/relaunch stale cleanup; lock/unlock; insufficient-space handling.

## 18. Automated verification

The investigation baseline was 558 tests. The complete implementation run passed **568/568**, zero failed/skipped/cancelled, plus TypeScript and lint (zero warnings). Ten new meaningful scenario tests cover the storage boundary; existing picker assertions were adapted to the native bridge without removing coverage. Existing form, NSFAS Pending, Self-funded, room/preselection, navigation, source permission/cancellation, provider and manager-isolation coverage remains active. New storage contract tests use controlled native bridge results and the actual adapter/session; they do not claim to execute Kotlin/Swift or exhaust native storage. Final Android/iOS exports passed after rerunning outside the sandbox: the initial Hermes attempt was denied temporary-file write access. Both official autolinking resolutions include the local module/pod. The final Android native app build passed; installation and runtime results are reported separately above. Swift was not compiled on Windows.

## 19. Dependencies, source and Git preservation

Expo 57.0.30, expo-asset 57.0.20 and all installed npm versions are unchanged. `npm ls --depth=0 --json` and SDK dependency compatibility passed; Expo Doctor passed **21/21**. `package.json` and `package-lock.json` are byte-identical to implementation start. `app.json` differs only by the supported Android transparent-splash drawable configuration required to build the existing color-only launch screen. Its package, permissions, palette and other plugin settings are preserved. Prebuild-generated script changes were removed precisely; it performed no npm install. Required native build artifacts/SDK components were downloaded for the approved native build, as detailed above; they do not alter the npm dependency tree. The generated Android/iOS projects and local build output are ignored; native source/manifests are kept in `modules/campusstay-document-storage` with narrow exceptions to the existing JSON ignore rule.

Exact G.1 source changes (18 files, relative to the implementation-start snapshot):

| File | Change |
| --- | --- |
| `.gitignore` | Ignore generated native projects/module build output; keep local module JSON manifests reviewable. |
| `app.json` | Supported Android transparent drawable for the pre-existing color-only splash configuration. |
| `assets/android-splash.xml` | Transparent native drawable; existing navy background/React branding preserved. |
| `src/documentAdapter.ts` | Native staging integration, startup cleanup attempt and explicit missing-module handling; restricted picker-copy release preserved. |
| `src/nativeDocumentStorage.ts` | Typed native boundary, verified success, storage/cleanup errors and retry ledger. |
| `src/attachmentSession.ts` | Transactional commit, shared-URI disposal guard, cleanup retry, late-picker/async logout guards, transient byte cleanup, temporary-read recovery. |
| `src/documents.ts` | Specific storage/staging/cleanup/installed-app messages. |
| `scripts/document-picker.test.cjs` | Preserve source/privacy assertions through new native boundary; late stale picker must not stage. |
| `scripts/document-storage.test.cjs` | Ten behavior scenarios/matrices for storage errors, ownership, cleanup, cancellation, funding and races. |
| `modules/campusstay-document-storage/package.json` | Local module metadata; no npm dependency entry. |
| `modules/campusstay-document-storage/expo-module.config.json` | Android/Apple autolinking declarations. |
| `modules/campusstay-document-storage/android/build.gradle` | Existing Expo native-module build integration. |
| `modules/campusstay-document-storage/android/src/main/AndroidManifest.xml` | Library manifest, no added permissions. |
| `modules/campusstay-document-storage/android/src/main/java/expo/modules/campusstaystorage/CampusStayDocumentStorageModule.kt` | No-backup staging, bounded/verified copies, cleanup and native lifecycle. |
| `modules/campusstay-document-storage/ios/CampusStayDocumentStorage.podspec` | Existing ExpoModulesCore integration, iOS 16.4 minimum. |
| `modules/campusstay-document-storage/ios/CampusStayDocumentStorageModule.swift` | Backup exclusion, complete protection, staging and lifecycle; native validation pending. |
| `modules/campusstay-document-storage/README.md` | Build/storage contracts and explicit limitations. |
| `docs/document-storage-resilience.md` | Investigation, approved decision, implementation, verification and blockers. |

Screen layout, typography, palette and navigation are unchanged. No backend, remote upload, persistent application records, real authentication, payment/booking confirmation or manager document access was added. The full debug APK is a generated, ignored artifact; the focused source patch excludes build outputs.

The original 123-file snapshot and the 124-file implementation-start snapshot remain under `.expo/phase-g1/`. Existing staged `.expo/devices.json` removal remains intact and its physical file is preserved. Final index/hash checks and the task-only patch are retained under `.expo/phase-g1/`; the final preservation record lists all permitted edits and new files. No reset, clean, discard, commit or push is performed.

## 20. Remaining work and risks

The concrete Android blocker is insufficient space to install the successfully built APK on the existing emulator. No Activity Manager timeout or auto-review rejection blocked this run. Finish the listed Android journeys after user-controlled storage recovery; do not reset/reinstall the emulator, delete unrelated data or alter reclamation thresholds. Separate normal-space, low-space retention and genuine staging ENOSPC results are still required. No native runtime guarantee is inferred from the 568 tests, Kotlin compilation or exports.

Obtain macOS/iPhone compilation and runtime verification for backup flags, complete file protection, lock/unlock, all source routes and cleanup. Non-cache bytes can remain after abrupt termination or deletion failure until successful cleanup; unknown/unremovable root contents intentionally block new sensitive attachments. Private/backup-excluded storage is not app-level encryption. Severe OS/storage/provider failures remain possible. Expo Go cannot supply this custom module and explicitly rejects new attachment selection; other student navigation remains authentication-free. The installed native app is required for the approved storage policy.

All independent implementation/automated checks and reviewable documentation are finished. **G.1 runtime sign-off is blocked, not complete.** Stop here; do not begin Phase H.
