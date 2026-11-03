# CampusStay Phase G — technical maintenance

Status: scoped Phase G implementation and the requested **post-update Android smoke test are complete**, with a documented low-storage test condition. Expo 57.0.30 / expo-asset 57.0.20 ran on the existing emulator after the user's emulator restart. Activity Manager, fresh Home startup, all student tabs, nested Property/Apply navigation and manager navigation passed. The complete session-only application save passed after reattaching evicted files with a temporary storage-cleanup threshold override; reliable attachment retention at the original low-storage condition is not established. Earlier blocked attempts are retained below as historical evidence. Final automated checks remain passed, including Expo Doctor 21/21. iOS runtime remains unverified. Evidence is local and ignored under `.expo/phase-g/`.

## 1. Initial repository status

Inspection on 17 October 2026 found 122 tracked/nonignored untracked files, extensive earlier uncommitted work, and no staged patch. All were snapshotted before edits, together with status/index and SHA-256 hashes. No applicable AGENTS.md was found in the repository or ancestors. Apple Design guidance was read; existing colours, Outfit/Inter, icons, navigation architecture and previous audit fixes remain the baseline. No reset, clean, discard, commit or push.

## 2. Expo investigation

Initially, manifest `~57.0.28`, lock and installed Expo all resolved to 57.0.28. The initial `expo install --check` recommended `~57.0.30`. Registry metadata confirms 57.0.30 exists. The official package archive's SHA-512 integrity was checked before reading its bundledNativeModules.json, without installing it. This remains SDK 57; React 19.2.3 and React Native 0.86.3 are unchanged.

The installed native map predates the patch guidance: it lists asset ~57.0.19, while the candidate SDK map lists ~57.0.20. Thus local-map inspection alone would miss the current patch recommendation. Initial CLI output and the candidate package metadata agreed. Compatibility checks should be rerun after an approved change, rather than assuming the score improves.

## 3. expo-asset investigation

Initially, manifest `~57.0.19`, lock and installed module resolved to 57.0.19. The candidate Expo package requires asset ~57.0.20; the candidate asset package requires constants ~57.0.22. Those dependency relationships justify the asset/constants updates rather than a blanket latest-version upgrade. Existing font, image, picker, filesystem, Screens, Reanimated and Worklets direct versions remain untouched.

## 4. Compatibility findings

`npm ls --depth=0 --json` succeeds. The initial tree was internally resolvable, but Expo's SDK patch recommendations failed check:dependencies. Initial Doctor reported 19/21: patch mismatches plus tracked generated state. Core baseline: Expo 57.0.28, asset 57.0.19, React 19.2.3, RN 0.86.3, TypeScript 6.0.3, navigation native 7.5.0/tabs+stack7.20.0, Screens 4.26.2, Reanimated 4.5.1/Worklets 0.10.1.

