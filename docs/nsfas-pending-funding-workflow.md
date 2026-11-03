# NSFAS pending funding and local updates

## Initial audit and scope

The starting working tree contained the completed document-selection and Self-funded work plus earlier edits. A task-start copy and SHA-256 manifest are in `.expo/nsfas-funding/before/` and `before-hashes.json`. The Git index was empty. No applicable AGENTS.md was found in the repository or its ancestors. The initial suite passed 452 tests. Existing five-step validation, real PDF/image selection, provider-owned temporary references, optional funding proof, Status/My Documents, and isolated manager review were present. The source model encoded pending/confirmed NSFAS in source IDs; the Documents UI exposed only Self-funded, and saved applications had no funding-update action.

This task extends those features, using the apple-design skill and existing navy/blue tokens, Outfit/Inter, rounded cards, radio controls, buttons, safe areas and navigation. It adds no dependency, persistence, backend, authentication, payments, remote uploads, NSFAS integration, bookings, or student-to-manager communication. Existing unrelated work is preserved.

## Funding model

- Current sources: `self-funded`, `nsfas`, `parent-guardian`, `sponsor`, or no declaration.
- NSFAS student-declared outcome: `pending`, `confirmed`, `unsuccessful`, separately typed from source. NSFAS selection defaults visibly to pending; the student may change it. Missing/invalid NSFAS outcomes are validated.
- Older `nsfas-pending` and `nsfas-confirmed` sources remain readable. `normalizeFunding` adapts them when editing without mutating the original record. Non-NSFAS sources do not retain an NSFAS outcome.
- Evidence remains the existing `attachments.funding` metadata plus private provider-owned temporary resource. Attaching a file never changes the declared outcome.
- Manager review remains its independent `FundingReviewStatus` and manager-local reducer map: Not reviewed, Needs information, Reviewed locally.
- There is no verified-funding field, verification date or implied residence approval. A future backend must introduce independently authorized verification records; student declarations or file metadata must never serve as verification.

No duplicate application store or declaration history is introduced. The current declaration is the source of truth in this session. A durable, authorized history requires a future storage design.

## Student flow

Documents remains step three of Room / Personal / Documents / Emergency / Review. A shared `FundingFields` component supplies the same source/status controls in Apply and the funding editor. Pending students can continue without a confirmation letter or NSFAS reference number. The explanation permits later updates and states that each residence determines funding requirements. Student ID, registration proof and identity remain required; Proof of Funding stays optional for every funding source.

Confirmed wording is explicitly “Student reports confirmed”, with encouragement to attach optional evidence. Unsuccessful wording is neutral and allows a different source; it cannot reject accommodation. Self-funded retains optional evidence and the independent payment-discussion preference. Parent/guardian and sponsor declarations are available too. The preference records local intent only and sends no request or payment plan.

Final review corrected the shared unsuccessful explanation to “This declaration does not reject your accommodation application.” The same component is used before saving a draft and when updating a saved record; it therefore must not claim an unsaved draft is already saved. The actual form regression exercises this wording before returning to pending.

Review has one Funding information card with source, declared status, optional evidence summary, unverified declaration and preference. Existing Edit returns to Documents without losing any other step. Existing actual-file metadata remains in the Documents summary.

Application Status separates the Saved locally accommodation record from funding source, declared outcome and actual evidence availability. Only a valid session application gets Update Funding Information; illustrative booking records do not. No provider decision or false timeline is generated.

## Updating an existing application

The focused `UpdateFunding` stack route accepts an application ID only, not an array position, property object or new application draft. It preloads that exact record. Missing/expired application routes show a recoverable unavailable state.

The editor changes funding declaration/preference and optional funding evidence only. Save validates the outcome and rechecks the actual funding resource. The provider replaces those fields on the same ID. Property, room, price resolution, personal details, emergency contact, creation time, local status and unrelated documents remain intact. Other applications retain their original objects. Save returns to Status; My Documents reads the updated attachment from the existing provider without a separate document store.

File edits are transactional: a new opaque editor owner stages replacements. The original application-owned file remains readable until Save. Cancel, back or unmount disposes only staged resources. A successful save moves the selected resource to the application, releases the superseded funding copy, and keeps required documents. Removal is applied only on Save. Failed/cancelled selection preserves the previous selection. Unavailable references show Replace/Remove recovery and cannot be falsely saved as attached. A removed legacy funding category flag is cleared so it cannot masquerade as evidence.

