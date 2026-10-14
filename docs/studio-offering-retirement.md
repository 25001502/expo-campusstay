# Campus View Residence: Studio offering retirement

This targeted correction supersedes the p1/r3 current-listing behavior in `property-details-refinement.md`. The prior report/evidence is retained as historical documentation.

## Decision and exact change

Inspected the dirty tree, applicable instruction paths (no AGENTS.md found), apple-design skill, fixtures, current/historical application resolution, listing consumers and manager editing before editing. The initial 409 tests passed. Existing file copies/hashes and the Git index were recorded under `.expo/studio-retirement/`.

Campus View Residence (`p1`) now has exactly two current room records:

| Room ID | Offering | Capacity | Monthly price | Rooms listed |
| --- | --- | ---: | ---: | ---: |
| r1 | Single Room / Single occupancy | 1 | R3,500 | 4 |
| r2 | Shared Room / Shared occupancy | 2 | R2,200 | 6 |

The former Studio offering `p1/r3` was moved intact into `retiredRoomOfferings`, outside current `Property.rooms`. Its original Studio variant, R4,800 price, capacity 1, count 2, En-suite and furnished fields are retained solely for historical references. It is not renamed, merged, or rendered in current Rooms/Apply. No historical application, booking, manager application or tenant record is deleted or rewritten. Unrelated room data, including p5's separate Studio variant, remains unchanged. Retirement is keyed by property ID plus room ID so other properties' IDs are unaffected.

Current p1 metadata is now `available: 10` and `price: 2200`, matching the 4+6 eligible rooms and minimum room rent. Home, Explore, Favorites, Compare and the manager portfolio consume those consistent fixture values. Property Details independently sums current rooms and derives the minimum eligible listed rent. The Single card contains one offering and four listed rooms; Shared contains one offering and six. Existing room-card design, selection controls, buttons, spacing, navy/blue tokens, Outfit/Inter, gallery, tabs and navigation are preserved. No styles or dependency versions changed.

## Selection and history boundaries

`getCurrentRooms` excludes archived IDs even when a stale navigation snapshot still contains the former Studio record. Property cards' room groups, Property selection/Apply actions, Apply radio options, discovery room resolution/filtering, Compare's application decision and manager inventory/editing use current inventory. Draft preselection, room validation and application review reject r3 without substituting another room. The local application factory also rejects a forged/stale new submission referencing the retired ID.

Historical summary resolution explicitly looks up the archive. An existing r3 application remains readable at its original price and says `Single Room · Studio layout · No longer listed`. Application Status renders that historical summary rather than losing the room because it is no longer current. This historical label is not a current selectable offering or booking confirmation. Unknown historical IDs retain the existing unavailable fallback. Valid r1 and r2 drafts, review/status data and preselection remain unchanged.

Manager portfolio cloning excludes retired IDs and recomputes count/minimum rent. Metrics use current offerings; p1 has 10 listed rooms and the p1+p2 portfolio has 18. Room-edit actions cannot reintroduce or modify the archived record. No manager controls were added to student navigation.

## Files changed

- `src/data.ts`: separate historical archive; remove r3 from current p1 rooms; set p1 count 10 and starting price 2200.
- `src/rooms.ts`: scoped retirement predicate, current inventory selection and historical lookup.
- `src/application.ts`: reject retired drafts/reviews/submissions; resolve historical archived summaries with an explicit no-longer-listed label.
- `src/propertyDetails.ts`, `src/discovery.ts`: use eligible current offerings for price and room selection/filtering.
- `src/manager.ts`: current inventory cloning, counts and edits.
- `src/screens/PropertyScreen.tsx`, `ApplyScreen.tsx`, `AppStatusScreen.tsx`, `CompareScreen.tsx`: use current inventory or explicit historical summaries as appropriate; retain existing designs.
- `scripts/property-details.test.cjs`: retirement, stale snapshot, history, counts/prices, manager and cross-screen regression cases; retain the original eleven-record preservation matrix across current + archived inventory. Existing variant/edit coverage now exercises the unrelated Apartment offering instead of editing a retired record.
- `scripts/application.test.cjs`, `scripts/favorites-profile.test.cjs`: update now-obsolete Studio selection/12-room expectations to the requested valid current behavior.
- `scripts/discovery.test.cjs`: VM loader resolves the shared local TypeScript helper, using the established loader convention.
- This report. No package, lockfile, theme, provider, backend or authentication changes.

## Verification

- Initial baseline: 409/409 tests passed before editing.
- Final: 415/415 tests pass (all existing suites and new regression cases); zero failures/skips. The Property Details suite contains 44 tests, including the existing 12 width/text layout contracts. Seven retirement regression cases replace one obsolete Studio-current-preselection case, so the total rises by six.
- TypeScript: pass. ESLint: pass, zero warnings.
- Android and iOS Hermes exports: pass via the existing `npm run export:check`. Export success is not device execution.
- Expo Doctor: 20/21, exit 1. Existing patch-version warning only: Expo installed 57.0.28 vs requested ~57.0.29; expo-asset installed 57.0.19 vs requested ~57.0.20. No upgrades, exclusions, suppression or new dependencies.
- Git whitespace checks and a focused correction patch/preservation audit are recorded under `.expo/studio-retirement/`. The patch compares this task against its starting dirty-tree contents, not HEAD, so earlier work is excluded.

Native device and final preservation results are recorded below. No backend, persistence, real booking, authentication, payment, upload or messaging integration is introduced. Work stops after this correction.

## Android smoke check and preservation

Reused the existing emulator-5554 / Android 16 Expo Go session and existing Metro listeners (PIDs 4960 and 17304). No additional development server was started. Reloaded the updated fixtures and executed Explore -> Campus View Residence -> sticky room choice -> Single r1 Apply -> return -> Shared r2 Apply -> return. Fresh UI hierarchy assertions and full-frame screenshots confirmed exactly two selectable offerings, no Studio text/r3 controls/R4,800 price, ten listed rooms, and correct r1/r2 preselection with their original capacity and rent. The Rooms screenshot was visually inspected; the card design is retained. No emulator display/keyboard settings were changed in this correction. This is Android Expo Go evidence, not a claim of standalone Android or iOS device execution.

Evidence under `.expo/studio-retirement/`:

- `header.png` / `header.xml`: ten listed rooms, R2,200 starting price.
- `rooms.png` / `rooms.xml`: Single R3,500 / 4 listed; Shared R2,200 / 6 listed; no Studio option.
- `apply-single.png`, `apply-shared.png` and paired XML: exact valid preselection.
- `journeys.log`: native assertion results.
- `typecheck.log`, `lint.log`, `tests.log`, `doctor.log`, `export.log`: actual command results.
- `correction.patch`: this correction only, excluding the previous task's changes.
- `preservation.json`: no missing, unexpected modified or unexpected new files; original Git index unchanged; lockfile, prior Property Details report and both local Expo metadata files preserved.

There are 14 modified existing files and one new report. Git whitespace validation and reverse-check of the focused patch pass. No staging, reset, clean, discard, commit or push was performed. The existing Doctor patch mismatch remains the only tooling warning. Native iOS and spoken TalkBack were not run; iOS export passes. This correction is complete and introduces no backend or new dependencies.
