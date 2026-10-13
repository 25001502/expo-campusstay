# UI Phase A foundation

CampusStay keeps its navy/blue palette, Outfit headings, Inter body text,
rounded cards, and existing navigation. Phase A adds reusable behavior without
changing application workflows.

## Tokens

`src/theme.ts` now exports:

- `Spacing` for the existing 2–32 dp spacing rhythm.
- `Typography` and `FontWeights` for common text roles.
- `TextColors` for readable primary, secondary, muted, link, inverse, and danger text.
- `StatusColors` for WCAG AA status foreground/background pairs.
- `ControlSize` for the 44 dp minimum target and 48 dp input height.
- `Interaction` for pressed, disabled, focus color, and focus width values.

Decorative brand colors remain available through `Colors`. Use semantic tokens
for text and state communication; do not replace decorative colors solely
because they are not suitable for small text.

## Shared components

`src/components/UI.tsx` includes:

- `Btn`: button role, inferred or explicit label, optional hint, and disabled,
  busy, and selected state. Disabled or busy buttons do not receive an action.
- `IconButton`: Ionicons-based functional control with a 44×44 dp target,
  required accessible name, optional hint, and selected/disabled state.
- `Input`: programmatic label, required communication, helper/error text,
  error announcement, autocomplete metadata, focus/error border, and optional
  password visibility control.
- `Badge` and `StatusBadge`: readable semantic colors and spoken status text.
- `ScreenHeader`: flexible centered title/subtitle, accessible back action, and
  optional trailing action.
- `EmptyState` and `ErrorState`: consistent headings, descriptions, and optional
  recovery actions.

`src/components/RemoteImage.tsx` provides a stable container, loading placeholder,
failure message, optional retry, accessible descriptions for meaningful images,
and an explicit decorative-image mode.

## Accessibility conventions

- Give every functional icon an action-based label such as “Go back” or
  “Add Campus View Residence to favorites”.
- Use `accessibilityState` for selected, disabled, and busy controls.
- Use `StatusBadge` when a label represents application, booking, or manager state.
- Give meaningful images a concise description. Mark purely decorative images
  with `decorative` so they do not add noise.
- Use `error` and `required` on `Input`; do not rely on a nearby visual label alone.
- Keep interactive targets at least 44×44 dp even when the visible icon is smaller.
- Keep layouts flexible and use `useWindowDimensions` for screen-dependent math;
  avoid module-level `Dimensions.get` in future migrations.

## Icon convention

Ionicons is the preferred family for functional controls because it is already
provided by Expo and covers navigation, favorite, notification, visibility,
retry, close, and common action icons. Existing Font Awesome tab and notification
icons remain until their screens are intentionally migrated. Decorative emoji
may remain where they are part of the current visual identity.

## Representative migrations

- Home notification control uses `IconButton`; a featured property uses `RemoteImage`.
- Explore favorite controls use accessible selected `IconButton` instances.
- Notifications uses `ScreenHeader` for its back action.
- Login demonstrates required/autocomplete/password visibility input options.
- Favorites uses `EmptyState`.
- Bookings and Application Status use `StatusBadge`.
- Onboarding demonstrates a full-screen `RemoteImage` state.

Remaining screen-specific cards, headers, icon controls, form validation,
responsive layouts, and workflow corrections belong to later UI phases. Phase A
does not claim app-wide accessibility compliance.
