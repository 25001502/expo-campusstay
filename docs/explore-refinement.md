# Explore refinement

## Initial audit and plan

Installed baseline verified: Expo 57.0.28, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3, React Navigation native 7.5.0. No dependency changes or installation required. No applicable AGENTS.md found in the repository or ancestors. Existing staged removals of the two .expo files and all other work were recorded before editing.

Search, university and Home quick-filter context live in typed Explore route parameters. Price, amenities, sort and expansion are screen state. The existing memoized discovery selector combines these criteria; FavoritesContext supplies the same stable IDs to all screens. Cards already guard missing metadata, use image fallbacks, and label room counts as listed rooms. The fixture verification flag is not a public verification claim.

Android before capture (`.expo/explore-evidence/before-expanded.png`) reproduces amenity chips clipped immediately above sorting. The panel is a capped vertical ScrollView outside the results FlatList, alongside fixed sibling sections. Its viewport ends in the middle of chips; lower rows/actions require a separate gesture and the results retain their independent offset. There is no absolute positioning or z-index in the filter panel. This is clipping/crowding from separate constrained scroll regions, not cards painting over a flowing panel.

Plan: make the existing inline controls a naturally sized FlatList header; keep only sorting horizontal. Preserve the visual system, immediate filtering and listing-price semantics. Separate panel reset from comprehensive reset, guard slider values and malformed numeric records, improve focus/accessibility, and verify callbacks plus Android scrolling.

## Layout and scrolling

Explore heading, search, removable Home context, expanded filters, sorting and results count now share one naturally sized FlatList header. The same virtualized list owns the cards. Sorting is the only nested ScrollView and is horizontal. There is no vertical filter viewport, fixed panel height, sticky overlay or new modal. Expanded controls scroll with the results instead of cutting across chips. Closing via the filter toggle or existing Show count action retains criteria and returns to the list origin, avoiding a stale offset after removing a tall panel.

Existing white/slate surfaces, navy sorting, blue slider/chips/buttons, rounded shapes, Outfit/Inter, images and shadows remain. Chips gain vertical padding and a 44dp minimum; panel actions stack with intrinsic heights on narrow screens or at enlarged text. Search keeps its light rounded appearance and gains the existing theme focus border, query-only clear action, keyboard submit dismissal and drag dismissal. A further Android narrow/200% screenshot exposed native placeholder text wrapping into a clipped second line even with explicit single-line EditText props. The same original placeholder now uses a single-line, ellipsized Text inside a noninteractive, accessibility-hidden overlay of the input field. Its full wording remains the input's accessible hint; typing removes it. The input remains a real single-line TextInput with uncapped font scaling. This localized placeholder alignment does not position or constrain the filter panel. Horizontal safe insets and bottom content padding supplement the existing navigator's tab safe area. Only a focused Explore screen owns its dark status-bar style.

## Search, filters and recovery

- The existing discovery selector still searches property name/type, city/address, university name/short name/city, amenities and supplied tags. Home query, university and quick-filter route parameters remain typed and independent. No remote search was added.
- Prices apply immediately to **property.price**, the displayed listing price, not the lowest room price. The existing slider range remains R1,000–R10,000, step R500. Bounds clamp; intermediate finite values snap to supported steps; NaN/infinite callbacks retain the last valid value. The label and accessibility value share explicit comma grouping and per-month units.
- The same seven supported amenity options remain: Wi-Fi, Security, Parking, Laundry, Study Area, Kitchen and Gym. Multiple selections require **all** selected keys. Toggling cannot duplicate entries; unsupported keys cannot enter through the panel callback. The selector fails closed for an unknown requested key. Furnished remains the existing Home room-based quick filter; it was not invented as a property amenity.
- **Clear filters** resets only the panel price and amenity selections. Search, university, Home quick filter, sort and expansion remain. **Clear search** removes only query text. Each context chip removes only its own route parameter. **Clear all** retains the existing comprehensive contract: query/university/quick filter, price/amenities and sort return to defaults.
- Results count comes from the actual rendered array, with singular/plural and “No properties found”, and a polite live region. Existing EmptyState retains its styling and explains its explicit **Clear all** recovery, including university/quick-filter removal. No listings are fabricated for an empty university or incompatible criteria.

