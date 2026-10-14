# Home final micro-refinements

14 October 2026. This pass changes only the requested greeting, university text/row sizing, and featured carousel geometry. Earlier phase/refinement reports remain unchanged.

## Changes

- **Greeting:** an empty/whitespace Profile now shows **Hey there!**. Saved names still derive **Hey, [first name]!** and initials directly from ProfileProvider. Removed the two-line/ellipsis limit so long first names wrap naturally at the existing 24dp Outfit size. Time-based greeting, subtitle, avatar, header hierarchy, focus behavior, and session ownership are unchanged. Tests cover saving, changing an existing name without another focus event, and confirmed logout reset.
- **University cards:** the existing wrapping grid explicitly stretches row items. Full-name text fills available width and can grow into spare height on the shorter card; neither name nor city is compressed. This keeps locations aligned in equal-height two-card rows while allowing the tallest name to determine natural row height. There is no line cap, ellipsis, fixed height, or new layout structure. Existing narrow/large-text single-column rules, 16dp padding, card design, university data/order, and routing are retained.
- **Carousel:** retained the 300dp maximum card width, existing card/image components and aspect ratio. The responsive formula reserves the 20dp leading margin, 16dp inter-card gap, and at least a 24dp next-card preview. At 320dp a card changes from 264dp to 260dp; at standard phone/tablet widths the existing 300dp size remains. The old 14dp gap is now the existing 16dp spacing token. Outer margins remain 20dp. No property data, badge, favorite, price/rating, shadow, image, or Details route changes were made.

Navy/blue, Outfit/Inter, icons, search, chips, rounded cards, university symbols, shadows, theme tokens, and all six bottom tabs are preserved. No dependencies, backend, authentication, persistent storage, or extra animation was added.

## Files changed in this request

1. `src/home.ts` - empty-name greeting text only.
2. `src/screens/HomeScreen.tsx` - natural heading wrapping, university sizing styles, carousel width/gap calculation.
3. `scripts/home.test.cjs` - updated the earlier greeting/truncation expectations to match this brief; expanded responsive geometry assertions and added two targeted tests for updated names and university rows.
4. `docs/home-micro-refinements.md` - this report.

All other pre-existing changes, including staged `.expo` removals, are preserved. The complete index and existing file hashes were snapshotted before editing; final preservation verification is recorded below. No commit, push, reset, clean, discard, or tracking change was performed.

## Automated results

| Command | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero warnings |
| `npm run test:baseline` | 5/5 |
| `npm run test:ui` | 6/6 |
| `npm run test:discovery` | 14/14 |
| `npm run test:application` | 24/24 |
| `npm run test:phase-d` | 37/37 |
| `npm run test:phase-e` | 36/36 |
| `npm run test:phase-f` | 16/16 |
| `npm run test:profile` | 53/53 |
| `npm run test:home` | 26/26 |
| **Total** | **217/217 tests passed**, zero failures/skips |
| `npm run check:dependencies` | Pass, up to date |
| `npm run doctor` | **21/21** |
| `npm run export:check` | Android and iOS Hermes exports pass |

The previous 215-test baseline is retained, with two added Home cases. Existing search, filters, university/Details routes, favorites across five screens, unsupported-claim prevention, time greeting, notifications, logout/continuation, application flow, and manager checks pass. Responsive component assertions cover widths 320/411/480/800dp at 100/130/200% text; they are not native layout measurements. No tests or diagnostics were disabled to obtain success.

## Android preparation and initial evidence

Unlike the previous stalled session, emulator-5554 responded. Actual baseline was **1080x2400 physical resolution, density 420, font scale 1.0, gesture navigation**. The existing Metro server on 8082 was reused; no server/emulator restart or destructive reset was needed. The initially running app still showed the previous Welcome greeting; a before screenshot was captured, then Expo Reload loaded the current source. An initial splash-only capture was replaced after confirming the loaded Home hierarchy; the final after screenshot shows the real screen.

Android confirmed: empty **Hey there!** header, saving temporary QA name **Thandi Student** and showing **Hey, Thandi!**, then changing it through the unchanged Personal Information flow to **Nokuthulamazibukomthembu Student**. Home immediately displayed the new first name, matching NS initials, and natural wrapping without ellipsis. Evidence includes `before-home.png`, `after-home-standard-100.png`, `saved-name-home.png`, and `updated-long-name-home.png`.

The detailed viewport results, restoration, navigation smoke checks, and remaining limitations are appended after native verification. All runtime screenshots/XML and command logs are stored in ignored `.expo/home-micro-evidence/`, outside tracked source directories. Expo exports are reported separately from native execution.

## Completed Android viewport verification