The provider rejects unknown applications, forged/borrowed metadata, saved-application IDs used as editing owners, missing outcomes, concurrent stale saves, saves after editor cleanup, and logout during asynchronous validation. A revision counter guards asynchronous work; application data remains solely in the existing reducer. Logout still clears both records and temporary handles. Raw payloads/URIs are not added to application records, manager fixtures or logs. Device originals are never deleted; only app-owned temporary copies are released.

The existing PDF/JPG/JPEG/PNG picker, 10 MiB metadata/content validation, cancellation/failure recovery and local image previews are reused without changing either native or web adapters. The current priority remains mobile; no web dependencies were added.

## Manager-local review

The existing isolated Naledi Mokoena (`ma-2`) fixture now declares NSFAS pending with no evidence attached. It does not represent a received student submission. Its detail shows source, student-declared outcome, unverified declaration, evidence absence and the existing review controls. Internal notes and review choices survive list/detail navigation within the manager session, while accommodation status, portfolio rooms and tenants remain unchanged.

Manager screens import neither ApplicationContext nor AttachmentSession/document adapters. They receive no student metadata, temporary handles, identity documents or actual files. Review cannot send messages, request real documents, reserve rooms, approve funding, reject an accommodation application or notify students. Future conditional arrangements require authenticated role authorization, protected evidence access, residence-specific policies and independently recorded decisions.

## Accessibility and layout

Radio/checkbox semantics announce selected/checked states; selection also has a circle/dot or checkbox, rather than colour alone. Controls have natural multiline labels and at least 48 dp rows. Pending has a text badge. Existing required/optional labels, error alerts, live file feedback, scroll areas, keyboard avoidance and safe-area padding remain. The editor uses the existing ProfileLayout with a bounded content width and scrollable Save/Cancel actions; Apply retains its sticky footer and five-step progress indicator. No new motion is introduced.

TalkBack and VoiceOver spoken output have not been tested. Structural accessibility checks and Android hierarchy/screenshots are not substitutes for assistive-technology testing.

## Verification

The baseline passed 452 tests. The final suite contains 469 meaningful tests (17 new NSFAS tests), covering actual screen callbacks and the real ApplicationProvider with controlled native adapters. New coverage includes the pending five-step journey; declaration labels and legacy compatibility; exact-ID updates; PDF/image selection; preview; replacement/removal; cancellation; failures/oversize/type validation; expired files; multiple-application isolation; metadata forgery; stale concurrent saves; logout/unmount races; manager fixture notes/review; and four structural layout contracts. Existing Self-funded, payment preference, Profile, documents, Bookings, direct Home/guest navigation, manager isolation, Single/Shared preselection and retired Studio regression suites remain enabled.

| Check | Result |
| --- | --- |
| Initial tests | 452 passed |
| Final TypeScript | Passed, strictness unchanged |
| Final ESLint | Passed, zero warnings |
| Final tests | 469 passed, zero failed/skipped |
| Android and iOS Hermes exports | Passed; export is not device execution |
| Expo compatibility | Reports existing patch mismatches: Expo 57.0.28 versus current recommendation ~57.0.30; expo-asset 57.0.19 versus ~57.0.20 |
| Expo Doctor | 19/21; the patch check and existing tracked `.expo/devices.json` setup check fail |

The `.expo/` ignore rule already exists, but the device-history file remains tracked. No Git tracking or dependency versions were changed to conceal these findings. No reinstall was necessary. Logs are under `.expo/nsfas-funding/`: `typecheck.txt`, `lint.txt`, `all-tests.txt`, `dependencies.txt`, `doctor.txt`, `exports.txt`.

## Exact task files

This list is relative to the task-start snapshot, rather than conflating older uncommitted work with this correction. The focused review patch is `.expo/nsfas-funding/task-only.patch`.