## Sorting, cards and favorites

Recommended preserves fixture order; Price: Low/High use listing price; Highest Rated uses supplied ratings; Nearest uses supplied campus distance. Ties preserve source order; sorting never mutates the source. Missing/nonfinite/negative rating or distance values sort last; ratings above five are invalid. Missing/nonfinite/negative prices cannot satisfy a numeric price ceiling and are excluded, rather than assigned an invented price. Valid zero values remain valid. Current fixture results are unchanged.

Shared PropertyCard visuals were reviewed and retained: image cover/fallback, 180dp list image region, naturally wrapping title/tags/footer, rounded shadowed card, category, listed-room count, rating, price and blue View action. Explore maintains equal 16dp lateral card margins, including lateral safe insets. The View button now names its property for accessibility. The supplied “Available Now” tag is omitted from list cards because static room counts do not establish real-time availability; the accurate listed-room count remains. The existing Home quick-filter contract is unchanged. Existing missing-price/distance/rating and image fallbacks remain. No public Verified badges or new availability claims were added. Other supplied tags remain listing metadata, rather than newly inferred amenities.

Explore resolves Details against the current supplied property record by stable ID before navigating. An invalid/missing ID yields a local “Property unavailable” alert; it cannot navigate or add an unknown favorite. Existing shared FavoritesContext remains the single in-memory source. Favorite controls stay independent of image/details actions, with accurate selected state; Home, Favorites, Details and Profile observe the same reducer. Returning from Details preserves Explore's query and local filters.

## Accessibility and performance

Filter toggle exposes expanded/collapsed state through an optional backwards-compatible IconButton prop. Amenity and sort controls expose explicit names and selected states, so selection is not conveyed solely by color. Slider exposes its label, minimum, maximum and current monthly value. Images remain decorative within property-named navigation actions; View and favorite buttons name their property. Text sizes remain uncapped and naturally wrap. No theme colors/fonts were changed. Spoken TalkBack has not been tested.

The existing useMemo derives the filtered/sorted array once per criteria change, not inside each card render. List keys remain stable property IDs. Slider state uses discrete R500 steps and React ignores repeated identical numeric values. The existing expo-image loading/cache/fallback path and FlatList virtualization remain. No new performance library, redundant derived-state store, second discovery engine or speculative memoization was added. No profiling or measured performance gain is claimed.

## Files in this refinement

| File | Change |
| --- | --- |
| src/screens/ExploreScreen.tsx | One vertical flow, scoped reset/search behavior, slider guards, safe areas, selected/expanded state and ID validation |
| src/discovery.ts | Existing range constants, price normalization/formatting, safe numeric filtering and stable sorting |
| src/components/UI.tsx | Optional IconButton expanded accessibility state |
| src/components/PropertyCard.tsx | Property-specific View accessible name and removal of the live-sounding Available Now tag; existing card styling retained |
| scripts/profile-harness.cjs | Hook-faithful useRef support for screen callback tests |
| scripts/phase-f.test.cjs | Replace old capped/nested-scroll implementation assertions with stronger rendered flow assertions |
| scripts/explore.test.cjs | New focused behavior and layout-contract suite |
| package.json | test:explore script only; dependencies unchanged |
| .github/workflows/ci.yml | Run Explore regression suite with existing checks |
| docs/explore-refinement.md | Audit, semantics and verification record |

The test harness uses native stubs. Its twelve width/text configurations test rendered props and state transitions, not actual pixel geometry. Android evidence is recorded separately below.

## Automated verification

Final automated rerun: **256 tests pass, zero failures/skips** (217 existing + 39 Explore). Every suite ran through its package.json script:

