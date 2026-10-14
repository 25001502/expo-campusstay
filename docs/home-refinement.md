# Home screen refinement

14 October 2026. Scope: refine the existing Home screen and the shared card/navigation/data paths directly used by it. Preserve all previous phases, Profile/Login work, and approved staged `.expo` tracking removals.

## Initial audit before editing

- No applicable AGENTS.md was found in the repository or its ancestor directories. Working-tree status, complete index entries, and SHA-256 hashes of existing tracked/non-ignored files were captured under ignored `.expo/home-refinement-evidence/`.
- Home hard-codes `Siyanda`, `SD`, and `Good morning`, ignoring the existing blank-by-default ProfileProvider. Notification count and shortcut already use CommunicationContext correctly.
- Search trims the input and navigates to typed Explore. Existing discovery supports property/city/university/amenity searches. Home's chip selection is separate state that can remain stale after Explore changes. All seven chips already have genuine shared predicates; Near Campus needs explicit finite/nonnegative-distance guarding for incomplete records.
- Featured items use stable property IDs as list keys and correctly pass their own property records to Details. Favorites controls are siblings of detail targets, use the shared provider, and do not need another state owner. Image handling already provides loading/error/fallback and native caching.
- Shared PropertyCard presents fixture `verified` booleans as real verification. No verification evidence or service exists. Details repeats those property/manager claims. Card metadata formats missing numbers directly; featured price/rating row cannot wrap at enlarged text. Supplied property availability equals the sum of room counts for all current records; property prices are existing listing prices, not necessarily the cheapest room.
- Home See all lacks a 44dp minimum target. University cards repeat only abbreviations instead of displaying their existing full names. Tablet widths are uncapped, and larger text still forces two columns. Featured sizing leaves little next-card preview on narrow phones.
- Home has no focused light StatusBar override after dark-status-bar screens. The promotional NEW LISTINGS label has no supporting timestamps. Existing navy/blue tokens, Outfit/Inter, horizontal lists, rounded cards, university icons, spacing conventions, and student tab design will be retained.
- Existing scripts include 191 tests across eight suites, strict typecheck, lint, Expo compatibility/Doctor, and Android/iOS Hermes exports. No dependency upgrade/install is required.

Runtime availability: emulator-5554 is connected and Metro already listens on 8082. A single bounded device inspection is used before runtime testing. Results and final implementation/check details will be recorded below.

## Implementation summary and visual refinement

The existing navy/blue palette, theme tokens, Outfit/Inter, header hierarchy, notification and profile controls, search design, horizontal chips/carousel, rounded cards, photo treatment, shadows, university symbols, and student tabs remain. No new visual system or animation was introduced.

Home now uses a bounded two-line heading with the full text exposed to accessibility, balanced header controls, focus-aware light status-bar styling, a search focus border using an existing blue token, and 44dp minimum See all/promotion targets. At 150% font scaling and above the header controls stack rather than squeezing the greeting. Existing avatar initials have their established font multiplier cap, while ordinary body text can scale.

Featured widths leave a small next-card preview on narrow phones and remain capped at 300dp on larger screens. Photos retain the existing 300:170 proportions. List items stretch on their cross axis without flex growth that would override width inside the native horizontal FlatList cell's row layout; body/details growth and wrapping footers allow content to expand naturally. Small list padding retains shadow space. No arbitrary fixed card-content height was added. Actual equal-height/scroll smoothness still needs native visual confirmation.

University cards retain their order and icon/abbreviation styling, display the existing full university names, and wrap naturally. The centered grid is capped at 720dp, with one column on narrow phones or at enlarged text, and two columns otherwise. Home's final bottom padding uses the existing 32dp token plus the inset; the normal tab bar already occupies its own layout space. Lateral safe-area insets are respected. The bottom-tab implementation itself was not edited.

## Greeting, avatar, and session synchronization

`ProfileProvider` remains the single owner of personal details. Home reads its current fullName directly. Empty/whitespace names produce **Welcome to CampusStay!** and the existing generic person icon; a saved name produces **Hey, [first name]!** and initials from the first two name words, using the same convention as Profile. Unicode characters and internal whitespace are handled without inventing a student identity. No profile copy is kept in component state.

The greeting uses the device-local hour: before 12 morning, 12-17 afternoon, and 18 onward evening. It is initialized on mount and refreshed when Home gains focus. There is no polling timer. A Home screen left continuously open across a time boundary updates on the next focus. Confirmed Profile Log Out still resets the existing owner; Home consequently returns to its neutral greeting after credential-free continuation. The editing flow, logout confirmation, Login, and navigation reset implementations were not altered.

## Search, chips, and Explore semantics

Home's text field remains editable. The search arrow and keyboard search action dismiss the keyboard and open the existing typed Explore route with the complete trimmed query. Empty/whitespace searches are valid. Case and long terms are preserved; no arbitrary input truncation or external search API was added.

