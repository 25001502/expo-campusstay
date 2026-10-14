# Property Details and room-type refinement

## Initial audit and plan

Read the complete supplied brief and apple-design skill; no applicable AGENTS.md was found. Recorded the dirty tree, staged diff and hashes/copies of existing files under `.expo/property-details/`. All **371 existing tests pass** before editing. Preserve prior phases, fixtures, IDs, prices, capacities, local providers, authentication-free startup and manager separation. No dependency upgrade is planned; the prior Doctor patch-version warning remains a verification item.

- All 11 room records have supported occupancy: Private/Studio have capacity 1; Shared/Apartment have capacity 2. Introduce exactly two typed categories, Single and Shared, with display names Single Room/Shared Room. Retain every room ID and numeric/facility field. Retain Studio and Apartment as descriptive offering variants, grouped within their canonical category. Update discovery, Apply/review/status, booking presentation and manager room creation/display without unrelated visual edits.
- Historical p2 Studio booking/manager-application labels have no room ID/capacity and do not match current p2 inventory. Preserve the labels as historical attributes with an unavailable-type fallback rather than inventing a current room association or occupancy.
- The Property gallery assumes images exist, uses window rather than safe content width, lacks accessible page selection and keeps stale image state across property changes. Add safe image fallback, measured-width paging and accessible existing-style pagination. Preserve imagery, crop, heart and Back navigation.
- Room cards currently expose three primary categories for p1. Group two Single offerings (r1 R3,500 and r3 Studio-layout R4,800) and one Shared offering (r2 R2,200), retaining exact selection by ID. Sticky Apply currently bypasses explicit choice; guide to Rooms until an intentional valid selection exists, then continue that exact offering.
- Listing counts are static fixture inventory, not verified vacancies. Use listed counts derived from rooms. Existing property headline prices exceed some shared-room prices; show the actual minimum supported room price in Property Details without rewriting room prices or unrelated discovery pricing metadata.
- About amenities/manager/review layouts have fixed assumptions that can fail at enlarged text. Refine natural wrapping, safe areas and spacing with existing tokens. Replace the unrelated stock map with supported address/distance information. Remove unsupported current response/verification claims.
- Three comments and fabricated rating-distribution percentages are hard-coded for every property. Preserve those existing comments once as illustrative examples without inventing property ownership; keep aggregate listing metadata distinct from example comments. Properties without associated real review records get an appropriate empty state. Do not derive fictional distributions from aggregate metadata or relative dates without a timestamp basis.
- Keep the white sticky bottom action bar in the layout so its actual responsive height cannot obscure content. Add focused behavior tests/CI registration, run all suites/typecheck/lint/Expo checks/exports/diff checks, inspect native full-frame captures before attributing clipping, exercise representative Android configurations and restore machine settings.

## Implemented behavior and design

The apple-design principles used here are clear hierarchy, direct swipe manipulation, immediate pressed feedback, stable spatial relationships, restraint and readable dynamic text. CampusStay's navy/blue tokens, Outfit/Inter, original photographs, rounded white cards, heart controls, blue Apply buttons, three tabs and blue active underline remain. No new motion, assets, fonts, library or theme was introduced. The native gallery keeps the same 260dp height and `cover` crop; Back and Favorite now sit below the status-bar safe area. Full-frame before/after captures do not show a systematic left-edge layout crop; text/card insets are retained rather than compensated with arbitrary offsets.

`src/rooms.ts` is the shared typed classification/display layer. `Room.type` is restricted to Single/Shared; optional Studio/Apartment variants describe existing offerings. The Rooms tab always has exactly two category cards. Each underlying offering retains its own selectable radio, facilities, count, price and Apply action. Selection is identified by property ID and room ID, never a shared display label. A radio and the word Selected communicate selection without depending on colour.

### Exact inventory mapping

All original IDs, prices, capacities, inventory counts, bathrooms and furnished flags are preserved. IDs are scoped to their original property.

