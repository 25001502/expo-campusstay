# Docker Desktop controlled per-user repair — 2026-10-22

**Outcome: registration was not restored. One attempt completed; no retry.** The installer exited with **code 3** and logged **“Existing installation is up to date”**. The missing discovery key remains absent. Docker startup was not attempted, so runtime recovery is not claimed.

## Preconditions

All gates passed before execution:

- The authoritative `VERIFIED-BACKUP.json` and recovery files exist at `D:\CampusStay-Docker-Recovery\20261022-205124-f4e272a2`. All **398 backup files / 3,133,433,602 bytes** were rehashed and matched the manifest. All 398 source files also matched their verified backup, including both original VHDX files.
- No Docker Desktop, backend, build, service or installer processes were running. `docker-desktop` was **Stopped / WSL 2**.
- The process ran as `MUDAU\mudau`, with a non-administrator token, in interactive session 3 alongside Explorer. `USERPROFILE` and `LOCALAPPDATA` were the expected normal user paths. No `RunAs` or system-wide installation was used. This verifies user/token/session; it does not establish that inherited AppData redirection is absent.
- The full original installer was **4.96.1.244132**, **651,120,048 bytes**, with a **Valid Docker Inc** Authenticode signature and SHA-256 `87950d4659b9485c664b37a375276d4fc7bb88f948ddcb81314b843424bfac32`.
- The existing per-user uninstall record pointed to `C:\Users\mudau\AppData\Local\Programs\DockerDesktop`, version 4.96.1/build 244132, `InstallType=exe`. The installed Desktop binary had the same version.
- Available space before the attempt was approximately **45.80 GiB on C:** and **310.16 GiB on D:**. The recovery folder's protected ACL allowed only the current user; the new diagnostic directory inherited that restriction.

## Single approved operation

Executed the existing full installer once, without elevation, using the same installation options as the original installation:

```powershell
Start-Process -FilePath 'C:\Users\mudau\Documents\GitHub\expo-campusstay\.expo\phase-h1-3\installation\Docker-Desktop-Installer.exe' -ArgumentList 'install','--user','--backend=wsl-2','--quiet','--accept-license'
```

The actual invocation additionally captured stdout/stderr privately, used the private diagnostic directory as its working directory, and monitored the returned process. A create-new attempt marker prevented accidental reuse of this attempt directory. Selected cloud/database and Docker target overrides were removed from the installer child's inherited environment without logging their values; user profile paths were not remapped.

Docker's [official Windows installation documentation](https://docs.docker.com/desktop/setup/install/windows-install/) documents these options and the per-user location. This is installation syntax, not a documented guaranteed repair mode. No force, overwrite, cleanup, installation-directory or service flags were supplied.

- Started: **19:20:31 UTC / 21:20:31 SAST**.
- Process exited: **19:20:38 UTC / 21:20:38 SAST**, about seven seconds later.
- Exit code: **3**.
- Current installer log: **“Existing installation is up to date”**.
- Captured stdout/stderr were empty; the native installer log supplied the diagnostic. Existing older success logs were distinguished by timestamp and were not treated as this attempt's outcome.
- Stopped on this result. No second invocation, uninstall, manual registry write, reset, reboot or Docker launch followed.

Private evidence is retained in:

```text
D:\CampusStay-Docker-Recovery\20261022-205124-f4e272a2\controlled-repair-20261022-211902-a67ad0ca
```

It contains pre/post hash and registration snapshots, the one-attempt marker, exit result, private captured logs and final outcome. Existing backup files and prior diagnostic evidence were not overwritten. No credentials or private configuration contents were printed.

## Post-attempt verification

| Check | Actual result |
| --- | --- |
| `SOFTWARE\Docker Inc.\Docker Desktop` | Still absent in HKCU/HKLM, both 32-bit and 64-bit views |
| Per-user uninstall registration | Unchanged; correct per-user directory and version; `NoRepair=1`, `NoModify=1` |
| Installed Desktop executable | Version 4.96.1.244132; signature valid; SHA-256 unchanged from the previously verified binary |
| Original data VHDX | Present; 1,657,798,656 bytes; matches verified backup |
| Original WSL system VHDX | Present; 100,663,296 bytes; matches verified backup |
| Recovery backup | All 398 file sizes/hashes unchanged; manifest hash unchanged |
| Selected original files | All 398 source sizes/hashes unchanged from the pre-attempt check |
| WSL distribution registration | Unchanged, including original VHD location; `docker-desktop` still stopped/version 2 |
| Settings and `.wslconfig` | Backed-up settings unchanged; 4 GiB RAM / 4 CPUs / 2 GiB swap limits preserved |
| Docker/installer processes | Zero after the attempt |

Original disk hashes remain:

```text
docker_data.vhdx
a1b1dbd70731f8a22b4d8dd6800bb309ff6ff954cfa046467139d373c3f89e84

ext4.vhdx
c0e1ffbf3737e4fb741972252c031457c142b9700ced41705be2896197b3ca58
```

The original disks remain in their previously verified Codex package-cache Docker WSL paths; no relocation, mounting, import or restoration occurred. Hash equality proves byte preservation, not filesystem health or a tested restore. Installer diagnostics were written; the preservation statements above cover the explicitly hashed files and observed registrations, not every Windows file.

## Remaining blocker and next step

The same-version installer recognizes the existing installation and declines to reinstall it; it does not recreate the missing discovery registration. The observed registration defect therefore remains unresolved. The launcher's original error was not rerun or independently disproved.

The next non-destructive diagnostic step is a read-only comparison from a **manually opened, non-elevated Windows PowerShell window outside Codex**: inspect the discovery key and per-user uninstall `InstallLocation`, then compare with these saved results. Earlier shell-assisted checks did not independently prove an escape from inherited AppData redirection. Do not rerun the installer as part of that comparison.

If the same key is absent there, seek Docker's supported per-user registration remedy using the sanitized version, exit code and diagnostic. No guaranteed in-place repair option has been established. Any further installer operation, bounded Desktop/Engine launch, data relocation or restore requires separate approval. Uninstall/reinstall remains unauthorized and can remove Docker data.

## Scope preservation

No Supabase services, images, migrations, integrations, cloud projects or credentials were touched. No Docker/WSL limits changed. No reset, cleanup, volume deletion, registry edit by hand, commit, push or reboot occurred. All **203 starting repository files**, the **Git index**, **`.env.local`** and **`.wslconfig`** passed content-hash preservation checks; only this report was added. The new report's whitespace check found no errors (Git emitted its existing LF-to-CRLF advisory). No application code changed, so application tests were not rerun.
