# CampusStay private session staging

This local Expo module uses the installed SDK 57 `ExpoModulesCore` dependency. It
adds no npm dependency or permission. Expo Autolinking discovers `./modules` by
default. Keep both JSON manifests in source control (the root JSON ignore rule
has narrow exceptions for them).

Android stages inside `Context.getNoBackupFilesDir()/campusstay-document-staging-v1`.
iOS stages inside private Application Support, sets and verifies
`isExcludedFromBackup` on the root, session and candidate, and applies
`FileProtectionType.complete`. A locked iPhone can make its files unreadable;
verify lock/unlock behavior on a real device. Neither platform implementation
provides application-level encryption or durable application persistence.

`initialize` sweeps only recognized, inactive session directories, refuses unknown
entries/symlinks and fails closed on cleanup failure. Live native module sessions
are protected from other module instances. `OnDestroy` attempts cleanup; after
abrupt termination residual bytes remain until the next successful startup.
There is no application recovery from disk. The native lock serializes startup,
commit and deletion; source reads stay outside it so a slow provider cannot block
Leave/Log Out. Native error results contain codes, never filenames,
paths or document content.

`stage` accepts a local source URI, opaque ID and supported MIME. It reads at most
10 MiB, checks actual source/copy sizes and signatures, reserves 1 MiB in its free
space preflight, syncs a partial file, then moves it to a collision-free final
name. Unknown Android provider lengths reserve the maximum file size plus the
reserve. Free space can change after preflight: ENOSPC remains authoritative.
Failed partial deletion is retried; further selections fail until cleanup works.
No external original is deleted. `remove` accepts IDs only, never arbitrary paths.

Build with the existing toolchain, without installing npm packages:

```powershell
node node_modules/expo/bin/cli prebuild --no-install --platform android --skip-dependency-update react,react-native
# Prebuild may update android/ios scripts; review that generated delta separately.
cd android
.\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=2
```

Use the appropriate architecture for a physical phone. The generated native
projects are ignored; this module is the reproducible source. Build iOS on macOS
with Xcode/CocoaPods. Expo Go cannot load this module: Home remains accessible,
but file selection reports that the installed CampusStay app is required.