| Property | Room | Previous type | Primary category | Descriptive variant | Capacity | Monthly rent | Listed count |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| p1 | r1 | Private | Single Room | — | 1 | R3,500 | 4 |
| p1 | r2 | Shared | Shared Room | — | 2 | R2,200 | 6 |
| p1 | r3 | Studio | Single Room | Studio layout | 1 | R4,800 | 2 |
| p2 | r1 | Private | Single Room | — | 1 | R5,200 | 3 |
| p2 | r2 | Apartment | Shared Room | Apartment layout | 2 | R7,800 | 5 |
| p3 | r1 | Private | Single Room | — | 1 | R4,100 | 2 |
| p3 | r2 | Shared | Shared Room | — | 2 | R2,600 | 3 |
| p4 | r1 | Private | Single Room | — | 1 | R6,200 | 1 |
| p4 | r2 | Shared | Shared Room | — | 2 | R3,800 | 2 |
| p5 | r1 | Studio | Single Room | Studio layout | 1 | R3,900 | 5 |
| p5 | r2 | Shared | Shared Room | — | 2 | R2,400 | 4 |

Property inventory totals remain p1=12, p2=8, p3=5, p4=3, p5=9. p1's Single category contains 6 listed rooms across two separately priced offerings; Shared contains 6. A fixed expected matrix test protects all 11 records and every numerical/facility field.

The existing p2 historical Studio booking (`#CS-20522`) and manager application (`ma-3`) contain no room ID or occupancy, and current p2 has no matching Studio offering. They remain intact. Their presentation says `Room type unavailable · Studio Room (historical label)` rather than asserting Single occupancy or associating them with a different current offering. Known historical Private labels display Single Room; Shared remains Shared. No historical reference, rent, status or selection is rewritten.

### Gallery, information and About

- Gallery paging uses the window width minus left/right safe-area insets, stable property/image keys and a deterministic item layout. Swipes and existing-style pagination agree; pagination now has 44dp targets and selected states. Missing images use the existing named RemoteImage fallback. Changing property resets its gallery/tab/selection state. Groups and gallery images are memoized against their actual data dependencies; no speculative performance framework was added.
- Header name/address/price and badges wrap naturally. Address formatting avoids repeating a city already present in the address. Distance is shown only when finite and nonnegative. Property Details derives the starting price from positive-priced, positively listed offerings, with an explicit unavailable fallback. p1 therefore correctly starts at R2,200. Existing headline pricing in discovery fixtures is untouched; each room keeps its exact price.
- Counts say rooms listed, not verified vacancies, and are summed from the actual room records. Apply has matching wording. No reservation follows from a positive fixture count.
- About preserves the original description, actual amenities and house rules. Amenities switch to one column at narrow widths/enlarged text. The unrelated stock map has been replaced by a rounded location card containing only supported address and distance. The listed contact name/avatar and existing conversation route remain; unsupported current response-time/verification claims were removed from this screen.

### Apply and cross-screen integration

Without an intentional selection, sticky Apply switches to Rooms and scrolls to the selection section; it does not choose the cheapest/first room or create a booking. Selecting or applying to an offering stores its exact room ID. Valid selection survives tab changes and returning from Apply. Zero-listed offerings cannot be selected/applied to. Application draft, review and saved-local status preserve the same exact offering, variant and rent.

Home's existing quick-filter source now exposes Single Room and includes single-occupancy Studio offerings. Shared Room includes the supported two-person Apartment offering. Filters use room data, not property names. Explore/Favorites retain their existing property IDs and shared FavoritesContext. Compare has no independent room-type categories to migrate and remains unchanged. Manager room display uses the same labels; new-property creation offers only Single/Shared and validates an explicitly entered capacity (1 for Single, an integer >=2 for Shared). Existing manager room price/count editing preserves ID, category, variant and facilities. The manager portal's navigation, ownership isolation and actions are unchanged.

### Reviews and truthful data presentation

The original aggregate ratings/counts are listing fixture metadata, not a derivation from actual linked reviews. They remain distinct and explicitly illustrative/not independently verified. The five distribution tracks remain visually familiar but show no fabricated fill percentages: no distribution is supplied. No linked review records exist, so the tab shows an appropriate empty state.

The original three names, star values and comments are retained once behind View illustrative review examples. They are explicitly unassociated examples, not authenticated testimonials about the selected property. Their original relative labels are retained as source attributes but not displayed as current recency because there is no timestamp basis. No review records, identities, dates, percentages, submission feature or server success were invented.

### Sticky actions and accessibility

The white action bar is a sibling of the flexing ScrollView, so its natural height is excluded from scrollable space. Its bottom padding follows the device safe area. Buttons stack at narrow widths/enlarged text and retain natural heights. Final amenities/contact/review content can scroll fully above it. Gallery controls, tabs and room radios expose meaningful descriptions, selected/checked/disabled states and minimum targets. Tabs and prose have no truncating line caps. At very narrow widths with 200% text, the existing tab strip scrolls horizontally so Reviews is not split across lines; reviewer names/stars wrap in their original card language. No spoken TalkBack test has been performed.