| File | Change |
| --- | --- |
| `src/funding.ts` | Separate typed source/outcome, legacy adapter, validation and display labels |
| `src/application.ts` | Validate NSFAS status in the existing Documents step |
| `src/components/FundingFields.tsx` | Shared, accessible source/outcome/preference controls |
| `src/screens/ApplyScreen.tsx` | Reuse controls and extend the existing Review summary |
| `src/screens/UpdateFundingScreen.tsx` | Focused preloaded editor with staged evidence and Save/Cancel |
| `src/state/ApplicationContext.tsx` | Exact-ID funding action, validation, revision guard and existing-store update |
| `src/attachmentSession.ts` | Atomic funding resource ownership swap and closed-owner safeguards |
| `src/screens/AppStatusScreen.tsx` | Source/outcome/evidence distinction and funding-update entry |
| `src/navigation/types.ts` | Typed funding-update route |
| `App.tsx` | Register that stack route; Home startup unchanged |
| `src/manager.ts` | Isolated pending NSFAS fixture |
| `src/screens/ManagerScreen.tsx` | Student-declared outcome in existing review card |
| `scripts/nsfas-funding.test.cjs` | New workflow and isolation regressions |
| `scripts/application-provider-harness.cjs` | Reusable real-provider test harness extracted from existing tests |
| `scripts/funding-workflow.test.cjs` | Reuse provider harness; source-model expectation updated for separated outcomes |
| `scripts/profile-harness.cjs` | Execute shared stateless funding controls and support injecting the real provider |
| `scripts/baseline.test.cjs` | Keep exact route-list assertion including the new route |
| `package.json` | Add `test:nsfas` only; dependencies untouched |
| `.github/workflows/ci.yml` | Run that suite alongside existing checks |
| `docs/nsfas-pending-funding-workflow.md` | This report |

My Documents and the platform picker adapters need no source changes: they already consume the shared record and resource registry. `package-lock.json`, native configuration, design tokens and unrelated files retain their task-start contents.

## Android execution evidence

Actual execution used Expo Go on the existing Android 16/API 36 emulator, not just a Babel transform or export. Only synthetic PDFs and images were selected. Evidence is in `.expo/nsfas-funding/`; each named PNG has a matching native hierarchy XML.

| Journey | Evidence and observed result |
| --- | --- |
| Direct Home, property and Shared preselection | `00-home`, `06-saved-shared`: Campus View, Shared `r2`, R2,200/month |
| Pending with no funding letter | `01-pending-selector` through `07-pending-status`: required PDF/PNG/JPEG documents, five steps, pending Review and Saved locally Status |
| Update pending to student-declared confirmed | `08-confirmed-pdf-editor` through `10-confirmed-status`: application `CS-LOCAL-MV9QFH7A-01` retained its ID, room and price after selecting `qa-replacement.pdf` |
| My Documents | `11-my-documents-confirmation`: actual funding filename and 629-byte PDF on the correct application |
| Unsuccessful and alternative source | `12-unsuccessful-editor` through `14-self-funded-same-application`: same saved application, unsuccessful then Self-funded, payment-discussion preference; no accommodation rejection |
| Real image preview and long filename | `15-long-image-editor`, `16-image-preview`, `21-320dp-200-long-filename-documents`, `22-320dp-200-long-image-preview`: 110-character synthetic PNG name wraps and image previews locally |
| Final-source journey at 320dp/200% | `17-320dp-200-review` through `20b-320dp-200-application-id`: pending save, subsequent confirmed declaration with real PDF, unchanged application ID/Shared room/R2,200 price |
| Isolated manager review at 320dp/200% | `23-320dp-200-manager-pending`, `25-320dp-200-manager-reopened-review`, `26-320dp-200-manager-reopened-note`: Naledi fixture shows pending/no files; Needs information and “Confirmation outstanding” survive list/detail navigation; accommodation stays In review |
| Manager note and software keyboard | `24-320dp-200-manager-note-keyboard`: actual Gboard visible; focused multiline note and Save Review Note remain above the keyboard |
| Single Room and Self-funded regression | `27-single-preselection`, `28-single-self-funded-review`, `29-single-self-funded-saved`: `r1` selected, R3,500/month, three actual required documents, payment preference, no funding proof required; application `CS-LOCAL-MV9ZJQ17-01` saved |
| Same-ID Single funding update | The saved Self-funded Single record accepted a sample funding PDF through Update Funding Information; the native ID check retained `CS-LOCAL-MV9ZJQ17-01` |
| Accurate unsuccessful explanation | `30-unsuccessful-neutral-copy`: the final shared explanation makes no claim that a draft has already been saved and does not reject accommodation |
| Cancel preserves original evidence | `31-cancel-preserves-original-funding-file`: changing to unsuccessful and removing proof without saving, then Cancel/reopen, retains Self-funded, payment preference and the original readable `qa-replacement.pdf` |
| Correct Single application documents | `32-single-funding-in-my-documents`: `CS-LOCAL-MV9ZJQ17-01`, all three required files and the 629-byte funding PDF remain Attached locally |
| Logout and guest navigation | `33-logout-empty-documents`: after logout and Continue without signing in, My Documents shows No application documents; `34-final-home-restored-settings` shows student Home |