| Command | Result |
| --- | --- |
| npm run typecheck | Pass |
| npm run lint | Pass, zero warnings |
| npm run test:baseline | 5/5 |
| npm run test:ui | 6/6 |
| npm run test:discovery | 14/14 |
| npm run test:application | 24/24 |
| npm run test:phase-d | 37/37 |
| npm run test:phase-e | 36/36 |
| npm run test:phase-f | 16/16 |
| npm run test:profile | 53/53 |
| npm run test:home | 26/26 |
| npm run test:explore | 39/39 |
| npm run check:dependencies | Dependencies up to date |
| npm run doctor | 21/21, no issues |
| npm run export:check | Android + iOS Hermes exports pass after final source changes |
| git diff --check | Pass; Git emits its existing LF/CRLF conversion notices |

Coverage includes actual screen callbacks for expansion/collapse, scoped reset, search/context preservation, slider formatting/bounds, amenity selection/deselection/AND, all five sort orders/ties/missing metadata, accurate counts, empty recovery, shared favorites, current-ID Details navigation, invalid IDs, retained Home quick filters/university contexts, tab order and the single vertical scroll architecture. The former Phase F test asserted the capped/nested implementation; its replacement verifies all seven amenities are in a naturally sized View inside the results header, with one horizontal ScrollView and no nested vertical scroll viewport. Its purpose is strengthened rather than removed.

Two new-test expectations initially failed: Gym + Parking correctly matched only p2, and shared cards correctly retained locale-specific grouping. Tests were corrected against actual fixtures/formatting; no product data or old expectations were changed to force a pass. Logs are in ignored `.expo/explore-evidence/test-*.log` and `export.log`.

Dependency versions and package-lock.json remain unchanged; no installation was necessary. No authentication, backend, persistence, remote search, uploads, payments or booking confirmation was introduced.

## Android runtime

Tested on the existing `emulator-5554` Expo Go session, reusing the existing Metro servers. No server restart, cache cleanup, dependency installation, emulator wipe or physical-device setting change was performed. Existing development-server entries were used when the client returned to its launcher.

The native journey run passed: direct Home entry without credentials; Explore opening; expand/collapse/reopen; all seven amenity controls; Gym alone (two results); Gym + Parking (one); preservation after reopening; panel reset (five); slider touch at R5,500 (four); sort-pill selection including horizontally reached Highest Rated/Nearest; Wits and property-name searches; correct Details and back with query retained; removing/re-adding a favorite with Favorites synchronization and no accidental Details opening; zero search results and explicit recovery; reaching the last property's View above the tabs; all six student tabs. Exact sort orders and ties are also verified by the automated selector/screen suite.

Narrow/200% native interaction additionally passed slider touch at R5,500 and price + Parking + Gym producing one result. After the final placeholder fix, this case was repeated to verify the actual single-line ellipsis, naturally wrapping amenities, full reset actions, separate sorting/count and reachable View button.

All **12 viewport/text-scale combinations completed**. Each case verified collapsed/expanded views and scrolled through all seven amenities, reset, sorting, results count, and the first property's View action while retaining student navigation. Representative native screenshots were visually inspected for separation, wrapping and card layout, including the original clipping, standard views, narrow/200%, large/200% and tablet views.

| Viewport | Emulator size / density | Approximate width | 100% | 130% | 200% |
| --- | --- | --- | --- | --- | --- |
| Standard phone | 1080×2400 / 420 | 411dp | Pass | Pass | Pass |
| Narrow phone | 840×1800 / 420 | 320dp | Pass | Pass | Pass |
| Large phone | 1440×2880 / 480 | 480dp | Pass | Pass | Pass |
| Tablet | 1600×2560 / 320 | 800dp | Pass | Pass | Pass |