## Files in this task's review diff

17 pre-existing files modified, four files added (21 total). Earlier dirty-tree changes outside these paths were preserved.

- Added `src/rooms.ts` and `src/propertyDetails.ts`: typed classification, grouping, historical display, gallery/address/price/rating/review-data helpers.
- Modified `src/data.ts`, `src/discovery.ts`, `src/application.ts`, `src/manager.ts`: mapped inventory, filters, review/status labels, compatible manager creation/occupancy validation.
- Modified `src/screens/PropertyScreen.tsx`, `ApplyScreen.tsx`, `AppStatusScreen.tsx`, `BookingsScreen.tsx`, `ManagerScreen.tsx`: focused screen behavior and shared canonical display; no unrelated screen redesign.
- Added `scripts/property-details.test.cjs`; modified `scripts/profile-harness.cjs`, `application.test.cjs`, `discovery.test.cjs`, `home.test.cjs`, `phase-e.test.cjs`, `phase-f.test.cjs`. VM loaders resolve the new local TypeScript helper dependencies. Existing expectation changes implement the requested category/variant/capacity rules; assertions for exact IDs/prices remain. Native modules are stubbed in these callback tests; those tests do not prove native rendering.
- Modified `package.json` and `.github/workflows/ci.yml` only to register `test:property-details` alongside existing checks.
- Added this report. `package-lock.json`, dependency versions, theme, authentication-free entry point, providers and prior task reports remain untouched by this task.

## Automated verification

Initial baseline: 371/371 tests pass before edits. Final verification includes all 12 existing npm test suites plus the new suite: 409/409 pass, zero failures/skips. The new suite has 38 tests, including 12 layout contracts (320/411/480/800dp x 100/130/200% text), inventory preservation, exact room preselection/review/status, sticky behavior, gallery/favorites, truthful review handling, filters and manager compatibility. Layout contract tests inspect render trees/styles; native evidence is recorded separately below.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass; zero warnings |
| `node --test scripts/*.test.cjs` | 409 pass; all existing suites included |
| `npm run test:property-details` | 38 pass |
| `npm run check:dependencies` with network access | Exit 1: existing Expo/expo-asset patch mismatches only |
| `npm run doctor` with network access | 20/21; same existing version check warning |
| `npm run export:check` | Pass: Android and iOS Hermes bundles exported to `dist` |
| `git diff --check` | Pass |

Installed Expo is 57.0.28 (tool requests ~57.0.29) and expo-asset is 57.0.19 (tool requests ~57.0.20). No dependency was upgraded, installed, excluded or suppressed. The first sandboxed compatibility check used an offline map; its apparent success was not accepted as the online result. A sandboxed Doctor run could not reach Expo services; the network-enabled run above completed. The first sandboxed export failed because Hermes could not write its temporary bytecode file; the same project export succeeded outside that filesystem sandbox. Build/export success is not device execution.

Verification logs and full-frame PNG/XML pairs are under `.expo/property-details/` (ignored local artifacts). Review-only `refinement.patch` isolates this task from all prior uncommitted work; `preservation.json` checks original file hashes, missing/unexpected changes, lockfile and Git index preservation. No commit, push, reset, clean, discard or staging was performed.

## Android runtime evidence

Used the existing `emulator-5554` / Medium Phone API 36.1 (Android 16) and existing Expo Go/Metro sessions. Inspected listeners first (IPv4 PID 4960 and IPv6 PID 17304); no additional development server was started and neither existing server was killed. Expo export's build-time bundler is separate from the running development session. Screenshots are unedited full-frame ADB captures with paired fresh UIAutomator XML.

The standard-width device journey actually executed Explore -> Campus View Residence -> gallery swipe and page selection -> favorite removal -> About/Rooms -> sticky Apply without a selection -> exact Single r1 Apply (R3,500/capacity 1) -> return -> distinct Studio-layout Single r3 (R4,800/capacity 1) -> return -> Shared r2 (R2,200/capacity 2) -> return -> sticky Apply resumes r2 -> Reviews -> example comments -> About amenities/contact -> favorite save -> Explore and Favorites reflect the same property. Native preselection captures show the exact offering ID and selected state. Review/status identity across the later application steps is covered by automated tests; this task does not claim a newly completed native five-step application submission.

