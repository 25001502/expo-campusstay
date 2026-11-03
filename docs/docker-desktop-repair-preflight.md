# Docker Desktop repair preflight — 2026-10-22

**Read-only investigation completed. No installer or Docker startup was run. No backup, registry edit, WSL change, data deletion, resource-limit change or reboot occurred. Only this report was added to the repository.**

## Finding and likely cause

The leading diagnosis is a **per-user installation-discovery/registration mismatch**, rather than missing/corrupt executables or a proven interrupted installation. The reported launcher error names `SOFTWARE\Docker Inc.\Docker Desktop`; that key is absent from HKCU and HKLM in both registry views. However, contrary to the earlier finding, **HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop exists**, identifies version 4.96.1 and points to the correct per-user directory.

The original installer log records per-user installation, activation, product registration, validation and **“Installation succeeded”** on October 21. Earlier retained evidence confirms that Engine 29.9.2 subsequently worked. There is no retained evidence proving the missing discovery key ever existed, was deleted, or that installation was interrupted. Missing enterprise-policy/registry.json warnings also appeared in earlier working-backend logs; they do not independently establish this startup cause.

**Important context finding:** Windows read-only file handles resolve ordinary Docker AppData paths into Codex's MSIX package-local cache. WSL registration itself names that physical cache path. File redirection is proven; its contribution to the registry failure is **not** proven. Compare registrations and physical data locations in an ordinary, non-packaged Windows user session before attempting repair. Microsoft documents packaged-app file/registry virtualization, but that does not establish that this particular HKCU key was virtualized. [Microsoft explanation](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes)

## Installation, settings and data

| Item | Verified result |
| --- | --- |
| Installation | `C:\Users\mudau\AppData\Local\Programs\DockerDesktop` |
| Version | Desktop/backend/installed installer **4.96.1.244132**; CLI **29.9.2**; component manifest agrees |
| Integrity | Desktop, backend, CLI and installed installer all have **Valid Docker Inc. signatures** |
| Full retained installer | `.expo/phase-h1-3/installation/Docker-Desktop-Installer.exe`, **651,120,048 bytes**, valid signature, same version; SHA-256 `87950d4659b9485c664b37a375276d4fc7bb88f948ddcb81314b843424bfac32`, matching the previously verified official checksum |
| Installed maintenance executable | Same display filename inside the install directory, only **6,898,608 bytes**; do not confuse it with the full self-extracting payload |
| Registry | Per-user uninstall entry present; no corresponding HKLM entry; `NoRepair=1`, `NoModify=1`, `InstallType=exe` |
| WSL | Only `docker-desktop` registered; **Stopped / Version 2**; no `docker-desktop-data` registration found |
| Settings | Backend `wsl2`, auto-start disabled, onboarding recorded complete; no explicit CPU/RAM/swap or user-distro-integration override in the inspected settings store |
| Resource limits | `.wslconfig` unchanged: **4 CPUs / 4 GiB RAM / 2 GiB swap**, gradual reclamation |
| Space | Approximately **45.82 GiB free on C:** and **313.08 GiB on D:** |
| Running processes | Desktop UI/backend processes remain present despite the stopped WSL distro; a consistent cold backup is not yet established |

The physical Docker cache root confirmed through file handles is:

```text
C:\Users\mudau\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache
```

| Existing file beneath that root | File length |
| --- | ---: |
| `Local\Docker\wsl\disk\docker_data.vhdx` | **1,657,798,656 bytes** — about 1.544 GiB |
| `Local\Docker\wsl\main\ext4.vhdx` | **100,663,296 bytes** — 96 MiB |

Both files have valid VHDX header signatures. Their combined file length is **1.638 GiB**; this is not their virtual capacity or proof of filesystem health. Normal and package-local paths resolve to the same data-disk file identity, so do not double-count them as two backups. The registered WSL BasePath is the physical `Local\Docker\wsl\main` directory above. No disks were mounted, attached, compacted or inspected internally. Current image/container/volume contents remain unverified; the previous successful zero-resource inventory is historical.

Also preserve `Roaming\Docker` and `Roaming\Docker Desktop` beneath that cache root, `C:\Users\mudau\.docker`, `.wslconfig`, installation logs, the installed program directory, and the full installer. The separate staging profile `.expo/phase-h1-3/local-staging/profile` contains trial-created Desktop state; preserve it as diagnostics, without merging it into the real user profile. Check for additional unredirected Docker data from the ordinary Windows session before declaring the backup set complete.

## Is a non-destructive in-place repair supported?

**Not established.** Windows' registered Repair/Modify actions are disabled. Docker documents EXE per-user installation using `install --user` and selection of `--backend=wsl-2`; it does **not** document a guaranteed same-version registration-repair command in the installation guide. No `--repair`, `--force` or `--reinstall` option is proposed. Static installer metadata includes an “Existing installation is up to date” path, so rerunning the same version may simply do nothing. No installer was executed, even for help. [Official installation options](https://docs.docker.com/desktop/setup/install/windows-install/)

