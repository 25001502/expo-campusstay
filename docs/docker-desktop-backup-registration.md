# Docker backup and registration diagnostics — 2026-10-22

**Status: VERIFIED BACKUP COMPLETE.** Both VHDX copies and the selected settings/configuration files passed size and SHA-256 checks. After graceful shutdown failed, the user separately approved termination of only the six verified Docker processes. No installer, registry write, reset, deletion, WSL shutdown/unregister, Docker startup, Supabase action or reboot occurred.

## Destination and privacy

Created a new, non-overwriting recovery folder:

```text
D:\CampusStay-Docker-Recovery\20261022-205124-f4e272a2
```

Its NTFS ACL is protected against inheritance, owned by the current Windows user, with exactly one allow entry granting that user full control and inheriting to children. No other principal is granted access by this ACL. This does not prevent a Windows administrator from taking ownership and is not encryption.

The authoritative private manifest is **`VERIFIED-BACKUP.json`**, completed **2026-10-22 19:08:57 UTC / 21:08:57 SAST**. It records **398 verified files, 3,133,433,602 bytes (about 2.92 GiB)**. No existing backup was overwritten. D: uses NTFS and has approximately **310.16 GiB free after backup** (313.08 GiB before).

Earlier incomplete diagnostics and `BACKUP-NOT-COMPLETED.txt` are retained as history; the marker now includes an explicit completion update pointing to the verified manifest. They do not override the final verified result. `post-backup-verification.json` records the final permissions/process/disk checks.

## Shutdown and source results

The documented `docker desktop stop --timeout 30` command was attempted without `--force`. It did not complete and its own CLI process was terminated by a 35-second outer timer. No Docker backend was force-killed. The user then reported that the tray Quit option is unavailable.

The six processes identified before shutdown were:

| Process | PIDs |
| --- | --- |
| `com.docker.backend.exe` | 1028, 49088 |
| Docker Desktop launcher/UI | 9136, 24264, 48332, 50204 |

After the user's explicit additional approval, their names, installed executable paths, session and start times were reverified to prevent acting on recycled PIDs. Both source disks were held open exclusively for reading during termination. Only those six approved processes were terminated, at **19:01:06 UTC**. Final checks found **zero Docker Desktop/backend processes** and WSL `docker-desktop` **Stopped / Version 2**. No other process or WSL distribution was stopped.

Both canonical source paths begin with:

```text
C:\Users\mudau\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\Docker\wsl
```

| Source suffix | Destination under recovery folder | Source bytes | Destination bytes |
| --- | --- | ---: | ---: |
| `disk\docker_data.vhdx` | `disks\docker_data.vhdx` | 1,657,798,656 | 1,657,798,656 |
| `main\ext4.vhdx` | `disks\ext4.vhdx` | 100,663,296 | 100,663,296 |

For each disk, the source hash during copying, subsequent source rehash, and independently read destination hash all match:

```text
docker_data.vhdx
a1b1dbd70731f8a22b4d8dd6800bb309ff6ff954cfa046467139d373c3f89e84

ext4.vhdx
c0e1ffbf3737e4fb741972252c031457c142b9700ced41705be2896197b3ca58
```

Both opened for **exclusive read-only access** without forcing/unlocking them. Their sizes and last-write timestamps remained unchanged during the initial three-second probe, and both were subsequently held read-only/exclusively throughout the disk/settings backup run. Source last writes remained 2026-10-22 14:18:17.3494783 UTC and 14:18:17.2294946 UTC, respectively. Handles were closed afterward. Originals were preserved in place; no disks were mounted or modified. **Matching hashes establish byte-copy integrity, not filesystem/database health or a tested restoration.**

Settings/configuration backup results:

| Recovery subdirectory/file | Verified files |
| --- | ---: |
| `settings/desktop-settings` — actual Docker settings | 17 |
| `settings/desktop-ui-settings` — actual Desktop UI profile | 183 |
| `settings/docker-cli-profile` — `.docker` contexts/configuration/plugins | 24 |
| `settings/trial-profile` — isolated trial Desktop state, kept separate | 170 |
| `settings/wslconfig` — original global resource configuration | 1 |
| `installer/Docker-Desktop-Installer.exe` — retained full signed payload, copied only | 1 |