Basis: current project tooling, installed/locked package metadata, integrity-verified candidate SDK map and registry metadata. [Expo CLI guidance](https://docs.expo.dev/more/expo-cli/) describes SDK-aware installation/checking; [Expo upgrade guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) describes aligning dependencies and checking Doctor. No major SDK upgrade is proposed.

## 5. Proposed versus approved modifications

**Explicitly approved and applied:** the user selected “Approve both dependency and tracking changes” after reviewing the checkpoint. Changed only package.json dependencies.expo `~57.0.28`→`~57.0.30` and dependencies.expo-asset `~57.0.19`→`~57.0.20`; synchronized package-lock.json and the installed tree using exact 57.0.30/57.0.20 package arguments with tilde save prefix. No other direct manifest entry changes.

A targeted npm dry run (scripts/audits disabled) reports 12 changed installed package nodes and 2 new nested nodes, no removals. The root lock packages[""] ranges would change, plus the following projected node entries (including their version/resolved/integrity/dependency metadata):

| Lock package path | Before | Final |
| --- | --- | --- |
| `node_modules/postcss` | 8.5.29 | 8.5.30 |
| `node_modules/expo-modules-core` | 57.0.22 | 57.0.23 |
| `node_modules/expo-modules-autolinking` | 57.0.15 | 57.0.16 |
| `node_modules/expo-constants` | 57.0.21 | 57.0.22 |
| `node_modules/expo-asset` | 57.0.19 | 57.0.20 |
| `node_modules/expo` | 57.0.28 | 57.0.30 |
| `node_modules/expo/node_modules/@expo/cli` | 57.0.29 | 57.0.31 |
| `node_modules/expo/node_modules/@expo/cli/node_modules/@expo/router-server` | 57.0.12 | 57.0.13 |
| `node_modules/@expo/xcpretty` | 4.4.6 | 4.4.7 |
| `node_modules/@expo/prebuild-config` | 57.0.18 | 57.0.19 |
| `node_modules/@expo/package-manager` | 1.13.1 | 1.14.2 |
| `node_modules/@expo/osascript` | 2.7.1 | 2.8.1 |
| `node_modules/expo/node_modules/babel-preset-expo` | not present | 57.0.16 |
| `node_modules/@expo/package-manager/node_modules/@expo/json-file` | not present | 11.2.1 |

The new nested Babel preset is required by Expo 57.0.30; the existing direct Babel preset remains 57.0.15. Both are SDK 57 packages; final TypeScript, lint, all tests, exports, dependency validation and Doctor passed after installation. CLI/prebuild/package-manager/osascript/xcpretty/postcss changes are in the affected Expo toolchain branch, not independently requested app upgrades. The package-manager and osascript changes are transitive minor updates; do not describe the entire resolution as patch-only.

A separate prefer-dedupe dry run proposed broad Metro removals/downgrades and is **rejected as a plan**. Nothing from that preview was installed. The normal targeted preview is the proposal. Its exact node list is recorded in proposed-lock-nodes.json, and proposed-manifest.patch contains the two reviewable manifest edits. The actual approved installation was compared against this list: all 12 version changes and both additions match, with zero removed nodes and no other direct manifest changes. npm additionally normalized `dev: true` on the unchanged root `babel-preset-expo` 57.0.15 and `react-refresh` 0.19.0 records: the former is now exclusively the direct development preset, with Expo using its new nested preset. These are classification-only changes; their versions, integrity, resolved URLs and dependency metadata are unchanged. `approved-resolution.json` records the strict comparison. No material extra package update was accepted.

Actual effect: the final SDK compatibility command reports “Dependencies are up to date” and Doctor passes 21/21. These results establish the tooling checks, not standalone native execution. Risks include toolchain changes, temporary nested preset duplication and asset/native patch behavior. Preserve the phase-start manifest/lock snapshot; rollback would reverse only approved hunks after checking intervening edits, never reset unrelated work or the whole index. Reinstallation against the saved lock is a separate justified recovery step if needed, not an automatic action.

## 6. Tracked Expo state

.expo/ is already ignored. `git ls-files --stage -- .expo` finds exactly `.expo/devices.json`. Its current content is {"devices":[]}; empty today, it is generated machine-specific history rather than an app input. No application, test script or CI dependency on this file was found. Adding another ignore line would not untrack it. Existing broad/duplicate ignore patterns are unrelated and preserved.

**Explicitly approved and applied:** `git rm --cached -- .expo/devices.json` succeeded. The only staged change is deletion of that index entry; the physical file and local history remain byte-identical to the original SHA-256 `bf26ff34a2c5780a4d64769a297a4a82915df9b8f7b1096173f0fbcc20550e6e`. No README or other .expo path was changed. Existing ignore rules remain unchanged. No commit was made.

## 7. Git index protection

The initial index patch was empty and was rechecked immediately before the approved operations. At the UI checkpoint, package.json, package-lock.json and the local device-history file were byte-identical to the phase-start snapshot; dry runs had installed nothing. After explicit approval, the first targeted install updated the manifest/tree but failed saving package-lock.json with Windows `UNKNOWN`, errno -4094. Read-only inspection confirmed the old lock remained intact and a write-capable Node open then succeeded. One retry of the same targeted command completed successfully; no full reinstall or permission change was used. The final manifest, lock and installed tree were strictly compared with the approved plan.

Final preservation evidence confirms all 122 starting files remain present. Seven working files differ from the phase-start snapshot, plus the one approved index-only removal. All other starting file hashes are unchanged. Only `.expo/devices.json` is staged; package/source/test changes remain unstaged and prior untracked work remains present. The physical device-history file is unchanged. The previous audit report is not rewritten. No reset, restore, clean, discard, commit, push or whole-index operation was used.

## 8. Bottom-navigation root cause

The custom label bypassed the navigator's default Label layout, used 9pt text capped at 1.2, and let a narrow container wrap nearly complete words onto orphan letters. BottomTabItem adds 5dp horizontal padding per side, reducing a 320dp/six-tab label area to about 43dp. Increasing bar height alone did not restore horizontal label room or label size.

## 9. Accessibility implementation

Only the existing MainTabs presentation changes: 12pt Inter labels, 15pt line height, two balanced lines, reclaimed native item padding within each tab's own bounds, and a height budget for the 28dp native icon slot, two scaled lines, internal spacing and bottom inset. Native beside-icon positioning is retained; its icon/gap space is reserved separately. Width calculation matches the navigator’s symmetric maximum side inset, including asymmetric cutouts. No custom tab bar, route replacement, new dependency, palette or icon change.

Label scaling remains enabled and increases to a deliberate 1.5 cap for this dense six-item navigation surface. At 200% system text, labels render up to 18pt rather than the old 10.8pt; content screens still follow their existing scaling behavior. This is a bounded visual compromise, not unrestricted Dynamic Type or accessibility certification. Names remain complete; no abbreviation or renamed route.

All six pressables have explicit full accessible names, with current unread count in Messages. Decorative SVG wrappers are excluded from accessibility traversal; selected state remains the navigator's native state. Underline and semibold distinguish the active label in addition to blue. Existing blue/slate600 tokens retain contrast. TalkBack/VoiceOver speech has not been tested.

## 10. Responsive testing

Automated rendered-configuration tests cover 320/411/480/800dp × 100/130/200%, selected/inactive typography, full names/icon order, safe-area budgeting, minimum 44dp target width, beside-icon label room and nonabsolute layout. Real TabRouter repeated jumps preserve route keys. Existing Bookings category-scroll behavior remains under its original regression suites.

Native matrix: **24/24 cases passed**, comprising 320/411/480/800dp at 100/130/200% text under both gesture and three-button navigation. The 320dp case uses a short 568dp-class viewport. All six tabs opened their matching screen; repeated Explore presses preserved selection. All targets measured at least 44dp, with full accessible names, correct order and exactly one selection. Every captured label remained inside its own target; Cancelled was horizontally reachable in every case. The automated XML/PNG cross-check passed for **144 paired captures** (`matrix-evidence.json`). Landscape is not enabled by app.json (portrait); do not override the product's orientation configuration merely to claim landscape coverage.

## 11. Android runtime evidence

Existing emulator-5554 and loopback Metro PID 17604/port 8081 were inspected; no competing server was started. Capture pairs are isolated in this phase's directory; previous audit screenshots/XML were preserved. A reused restoration helper initially refreshed the prior audit's ignored `restoration.txt` summary with current restored settings; its output path was corrected to `.expo/phase-g/restoration.txt` before the subsequent smoke run. No application or earlier report file was changed by that helper. Synthetic/local sessions only. Initial 320dp/200% captures guided label padding refinement before the final matrix.

The targeted native smoke script completed with exit 0 and 14 additional screenshot/XML pairs:

- Direct cold launch into Home and all six student tabs, without credentials.
- Explore keyboard typing, Favorites roundtrip and retained search; Property Details → Rooms → exact Single Room `r1` preselection → Personal form, keyboard-visible input and Back/leave recovery to the retained Explore query. Retired Campus View Studio remained absent. No application was submitted in this smoke run.
- Messages → Thabo chat, keyboard-visible composer and a synthetic local message; the UI explicitly stated “Saved here for this session. Not delivered externally.” The unread badge cleared after opening that conversation.
- Profile edit reflected in Home; cancelled logout retained the profile name; confirmed logout opened Login; Continue without signing in returned to guest Home.
- Explicit manager workspace entry, Dashboard → Properties → Applications → return to student Home. Historical unavailable room labels remained readable without becoming selectable offerings. No manager data was edited.

Evidence prefixes: `smoke-explore-*`, `smoke-property`, `smoke-rooms`, `smoke-exact-single`, `smoke-application-keyboard`, `smoke-chat-keyboard`, `smoke-profile-name-home`, `smoke-login`, `smoke-guest-home` and `smoke-manager-*`; assertions are in `journeys.log`. `final-restored-home` and `restoration.txt` confirm original 1080×2400 size, density 420, font scale 1.0, gesture navigation, hardware-keyboard IME override 0 and removal of the temporary low-storage threshold override. Camera permission remained denied and the five existing QA Downloads retained their expected byte sizes. A fresh guest Home was left open. Expo Go's floating developer control in captures is host chrome, not a CampusStay control.

Existing full-audit file-selection/funding/manager CRUD evidence remains prior evidence, not a claimed fresh Phase G run. Spoken accessibility and physical Android performance were not tested.

**Earlier blocked post-update attempt (superseded by the successful post-restart run below):** the 24-case matrix and 14-pair journey smoke above ran on the pre-update Expo 57.0.28 / asset 57.0.19 tree. Following approval, the former Metro process was no longer running. A fresh Expo 57.0.30 CLI server started successfully on the unused port 8081, but the existing emulator's `adb shell wm density` query hung; device listing and `wm size` had returned. Only that inspection process and its identified child were cancelled. One bounded read-only `adb shell echo phase-g-ready` probe then timed out after 15 seconds. No fresh app launch/tab/property execution could be established on the final dependencies. This check is **blocked**, not passed. No ADB server/emulator reset or destructive recovery was attempted. The temporary Metro server was stopped, restoring the prior no-server state. Emulator settings were not changed during this blocked attempt; the preceding restored-state evidence is retained. Exact failure: `.expo/phase-g/post-update-native-blocker.txt`.

### Earlier follow-up after reported ADB recovery — 17 October 2026 (before restart)

Installed and locked versions were rechecked as Expo **57.0.30** and expo-asset **57.0.20**. `adb devices -l` reported `emulator-5554 device`; `adb shell echo phase-g-ready`, size/density queries, font scale, settings reads, overlay listing and synthetic-file size checks initially succeeded. The earlier basic transport failure was resolved. Follow-up evidence is isolated in `.expo/phase-g/post-update-smoke/`; prior screenshots/XML remain untouched.

The initial test Metro server bound only to IPv6 `[::1]:8081`. Its IPv6 health endpoint returned HTTP 200 while IPv4 `127.0.0.1:8081` refused connections, making it unsuitable for the existing IPv4 ADB reverse tunnel. Only that temporary process was restarted with the process-only command `node --dns-result-order=ipv4first node_modules/expo/bin/cli start --localhost --port 8081`. IPv4 listening and HTTP 200 `packager-status:running` were then verified. No source, dependency or persistent configuration change was required.

Android operations nevertheless remained unreliable: an initial hierarchy dump, an activity launch wait and a later screenshot operation timed out. Logcat showed ActivityManager/Binder calls exceeding 26 seconds, so the final attempt used a bounded 45-second timeout instead of treating the initial 15-second threshold as conclusive. That attempt still failed on **`adb shell am force-stop host.exp.exponent` after 45 seconds**, before a fresh CampusStay launch could be verified. Startup, all six tabs, nested Property/Apply navigation, the planned five-step local application save and manager navigation remain **blocked/unverified on the final dependencies**. No new journey pass is inferred from the cached Home screenshot or Metro health response. These diagnostics do not establish a CampusStay code regression or the exact Android service root cause.

The two temporary settings were restored and read back: `show_ime_with_hard_keyboard=0`, `sys_storage_threshold_percentage=null`. Size 1080×2400, density 420, font scale 1.0 and gesture navigation were not changed. Only the temporary test Metro processes were stopped, restoring the prior no-server state. No emulator/ADB reset, reinstall, dependency upgrade, commit or push occurred. Evidence includes `initial-settings.txt`, `restored-settings.txt`, `launch-logcat.txt`, `final-interruption.txt`, Metro logs and the ADB action log in the follow-up directory. The only nonignored follow-up edit is this report; the staged patch and every other starting file hash were preserved. No automated suite was rerun for this documentation-only follow-up; the post-install results below remain the latest automated results.

### Successful post-restart smoke — 17 October 2026

The user restarted the emulator outside this task and requested one new bounded attempt, with an immediate stop if Activity Manager hung. This attempt passed. No activity-management timeout occurred. `emulator-5554` was online, `sys.boot_completed=1`, the shell echo succeeded, and **`am get-current-user` returned user 0 in 96ms** before app launch. Cold Expo Go force-stop completed in **113ms** and `am start -W` completed in **2223ms**. Installed and locked Expo **57.0.30** and expo-asset **57.0.20** were confirmed before execution and were not changed.

One fresh Metro server used the previously diagnosed process-only IPv4-first command. Its IPv4 health endpoint passed. The emulator restart had removed the prior reverse mapping, so a temporary `tcp:8081` ADB reverse was added for this run and removed afterwards. Metro logged a fresh Android bundle of 1594 modules. The following results are actual Expo Go runtime results, not inferences from bundling:

- **Startup:** cold launch opened directly into student Home, without credentials.
- **Student navigation:** Home, Explore, Favorites, Bookings, Messages and Profile all opened their matching screen. Native XML confirmed the full tab-name order, exactly one selected tab, label containment and at least 44dp targets at density 420. Bookings' horizontal Cancelled category was reachable. The earlier 24-case responsive matrix was not rerun in this focused smoke.
- **Nested navigation and Property:** Explore search survived tab changes and Property → Single Room form → Back/leave → Explore. Campus View's retired Studio offering remained absent. Stable Single Room `r1` was selected when opening Apply from its room card.
- **Complete local application:** Room → Personal → Documents → Emergency → Review → Save completed with synthetic details, a self-funded declaration and three existing synthetic files selected through Android Files (Student ID PDF, registration PNG and identity JPG). Application Status displayed a `CS-LOCAL-` reference and the truthful message “Saved in this session. No accommodation provider received it.” My Applications returned to Bookings. No provider submission, remote upload or room confirmation occurred. This pass required the explicitly documented low-storage test accommodation below.
- **Related local flows:** synthetic chat save retained its local-only delivery wording; profile editing updated Home; cancelled logout preserved the profile; confirmed logout and Continue without signing in returned to guest Home.
- **Manager:** explicit local workspace entry → Dashboard → Properties → Applications → return to student Home passed. No manager record was edited, and no student document access was introduced.

**Observed storage constraint:** `/data` had about 392MB free (94% used). On the first application attempt, Android removed two temporary attachment copies; the form correctly blocked progress and showed “File unavailable · Replace or remove.” The automation's subsequent field-reach error resulted from remaining on Documents, not an Activity Manager failure. `application-interruption` captures that state. No source change bypassed validation. The test resumed from Documents after temporarily setting `sys_storage_threshold_percentage=1` and reattaching the same original synthetic files. The full save then passed. This verifies the journey under that stated test condition; it does not establish reliable attachment retention under the original low-storage condition. Temporary local files can still become unavailable under OS storage pressure, and the observed safe recovery requires reattachment.

Evidence directory: `.expo/phase-g/post-restart-smoke/`. It contains **29 paired PNG/XML captures**, `journeys.log`, timed `adb-actions.log`, `completed.txt`, `application-reference.txt`, Metro output and `evidence-summary.json`. Native capture cross-checks passed. The temporary keyboard override and storage cleanup threshold were restored and read back as **0** and **null** respectively. Display size 1080×2400, density 420, font scale 1.0 and gesture navigation were not modified. The temporary Metro server was stopped and the initially absent reverse mapping was removed; the emulator was left running on student Home. No reset, reinstall, dependency upgrade, commit or push occurred.

Only this report changed among nonignored repository files during this follow-up. Every other starting file hash and the staged patch were preserved. Existing post-install typecheck/lint/558-test/Doctor/export results remain the latest automated results; they were not unnecessarily rerun for documentation-only work. Remaining native verification limitations are iOS, spoken accessibility, standalone builds and physical-device performance.

## 12. iOS verification limitations

No iOS runtime exists on this Windows host. Code preserves native navigation, safe-area insets, custom Inter typography, full large-content titles and iOS standard line breaking. Export is compilation evidence only. Real-iPhone checklist: all six names/selection at default/larger text; notch/home-indicator clearance; repeated tab changes; nested Details/Apply and Back; Home search keyboard dismissal; guest/logout and manager return. Prior reported iPhone keyboard/selectors/picker fixes are preserved, not independently rerun here.

## 13. Automated regression results

Commands inspected before execution. Final results after the approved installation and tracking correction:

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, exit 0 |
| `npm run lint` | Passed, zero warnings, exit 0 |
| `node --test --test-reporter=tap scripts/*.test.cjs` | **558 passed**, zero failed/skipped/cancelled, exit 0 |
| `npm ls --depth=0 --json` | Passed, exit 0 |
| `npm run check:dependencies` | Passed, “Dependencies are up to date”, exit 0 |
| `npm run doctor` | **21/21**, no issues detected, exit 0 |
| `npm run export:check` | Android and iOS passed, exit 0 |
| `git diff --check` | Passed, exit 0; existing LF/CRLF notices are not whitespace errors |

Latest Hermes bundles: Android `AppEntry-ca65e85620af3e14fadf5bdb37d0327a.hbc`; iOS `AppEntry-030baaed8c63c3d8cfd20f25d70b8ac0.hbc`, approximately 5.4MB each. Exports do not establish native execution. Final command logs use `*-after.log` under `.expo/phase-g/`; `installed-after.json` records the final direct tree. The complete test suite was rerun after the package changes. Existing CI already uses npm ci and the relevant checks; no CI edit or redundant full reinstall was needed. A fresh npm ci was not performed in Phase G.

An initial full test run exposed two obsolete source-contract assertions for the previous label variable/cap. Those assertions were updated to verify the intended larger-label policy while retaining their other checks; the full final run passed all 558. Fifteen focused tests extend the existing baseline suite. Startup, theme, route order, actual nested Status callbacks, manager navigation sizing and all prior suites remain asserted. No tests disabled, strictness suppressed or framework added.

## 14. Expo Doctor results

Initial: 19/21, exit 1, due to SDK patch mismatches and tracked generated Expo state. Final post-approval command: **21/21**, exit 0, “No issues detected!” Neither check was disabled or excluded to improve the score.

## 15. Dependency check results

Initial: exit 1; Expo 57.0.28 expected ~57.0.30 and asset 57.0.19 expected ~57.0.20. Final: **exit 0**, dependencies up to date. Manifest/lock/installed Expo are 57.0.30 and expo-asset 57.0.20. React 19.2.3, React Native 0.86.3, TypeScript 6.0.3, Screens 4.26.2, Reanimated 4.5.1 and Worklets 0.10.1 remain unchanged. The approved targeted install used `--save-prefix=~ --ignore-scripts --no-audit --no-fund`. Normal and prefer-dedupe previews were dry runs only; only the normal targeted plan was applied. No force, legacy-peer-deps, audit fix, npm update, broad upgrade or full reinstall.

## 16. Files changed

Final Phase G changes:

| File | Phase G change |
| --- | --- |
| `App.tsx` | Existing MainTabs label sizing/wrapping, safe-area height/width, accessibility names and selected cue only |
| `scripts/baseline.test.cjs` | Rendered tab configuration, accessibility, responsive geometry and repeated real-router coverage |
| `scripts/home.test.cjs` | Update only the obsolete tab wrapping contract; retain Home layout/order assertions |
| `scripts/phase-f.test.cjs` | Update student label scaling policy; retain manager tab sizing assertions |
| `docs/phase-g-technical-maintenance.md` | Diagnosis, recorded approval, final checks and limitations |
| `package.json` | Only the two approved Expo/asset dependency ranges |
| `package-lock.json` | Matching approved version graph plus the two disclosed dev-flag normalizations |
| `.expo/devices.json` | Approved index-only removal; ignored physical file retained |

`.expo/phase-g/phase-only.patch` is the focused final diff against the phase-start snapshot, including the sole index-only deletion. `proposed-manifest.patch` and `proposed-lock-nodes.json` retain the approved proposal; `approved-resolution.json` and `preservation.json` verify the actual result. Evidence/snapshots are ignored local artifacts.

## 17. Remaining release-readiness issues

No dependency, tracking or activity-management blocker remains. The fresh Android smoke passed after the user's emulator restart, with the IPv4 test-server setup and documented low-storage accommodation above. Reliable attachment retention at the emulator's original low-storage condition is not established: cache eviction was observed and correctly blocked the form. iOS runtime, spoken accessibility, standalone native builds and physical-device performance remain unverified. The prior 24-case responsive matrix remains earlier evidence rather than a newly repeated post-update matrix. Local session state, native PDF preview limitations, real auth/ownership, live inventory, external submissions, private remote storage, delivery and payments remain outside this maintenance phase. No backend work has begun.

## 18. Recommended next steps

Phase G implementation, final automated checks and the requested fresh Android smoke are complete; stop after this maintenance phase. Complete the real-iPhone checklist, spoken accessibility, standalone-build and physical-device checks before claiming native release readiness. On this host, verify Metro's IPv4 health endpoint before using an IPv4 ADB reverse tunnel; the process-only IPv4-first command worked without repository changes. The six-tab labels intentionally cap at 150% while content screens retain their existing scaling policy.

The approved technical gate is clear for backend contract planning; native release verification remains outstanding. Agree stable ID-based routes, immutable application/rent snapshots, authenticated ownership, private-file access and idempotent service contracts before any backend implementation. No backend implementation, account integration, remote upload/storage, messaging delivery, payment, booking confirmation or website work was introduced. The explicit approval checkpoint was observed before package/lock/index changes; no further phase was started.