Each Home action supplies an explicit fresh query/university/quick-filter route context so a previous Home-origin route context does not leak into another shortcut. Other explicitly chosen Explore controls, such as its price slider, amenities, and sort, retain their established local-state semantics; Explore's existing Clear all remains available. See all opens that same listing, not another screen. Search still uses the single shared property/city/university/amenity matcher.

All seven horizontal chips navigate to Explore with their real shared predicate. They are actions rather than another filter-state owner, so Home retains pressed feedback without stale persistent selected styling.

| Chip | Existing discovery meaning |
| --- | --- |
| Near Campus | A supplied finite, nonnegative distance of at most 1 km; invalid/missing values are rejected. No GPS or device location. |
| Under R5,000 | Existing listing price strictly less than R5,000; the exact R5,000 boundary is excluded. |
| Private Room | At least one available room explicitly classified Private. |
| Shared Room | At least one available room explicitly classified Shared. |
| Available Now | Positive supplied listing availability, within the existing static-data semantics. |
| Wi-Fi | The listing includes the existing Wi-Fi amenity. |
| Furnished | An available room is explicitly furnished. |

University cards pass their actual supported university ID through the existing helper. UCT, Wits, UP, and SU ordering is unchanged. UP currently has no associated accommodation in the supplied data, and Explore shows its existing empty state rather than substituting another university. The lower UNIVEN promotion also uses the supported university association. Its unsupported NEW LISTINGS recency label is now BROWSE ACCOMMODATION; no timestamps or fresh listings were fabricated.

## Featured accommodation, favorites, and data integrity

Featured data remains the same first four records in the same order, with stable property IDs as keys. Both image and detail actions pass that exact record and ID through the existing typed Property route. Favorites are separate sibling controls, avoiding accidental Details activation. Home, Explore, Details, Favorites, and Profile still use FavoritesContext and its existing reducer, including duplicate prevention; there is no second count or favorites array in product code.

Shared PropertyCard replaces the unsupported verified flag/badge with the actual property type using the existing Badge design. The directly linked Details screen only loses its two unsupported property/manager verification badges and the unused import; no other Details flow was rewritten. Fixture booleans remain in the existing data for compatibility, but these public surfaces no longer present them as proof of real verification. The dormant VerifiedBadge component was not repurposed into another claim.

Existing R + locale-formatting and /month presentation are retained. The price is the existing listing-level price, not a newly calculated lowest room price. Ratings are shown only when finite and within 0-5; supplied distance must be finite/nonnegative. Missing/invalid numeric values get explicit price, location, or availability fallbacks. Missing photos use the existing RemoteImage fallback. Supplied room counts match the sum of room inventory for every current listing; cards say **rooms listed**, avoiding a live-availability promise. Zero is **No rooms listed**. The featured list has an explicit empty-state action back to Explore.

Listings, ratings, distances, prices, provider profiles, and availability are static project data. They have not been externally verified or refreshed. Real verification, live inventory, provider communication, external applications/bookings, uploads, and payments remain absent. No backend, real authentication, storage, API, or invented external-service success was added.

## Accessibility and responsiveness

Automated component cases covered logical widths **320, 411, 480, and 800dp** at **100%, 130%, and 200%** text scale. They verify bounded greeting/full accessible identity, responsive carousel and university widths, safe-area padding, See all touch targets, preserved tab order, and existing two-line narrow tab labels. These are component-prop/callback assertions with native modules stubbed, not Android layout measurements.

Controls retain meaningful names/roles, shared pressed feedback, and minimum 44dp targets. The notification shortcut announces actual unread counts and reuses CommunicationContext; individual/all-read callbacks synchronize Home with Profile. Decorative thumbnails, initials, university symbols, and the promotion photo avoid duplicating named actions. The search input announces its purpose and accepts IME submission. Long headings, university names, card names, prices, and ratings have deliberate wrapping/truncation behavior without shrinking the overall design.

A code-based contrast calculation against the actual theme colours produced: header title **17.28:1**, header secondary **11.64:1**, search placeholder/secondary text over its composited background **8.72:1**, filter/body text **10.35:1**, card metadata **7.58:1**, See all **6.41:1**, avatar initials **5.17:1**. These sampled pairs exceed 4.5:1. The calculation log is saved locally; it does not replace device visual QA.

TalkBack speech/focus order, native touch interception, actual card heights, image crops, horizontal/vertical scrolling, keyboard panning, and tab/gesture/three-button visibility were **not** runtime-tested in this pass. Landscape testing was unavailable; the existing app configuration remains portrait.

## Performance findings