All 398 manifest entries, including the two disks, have matching source/destination sizes and hashes. Source files were reopened read-only and rehashed; no private configuration contents were logged. Settings source trees were checked for additions/removals during copying. No Windows Credential Manager secrets were exported. The installed program directory was not copied wholesale; the verified full installer and CLI/profile copies are retained for recovery. Trial state is not merged into actual settings.

The initial settings pass stopped on a **262-character Electron cache path**. Read-only checks proved the file existed through Windows extended-length paths; this was not a disk change, lock or hash mismatch. A continuation used long-path support and reverified existing copies without opening them for writing. Earlier failure diagnostics remain private. Helper timestamp/syntax validation errors were corrected before their guarded actions, and did not modify sources or cause hash failures.

The final ACL audit checked **491 filesystem items with zero exceptions**: only the current user's allow entry was present. Additional verification records inherit the same root ACL. A checksum-verified copy on D: is still not an independent off-machine backup; recovery has not been exercised.

## Read-only installation comparison

A restricted Python helper read selected installation metadata and physical path resolutions. It was first run from the Codex execution context, then launched once through Windows Shell automation without a visible window. Both results agree:

- `SOFTWARE\Docker Inc.\Docker Desktop` is absent in **HKCU and HKLM**, in both 64-bit and 32-bit views.
- `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop` exists, with Desktop **4.96.1**, build **244132**, `InstallType=exe`, `NoRepair=1`, `NoModify=1`.
- Its `InstallLocation` exactly matches the actual directory: `C:\Users\mudau\AppData\Local\Programs\DockerDesktop`.
- No corresponding HKLM uninstall entry exists; the inspected installation is per-user.
- WSL registration points to the canonical package-cache `main` directory above and names `ext4.vhdx`.
- Ordinary Docker data/settings paths still resolve to the package cache in both helper runs. The installed Desktop executable resolves to the normal per-user Programs directory.

`GetCurrentPackageFullName` returned **15700 / no package identity** in both Python runs. This alone does not establish that the second run escaped the inherited filesystem-redirection context. The Windows Shell launch therefore supplies a second matching observation, **not independently verified ordinary-session evidence**. No registry visibility difference was demonstrated. A manual read-only check from an existing Windows user terminal remains useful before installation changes.

The exact demonstrated mismatch is the launcher's reported missing discovery key alongside a valid per-user uninstall record and matching binaries/path. Per-user discovery/registration handling remains the leading explanation; registry deletion, interrupted installation and MSIX causation are not proven. The successful original installer log and earlier working engine remain relevant contrary evidence to a failed initial install.

## Repair approach, remaining risks and next approval

The backup gate now passes. The discovery failure remains unresolved, and an independent ordinary-Windows-context comparison is not fully established by the shell-assisted test. Prefer vendor confirmation of the supported per-user registration remedy. Do not manually create the missing key or change the WSL data location.

If the user chooses a controlled installer attempt, it requires **new, explicit approval** for exactly one run of the already verified full **4.96.1.244132** payload from the normal Windows user session, using the documented `install --user --backend=wsl-2 --accept-license` installation syntax. This is not a guaranteed repair command: it may report up-to-date and do nothing. Stop if it requests uninstall, upgrade, mode/data-path changes or reboot; do not force progress or use undocumented flags. Installer-driven binary/registration/settings changes and a later bounded engine launch would need authorization; neither occurred here.

Uninstall/reinstall can remove Docker data and remains unauthorized. A repair could also reveal a new empty data root instead of the existing package-local disks. Preserve the verified backup and original paths; any disk restore, registration relocation, WSL import or destructive recovery needs a separate reviewed plan. No automatic rollback or filesystem health guarantee is claimed.

## Preservation

The 202 starting repository files, Git index, cloud environment and `.wslconfig` are preserved; only this report was added. Authorized external changes are the private recovery folder/ACL, diagnostic files, verified backup copies and explicitly approved termination of the six Docker processes. No secrets or private configuration contents were printed. No application code changed, so no app tests/typecheck/lint were rerun. Report whitespace and preservation checks are recorded before final delivery. No installation, registry, live-project, reset, deletion, commit/push or reboot action followed verification. Stopped after backup and read-only diagnostics.