| Native configuration | Evidence and scope |
| --- | --- |
| ~411dp / 100% (1080x2400, density 420) | Full gallery/favorite/tab/three-offering preselection/return/sticky journey, About ending, Reviews and Explore/Favorites synchronization |
| 320dp / 100% (840x1890, density 420) | Header, two room categories/offerings, sticky guidance, review examples |
| 320dp / 200% | Wrapping header/cards, stacked actions, one-column About, horizontal tab strip, review summary and explicit end captures |
| ~411dp / 130% | Header, two categories/all offerings, sticky actions and full final review |
| 480dp / 200% (1260x2520, density 420) | Header, readable offering prices/actions, stacked bottom bar and full final review |
| 800dp / 100% (1600x2400, density 320) | Tablet gallery/header, both categories/all offerings, bottom bar and review ending |

The full 12 width/text combinations are covered by automated layout contracts; the six configurations above are the representative native sample, not a claim of executing every native permutation. At 320dp/200%, native inspection found Reviews split into Review/s; the final horizontal strip fixes that without shrinking/capping text or changing the underline. Horizontal swiping reveals the complete label. Android text scaling is platform-controlled and can be nonlinear.

Initial accessibility-bound assertions for the final review were insufficient: Android clips text-node bounds to the viewport. Those early visibility messages in `journeys.log` are explicitly qualified. The verified end screenshots use swipes originating within the actual scrollable body and visual inspection; they supersede partially visible early review captures. This was a QA-script issue, not hidden review content in the app.

Key evidence (all paths relative to repository):

- `.expo/property-details/header-final.png`: final standard-width header, with the supported city shown once.
- `.expo/property-details/rooms-single.png`, `rooms-shared.png`: exactly two primary categories, all three original p1 offerings/prices, selection and sticky actions.
- `.expo/property-details/apply-single.png`, `apply-studio.png`, `apply-shared.png`: exact r1/r3/r2 preselection, capacity and rent.
- `.expo/property-details/about-amenities.png`, `about-final-contact.png`: actual amenities/contact can scroll above actions.
- `.expo/property-details/reviews.png`: metadata/distribution and empty linked-record state.
- `.expo/property-details/411-130-review-end.png`, `480-200-last-review.png`: complete final illustrative comment and divider above the bottom bar.
- `.expo/property-details/320-200-reviews-summary.png`, `320-200-review-end-verified.png`, `320-200-about-amenities.png`, `320-200-about-end.png`: final narrow enlarged-text captures.
- `.expo/property-details/800-100-single.png`, `800-100-last-review.png`: tablet layout.

Final native pass completed after foreground recovery: all four final 320dp/200% captures listed above were created and visually inspected. The complete final review paragraph/divider and the complete About contact/Message card are above the action bar. The selected Reviews label is fully revealed by horizontal scrolling. One Expo Go `am start -W` activity wait timed out during repeated display reconfiguration; launching without the blocking activity wait and inspecting the running screen recovered the session. No application red screen was observed. These checks use Expo Go, not a newly built standalone Android binary. The gray floating gear in captures belongs to Expo Go's development tools, not the CampusStay design.

Emulator restoration was verified: physical size 1080x2400 with no override, physical density 420 with no override, font_scale=1.0, navigation_mode=2 (original gestures). Keyboard settings were not changed. CampusStay was left on student Home without credentials (`home-restored.png`, `restored-settings.log`).

## Remaining limits

- Expo's online dependency gate still exits 1 for the two pre-existing patch mismatches. The CI dependency step therefore is not fully green; no suppression or upgrade was introduced in this UI task.
- No iOS simulator/device is available on this Windows host. iOS export passes; native iOS safe-area/gesture/rendering behavior remains unverified.
- TalkBack spoken reading order, physical-device behavior and frame-rate profiling have not been performed. Accessibility props/native hierarchy and emulator gestures were inspected; there is no performance-number claim.
- Native flow evidence focuses on p1, which contains the separately priced Studio variant. The exact 11-record matrix and other property mappings are protected by automated tests. The manager creation/capacity and room-edit compatibility are automated checks, not a new native tour of every manager screen.
- Ratings, review examples and inventory remain supplied fixtures. There are no property-linked real review records, live vacancies or external verification. Historical p2 Studio occupancy remains unknown. Local application saving is not acceptance, reservation or confirmed accommodation.
- No backend, database/API, persistence, authentication, payment, upload, real messaging/booking or review-submission integration was added. Existing login-free student startup and separate manager entry remain covered by regression tests. Work stops at this Property Details/room-standardization task.