The same four featured records and first four universities are sliced once at module scope instead of reallocating arrays per Home render. Stable property IDs and the existing FlatList/RemoteImage paths are retained. No duplicate discovery filtering, expensive per-keystroke Home filtering, new cache, list/carousel package, or speculative memo abstraction was added. Focus-only time updates avoid periodic renders. Image URLs, Expo Image caching behavior, and image error/retry handling remain intact. Frame rate, request counts, and native render timing could not be profiled on the stalled emulator, so no measured performance improvement is claimed.

## Automated verification

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Pass, strict checks retained |
| `npm run lint` | Pass, zero warnings |
| `npm run test:baseline` | 5/5 |
| `npm run test:ui` | 6/6 |
| `npm run test:discovery` | 14/14 |
| `npm run test:application` | 24/24 |
| `npm run test:phase-d` | 37/37 |
| `npm run test:phase-e` | 36/36 |
| `npm run test:phase-f` | 16/16 |
| `npm run test:profile` | 53/53 |
| `npm run test:home` | **24/24 new tests** |
| **Total** | **215/215 passed**, zero failures/skips |
| `npm run check:dependencies` | Pass, dependencies up to date |
| `npm run doctor` | **21/21**, no issues |
| `npm run export:check` | Pass: Android and iOS Hermes exports |
| `git diff --check` | Pass; LF/CRLF conversion notices only |
| `git diff --cached --check` | Pass |

The 24 new tests extend the existing native-stub harness with real screen callbacks and shared reducers. They cover identity, time periods, save/logout synchronization, notifications, search/IME/route context, all chips and threshold/classification edge cases, university zero results and promotion, exact property routing, favorites across five screens, missing metadata/empty featured data, unsupported claims, focused status-bar ownership, responsive props, and unchanged tab structure. No existing tests were deleted or weakened. Initial failures came from an incomplete test selector for the existing Details favorite label and were corrected to use its actual full accessible name.

The new `test:home` package script is included in the existing CI workflow after Profile tests. No dependency version or lockfile change was made. Typecheck/lint, the Home suite, and both exports were repeated after the final layout review. Full per-script logs live in ignored `.expo/home-refinement-evidence/`.

## Android runtime result and evidence

ADB listed emulator-5554 as connected; Metro already listened on 8082. A single targeted inspection confirmed `ro.kernel.qemu = 1`, then stopped responding while querying the current display configuration. It timed out after 15 seconds, and only the process object for that newly launched query client was stopped. No emulator/ADB/Metro restart, reset, competing server, or physical-device settings change was attempted.

**All Home Android journeys in this request are Blocked**: opening/inspecting Home, saving a profile name and checking the greeting/initials, notifications, university search, chips, featured Details, favorites, See all, university selection, bottom tabs, logout/continuation, and greeting reset. No new before/after screenshots were captured or claimed. Previous reports' Android evidence is historical and is not counted as a pass for this implementation. Current resolution/density/font scale/navigation mode remain unconfirmed; no settings were changed, so there is no new test-setting restoration to perform.

Evidence paths: `.expo/home-refinement-evidence/initial-status.txt`, `initial-index.txt`, `initial-file-hashes.json`, `device-before.log`, `device-before-error.log`, `contrast-check.log`, and the individual check logs. No screenshots were placed in tracked source directories. Native verification requires a responsive emulator; iOS runtime testing is unavailable on this Windows host. Export success is not proof of device execution.

## Exact files changed in this request

1. `src/screens/HomeScreen.tsx` - greeting/profile integration, focus behavior, refined layout and controls, routing context, carousel/university presentation.
2. `src/home.ts` - small pure identity/time presentation helpers.
3. `src/components/PropertyCard.tsx` - truthful badge/metadata and adaptive featured layout.
4. `src/discovery.ts` - finite/nonnegative proximity guard only.
5. `src/screens/PropertyScreen.tsx` - remove unsupported property/manager verification badges and their unused import only.
6. `scripts/profile-harness.cjs` - reusable per-screen hook slots, shared reducer/context fixtures, focus/native stubs, and named component support.
7. `scripts/home.test.cjs` - 24 meaningful Home regression tests.
8. `package.json` - add `test:home` only.
9. `.github/workflows/ci.yml` - run the Home suite using existing CI conventions.
10. `docs/home-refinement.md` - this audit and implementation report.

The full pre-existing working tree was preserved. SHA-256 comparison identified only the seven expected edits to existing files above; the three remaining files are new. The complete Git index matches the initial snapshot exactly, including the two previously approved staged `.expo` removals. App/tab navigation, design tokens, provider implementations, Profile/settings forms, Login/continuation, application models, comparison, messages, and manager code were not changed. Existing tests for those paths pass; new native regression coverage remains blocked.

No commit, push, reset, clean, discard, local-file deletion, or Git-index modification was performed. Stop after this Home refinement; no backend, authentication implementation, database work, or unrelated feature was started.