The current source was exercised on the existing Android emulator. Each combination below captured the greeting/header, carousel, and university section; confirmed a next-card preview; moved the next card left with a real horizontal swipe; and reached the complete Wits name and Johannesburg location. At two columns the first university row's native top/bottom bounds matched within one pixel. Existing single-column adaptation was used at 200% text or narrow width.

| Configuration | Resolution / density / logical width | 100% | 130% | 200% |
| --- | --- | --- | --- | --- |
| Standard phone | 1080x2400 / 420 / about 411dp | Pass | Pass | Pass |
| Narrow phone | 840x1800 / 420 / 320dp | Pass | Pass | Pass |
| Large phone | 1440x2880 / 480 / 480dp | Pass | Pass | Pass |
| Tablet | 1600x2560 / 320 / 800dp | Pass | Pass | Pass |

All 12 native XML snapshots contained the six accessible, clickable student tab targets, with their complete label bounds inside the corresponding targets. Screenshot spot checks included standard 100%, standard 200%, narrow 200%, and tablet 100%. Names/cities wrapped without ellipsis; university rows retained padding, icons, colours and shadows. Offscreen/carousel-neighbor clipping in screenshots reflects scrolling rather than lost content. Large-text content can exceed one screen and remains reachable by vertical scrolling. Scroll gestures responded; frame-rate smoothness was not quantitatively profiled.

The matrix's finally block restored and read back **1080x2400, density 420, font scale 1.0**. No navigation-mode change, physical-device setting change, emulator restart, ADB-server restart, or new Metro instance was used. Subsequent focused logout/navigation checks and their final restoration are recorded below.

Evidence: `matrix-results.log`; `standard-10/13/20-*`, `narrow-10/13/20-*`, `large-10/13/20-*`, and `tablet-10/13/20-*` PNG/XML pairs under `.expo/home-micro-evidence/`. Each prefix has header, carousel, and universities captures. The native matrix includes 36 screenshots; before/after and focused greeting/logout captures are additional.

A focused narrow 200% check saved the long QA name through the existing form and confirmed the complete **Hey, Nokuthulamazibukomthembu!** greeting with NS initials and no ellipsis (`long-name-narrow-200.png`). Ordinary saved/changed names were also verified at standard 100%; other matrix header captures show the neutral fallback after Android configuration changes recreated the in-memory session, as expected without persistence.

## Final native regression checks and restoration

At narrow 200% text, Log Out **Cancel** preserved the long greeting. Confirmed Log Out opened the existing Login screen; **Continue without signing in** returned to Home with **Hey there!** and the empty-profile avatar (`logout-login-narrow-200.png`, `logout-reset-narrow-200.png`). This demonstrates real session reset rather than an incidental configuration reload.

At the restored standard baseline, toggling the Campus View favorite changed the heart while keeping Home open. Opening its image reached the matching Campus View Residence Details screen. Returning and adding it back synchronized Favorites to its starting two saved records (`favorite-toggle-home.png`, `property-details.png`, `favorites-synchronized.png`). Selecting Wits opened the existing Explore listing containing Varsity Heights (`university-navigation.png`). Home was left open with the neutral greeting (`final-home-standard.png`).

City text top/bottom bounds additionally matched within one pixel in every tested two-column case: standard, large, and tablet at 100% and 130%. All remaining cases correctly use the existing single-column layout. University navigation/data were not modified.

The final device readback again confirmed **physical 1080x2400, physical density 420, font scale 1.0**. Gesture navigation remained unchanged. No physical device was touched. Temporary QA personal details were cleared by confirmed logout and favorite membership was restored.

## Remaining limitations and preservation

- Native tests ran in Android Expo Go on one emulator with simulated viewport/density changes, not four physical devices. No iOS simulator/device or TalkBack speech/focus-order test was performed. Landscape remains unavailable under the existing portrait configuration. Horizontal movement was verified, not a frame-rate benchmark.
- Very long first names deliberately make the header taller instead of shrinking/truncating the heading; the whole Home view remains scrollable. At enlarged text, portions of tall content and neighboring carousel cards naturally sit outside the current viewport.
- A pre-existing Home status-bar behavior remains: after scrolling the navy header away, light system icons can sit over light content. This was observed and left outside the three requested changes. The tab bar and safe-area implementation were not redesigned.
- Only the three intended existing files changed, plus this new report. Hash comparison found all unrelated pre-existing content unchanged; the complete Git index matches its initial snapshot, including both staged `.expo` removals. Staged and unstaged whitespace checks pass. Property data, PropertyCard, theme, provider implementations, unrelated screens, and dependencies are unchanged in this pass.

Stop after these three Home micro-refinements. No backend, authentication, persistence, or unrelated UI work was started.