The first matrix attempts stopped during configuration recreation; one native Expo Go error read `no protocol:` in `URL.java` / `resetCurrentContext`. Dismissing its overlay returned to the usable app. The last tablet attempt returned to the Expo Go launcher; reopening the observed existing CampusStay server entry allowed the bounded case to pass. The QA runner was adjusted to wait for recreation, require the student tab set, and avoid developer-control touch points. These initial attempts are recorded as interruptions, not passes. No CampusStay dependency or native-client change was used to conceal the client behavior. The initial localhost-loading captures are diagnostics, not evidence of a running CampusStay screen.

Display restoration was verified after the matrix and final smoke: physical 1080×2400, physical density 420, font scale 1.0, no size/density overrides. The temporary 8082 ADB reverse mapping was removed, retaining the original 8081 mapping. Final-source smoke passed touch entry of Wits, one matching result, IME search submission and confirmed `mInputShown=false`, query-only clear, all seven standard-viewport amenities, native slider minimum R1,000 with zero results, maximum R10,000 with five results, explicit empty-state recovery, Durban's truthful nine listed rooms without the live-sounding tag, correct Details navigation and retained query on return. The app was left on student Home. See `final-smoke.log` and `keyboard-after-submit.txt`.

### Evidence

All files below are local, ignored QA artifacts under `.expo/explore-evidence/`; they are retained without adding screenshots or exports to Git tracking.

| Evidence | Files |
| --- | --- |
| Original defect | before-expanded.png / .xml |
| Collapsed and expanded final standard layout | collapsed-final.png, expanded-final.png |
| Two amenities and one actual result | multiple-amenities.png |
| Actual R5,500 selection / four results | price-filter.png |
| Narrow/200% after placeholder fix | narrow-20-final-collapsed.png, narrow-20-final-expanded-top.png, narrow-20-final-expanded-bottom.png, narrow-20-final-property-card.png |
| Narrow/200% slider interaction | narrow-20-price-filter.png |
| Zero-result recovery | zero-results-final.png |
| Final source keyboard/search, price minimum and accurate card | search-final.png, price-minimum-final.png, durban-card-final.png |
| Large/200% and tablet/200% | large-20-expanded-bottom.png, tablet-20-expanded-bottom.png |
| Full matrix | `<standard|narrow|large|tablet>-<10|13|20>-*.png` with matching XML; the final narrow/200% files use `narrow-20-final-*` |
| Journey assertions | journeys-output.log, journeys.log |
| Matrix assertions | matrix-output.log (standard/100%), matrix-final.log (remaining cases except narrow/200% and tablet/200%), journeys.log (also records those bounded cases) |
| Client interruption | expo-go-native-url-error.png / .xml, tablet-20-interruption.png / .xml |

## Regression review and limits

Existing Home, Login, Profile/settings, applications, favorites, messages, bookings and manager suites pass. Their source files/providers/routes remain unchanged, except for the explicitly listed small shared accessibility/card/discovery changes. Home, Profile and all student tabs were accessed on Android; the full application, Login/logout and manager journeys were not replayed in full during this Explore task. No new credentials, manager entry route, backend action or persistence was introduced.

The native-client URL/launcher interruptions remain a development-environment caveat. iOS simulator/device execution, physical Android devices, spoken TalkBack/VoiceOver, and release-build performance profiling were unavailable or not performed. Passing iOS export establishes bundling only. There is no measured performance claim and no claim of real booking, messaging, upload or payment execution.

Final SHA-256 comparison against the initial working tree found changes only in the eight existing files listed above; no existing files were missing. The two added reviewable files are this report and the Explore test suite. All other initial tracked/untracked file contents, including assets, Home/Login/Profile changes, app configuration and package-lock.json, are unchanged from the start of this task. The staged binary diff is identical, including the previously approved .expo tracking removals; both local files remain. No reset, clean, commit, push or staging operation was performed. `git diff --check` passes.

A focused patch relative to this task's initial working tree is saved at `.expo/explore-evidence/explore-refinement.patch`; it excludes the user's earlier changes and ignored QA artifacts. Work stops after Explore refinement.