An open report in Docker's issue tracker describes similar per-user discovery failure and successful initial installation. It is corroboration, **not vendor confirmation of this machine's cause or an endorsed workaround**. [Docker issue 14912](https://github.com/docker/for-win/issues/14912)

## Backup plan — approval required, not performed

1. Gracefully quit Docker Desktop under the actual Windows user. Confirm its UI/backend processes have exited and `docker-desktop` remains stopped. Do not globally shut down WSL, unregister a distro or force-kill unrelated processes. If graceful quiescence fails, stop for review.
2. From a normal Windows user session, repeat read-only registry/path checks; identify any additional data outside the confirmed package cache. Do not move WSL registration or change the data root.
3. Create a private backup folder on **D:**, such as `D:\CampusStay-Docker-Recovery\<timestamp>`, outside the repository and MSIX package cache. Check destination permissions/encryption before copying: Docker settings/contexts can contain sensitive material. Copy both VHDX files and the settings/CLI/installation material listed above; record WSL BasePath and selected registration metadata. Do not export credential-manager secrets or upload diagnostics.
4. Verify source/copy lengths and SHA-256 checksums; hash the quiescent source again afterward and retain a private manifest. Do not overwrite an existing backup. A second recovery copy on another physical device is preferable; D: alone is not guaranteed protection from hardware failure.

The measured data/settings/CLI/program/full-installer set is approximately **6.3 GiB before copy overhead**, allowing for CLI hardlinks becoming separate backup files. Reserve **at least 10 GiB** on the destination and retain C: installation scratch space. Both drives currently have adequate capacity. Recalculate after the ordinary-session comparison; do not assume an expanded Linux virtual-disk capacity must be allocated for a byte-for-byte file copy. No backup exists from this task yet.

Docker specifically requires Desktop to be fully stopped before a whole-VM backup. Its standard WSL data backup must be adjusted to the **actual physical location found here**. [Official backup/recovery procedure](https://docs.docker.com/desktop/settings-and-maintenance/backup-and-restore/)

## Conditional installer repair and recovery plan

After verified backup and clarification of the discovery/context mismatch, obtain explicit approval before any installer attempt. Use the **full retained signed installer**, the same pinned version and the actual user's normal Windows session, not the staging HOME/APPDATA profile or a SYSTEM/all-users install. The documented installation syntax is:

```text
"<full signed Docker-Desktop-Installer.exe>" install --user --backend=wsl-2 --accept-license
```

This is a **conditional installation attempt, not a certified repair command**. Prior license acceptance is recorded; no paid service/sign-in or plan change is proposed. Do not run the smaller installed maintenance executable without its documented payload workflow. If the installer says up-to-date, requests uninstall, offers an upgrade, changes mode/data location, requires Windows feature changes or a restart, **stop rather than forcing a workaround**. Vendor confirmation may be necessary before proceeding at all.

An approved installer run could replace binaries, recreate shortcuts/CLI links, modify per-user registry/product/protocol/startup registrations and PATH, rewrite settings, and stop/restart Docker components. These are Windows changes, not read-only operations. A later bounded Engine verification would start WSL and may write runtime data; it also requires approval. Recheck backend/data paths, integration, auto-start/license state and the preserved 4/4/2 limits afterward. Do not silently recreate an empty data disk or repoint an existing WSL registration.

**Data-loss risk:** in-place installation is not proven lossless here. A changed execution context or data root could expose a fresh empty instance while leaving old disks elsewhere. A reinstall involving uninstall can destroy containers/images/volumes; Docker explicitly warns about that. **Uninstall, factory reset, WSL unregister, manual registry fixes and destructive reinstall remain excluded.** [Docker's uninstall warning](https://docs.docker.com/desktop/uninstall/)

If the attempt fails, stop and preserve logs and both old/new locations. Do not repeatedly reinstall. Restore the pinned version/settings/VHDX only from verified backup, with Docker fully stopped and a separately approved exact-path restoration plan. Never overwrite the only surviving disk or blindly import registry exports. Use Docker's documented same-location disk recovery where applicable; registration relocation or WSL re-import requires a separate reviewed procedure. No automatic rollback can be guaranteed from the current evidence.

## Exact next approval and preservation

**Recommend a backup-and-context-check phase only next:** approval to gracefully quit Docker Desktop, create a private checksum-verified backup on D:, and repeat read-only discovery checks in an ordinary Windows user session. **Do not approve an installer run as part of that phase.** Decide on a vendor-supported in-place attempt only after its preservation gates pass.

All **201 starting repository files**, the Git index, cloud `.env.local` and `.wslconfig` are preserved. Only this report was created. No repair/backup commands were executed, no new Docker process was started, no Supabase image/service or application operation ran, neither hosted project was contacted, and no commit/push/reboot occurred. Validation consists of read-only metadata/registry/log/file-handle/header checks and this report's whitespace check; no application tests were needed.
