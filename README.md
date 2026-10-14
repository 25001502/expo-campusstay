# CampusStay

Expo + React Native + TypeScript student accommodation application.

## Technical baseline

Use Node 24 LTS (`.nvmrc`); the `engines` field lists supported Node versions.
Install from the committed lockfile without force or legacy peer flags:

```sh
npm ci
npm run typecheck
npm run lint
npm run test:baseline
npm run test:ui
npm run test:discovery
npm run test:application
npm run test:phase-d
npm run test:phase-e
npm run test:phase-f
npm run test:profile
npm run check:dependencies
npm run doctor
npm run export:check
```

`export:check` bundles Android and iOS and generates Hermes bytecode in ignored
`dist/`. It does not build native apps or demonstrate device execution.
Baseline tests exercise the actual startup component and navigation callbacks
with mocked native modules; they are not emulator tests.
UI component tests cover shared accessibility state, minimum touch targets,
status semantics, recovery states, and remote-image loading/failure behavior.
Profile/settings tests exercise local editing, document associations, menu
navigation, notification read state, FAQs, and the logout reset contract.
See [Profile & Settings refinement](docs/profile-settings-refinement.md).

The baseline retains Expo SDK 57. React/React Native and native modules follow
Expo's installed `bundledNativeModules.json` and compatibility checker.
TypeScript and React types follow the SDK 57 TypeScript template. Navigation
uses v7, required by Screens v4; nested-tab destinations are explicit.

| Package | Locked version |
| --- | --- |
| Expo | 57.0.28 |
| React / React Native | 19.2.3 / 0.86.3 |
| TypeScript / React types | 6.0.3 / 19.2.18 |
| Navigation native | 7.5.0 |
| Navigation native-stack / bottom-tabs | 7.20.0 / 7.20.0 |
| Screens / safe-area-context | 4.26.2 / 5.7.0 |
| Gesture Handler / SVG | 2.32.0 / 15.15.4 |
| Reanimated / Worklets | 4.5.1 / 0.10.1 |
| Expo asset / font / image | 57.0.19 / 57.0.4 / 57.0.5 |
| Expo splash-screen / status-bar | 57.0.10 / 57.0.1 |
| Slider / Picker | 5.2.0 / 2.11.4 |
| Babel preset Expo | 57.0.15 |
| ESLint / Expo lint config | 9.39.5 / 57.0.2 |
| Expo Doctor | 1.20.4 |

The app's splash animation uses React Native `Animated`. Reanimated and Worklets
remain aligned with Expo; `babel-preset-expo` configures their plugin automatically.
The custom fonts load behind a visible loading screen. Failure or a ten-second
timeout lets the normal screen flow continue with native font fallback.

Compatibility references:

- [Expo SDK 57 release and maintenance guidance](https://expo.dev/changelog/sdk-57)
- [Screens navigation support](https://github.com/software-mansion/react-native-screens#usage-with-react-navigation)
- [React Navigation v7 migration](https://reactnavigation.org/docs/upgrading-from-6.x/)
- [Expo Reanimated configuration](https://docs.expo.dev/versions/latest/sdk/reanimated/)
- [Expo ESLint configuration](https://docs.expo.dev/guides/using-eslint/)

## Development and device checks

```sh
npm start
npm run android
npm run ios
```

Use an SDK 57-compatible Expo Go client or development build. Android requires a
running emulator or connected device; iOS simulation requires macOS and Xcode.
If Android cannot reach a localhost Metro server, forward the selected port
with `adb reverse tcp:8081 tcp:8081` (replace both ports when using another port).
On Windows, if localhost binds only to IPv6 while the client uses IPv4, start a
private IPv4-preferred listener with:

```sh
node --dns-result-order=ipv4first node_modules/expo/bin/cli start --localhost
```

The app launches directly into the student Home tab without credentials. Profile Log Out
clears student session state and opens Login; Continue without signing in returns to Home.
Smoke-check
all six student tabs, Property → Apply → AppStatus, status links back to
Messages/Bookings, Compare/Chat/Notifications, and the separate Manager workspace with
Dashboard, Properties, Applications, Tenants, Analytics, and Settings.
Onboarding and authentication screens remain available as future integration routes.
Authentication, uploads, remote booking actions, manager actions, and external
messaging are not connected; current interactive state remains in memory only.

CI runs clean installation, strict typecheck, baseline tests, lint, Expo dependency
validation, and Android/iOS export. `.expo/` is local machine state and is not tracked.