The normal-width student journey ran at approximately 411dp and 100% text. The narrow-screen journey also ran at 320dp/200%. This is not evidence that every screen and every interaction was exercised at every display configuration.

The Documents funding-control matrix completed all 12 requested width/text-scale combinations. At each configuration, native scrolling reached the selected NSFAS source, unsuccessful outcome option, pending badge/explanation, and optional Proof of Funding Choose file control with the sticky Continue button accessible. Source selection was checked through the native hierarchy. There are 48 screenshot/XML pairs named `documents-{width}dp-{scale}-{source|statuses|pending|optional-proof}`; `layout-evidence.json` and `check-evidence.py` cross-check target/footer bounds against the saved evidence.

| Width | 100% | 130% | 200% |
| --- | --- | --- | --- |
| 320dp | Passed | Passed | Passed |
| 411dp | Passed | Passed | Passed |
| 480dp | Passed | Passed | Passed |
| 800dp | Passed | Passed | Passed |

These cases use 900dp viewport height (1100dp at 800dp width). Full Review, Status, exact-ID update, long-file preview and manager-keyboard journeys have the specific coverage listed above; they were not each repeated across the full 12-case matrix.

The final emulator readback is physical 1080×2400, density 420, font scale 1.0, and `show_ime_with_hard_keyboard=0`, matching its original settings. The five synthetic originals remain in Downloads at their original sizes: the two PDFs 629 bytes each, registration PNG and long-name PNG 6,502 bytes each, and identity JPEG 21,020 bytes. App-owned resource disposal is also covered by the provider/session automated tests; this is not a claim of a separate forensic audit of Expo Go's private cache.

Room fixtures were not edited. Existing room regressions remain passing, with native preselection/save evidence for both current IDs:

| Offering | Stable ID | Capacity | Monthly price | Rooms listed |
| --- | --- | --- | --- | --- |
| Single Room | `r1` | 1 | R3,500 | 4 |
| Shared Room | `r2` | 2 | R2,200 | 6 |

Campus View remains at 10 listed rooms, starting at R2,200/month. Retired Studio `r3` remains unavailable for new applications; historical room handling is unchanged.

On resuming after the credit interruption, the previous emulator/Metro processes had closed. The existing emulator was restarted without clearing its data. A localhost-only Metro server and ADB reverse forwarding restored the development connection. Automatic approval review rejected a proposed LAN binding due to source/debugger network exposure; no LAN server was started. IPv4 localhost succeeded without broader network access. The restored VM's stale project state briefly showed Expo Go's remote-update download error before forwarding and the localhost listener were restored; this was not an application funding error.

## Limitations and future integration

- iOS runtime is unverified: this Windows environment has no iOS simulator/device tooling. The successful iOS Hermes export is a separate build check.
- Android testing uses Expo Go on one emulator. No physical-device, standalone release APK/IPA, or spoken TalkBack/VoiceOver test was performed.
- The existing native adapter supports image previews, PDF selection and PDF metadata, but does not supply an in-app PDF viewer. A native PDF Preview action is therefore not advertised where unavailable.
- Applications, funding updates, manager notes and temporary file ownership are session-only. Restart, logout, cache cleanup or some emulator configuration changes can end the session. There is no cross-device or durable history.
- Source/outcome declarations and actual local attachments remain unverified. Manager examples are isolated fixtures, not student submissions. No notification, message, approval, reservation, conditional offer, payment plan or booking is generated by funding edits.
- Real integration still requires authenticated roles, residence-specific requirements, protected uploads, authorized evidence access and independent verification. Those are deliberately outside this task.

## Preservation and review

The task-start manifest covers 102 files. The focused diff contains 20 task files, including this report. No starting file is missing; the Git index is byte-for-byte unchanged. The dependency lockfile, app configuration, TypeScript configuration, design tokens, data/room offerings and platform document adapters retain their task-start contents. Existing staged, unstaged and untracked work was not reset, cleaned, committed, pushed or discarded.

`git diff --check` passes; Git reports its existing LF/CRLF conversion notices. A separate scan of all 20 task files, including untracked additions, found no trailing whitespace. The task-start snapshots, final focused patch, exact file list and preservation checks are `.expo/nsfas-funding/before/`, `task-only.patch`, `task-files.json` and `preservation.json`. Evidence/helper files remain in the already ignored `.expo/` folder. This work stops at the frontend funding workflow.
