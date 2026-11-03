# H1.3 — WSL 2 and Docker Desktop installation results

Installation record: 2026-10-21, Africa/Johannesburg. **Latest result, 2026-10-22: Docker Engine verification passed with the user's approved WSL limits. The empty backend was gracefully stopped afterwards. Supabase was not started.** The original startup failure and its evidence are retained below; see the dated follow-up for the resolved prerequisite and remaining capacity gate.

## Prerequisites and approvals

- Windows CIM and systeminfo confirmed **Microsoft Windows 11 Home Single Language, x64, build 26300.9711**. The older registry ProductName string saying Windows 10 was not used as the OS identity.
- CPU: **Intel Core i5-13420H**, 12 logical CPUs. Intel's official specification confirms VT-x and EPT support. Windows reports **HypervisorPresent=true**, and systeminfo explicitly says an active hypervisor masks the individual Hyper-V capability flags. The WMI false flags therefore were not interpreted as unsupported hardware.
- An elevated read-only feature check found **VirtualMachinePlatform already Enabled**, legacy **Microsoft-Windows-Subsystem-Linux Disabled**, and no component/update restart pending. No BIOS, hypervisor, security or optional-feature setting was changed by this task. The legacy WSL 1 feature was not enabled.
- Approximately **52.67 GiB** free disk space and **15.71 GiB** physical RAM were initially measured. Available RAM varied from 2.73 GiB initially to 3.97 GiB when work resumed.
- The user confirmed **personal or educational use**, matching Docker's documented free-license categories, and separately explicitly accepted the Docker Subscription Service Agreement and use of `--accept-license`. No sign-in, subscription, payment or cloud billing action was performed.
- Administrator diagnostics required a normal Windows elevation prompt. A later read-only package query was not executed because automatic approval review hit a usage limit; this was a review-system failure, not a finding that the query was unsafe. After the user resumed with credits, the required independent diagnostics succeeded. No rejected action was bypassed.

## Installed components and integrity

| Component | Actual result |
| --- | --- |
| WSL package | **3.0.3.0**, installed successfully by Microsoft's built-in `wsl --install --no-distribution --no-launch`; exit **0** |
| WSL architecture | `wsl --status` reports **Default Version: 2**. Package version 3.0.3 does not mean a different WSL architecture |
| Linux kernel | **6.18.54.1-1**, reported by `wsl --version` |
| Extra user distribution | None installed; Ubuntu was not requested. Docker later created its own necessary `docker-desktop` WSL 2 backend |
| Docker Desktop | **4.96.1.244132**, per-user installation, **wsl-2** backend; installer exit **0**, installation log says succeeded |
| Docker install location | `C:\Users\mudau\AppData\Local\Programs\DockerDesktop` |
| Docker CLI | **29.9.2**, build **a82e528**, verified with `docker --version` |
| Docker Compose plugin | **v5.6.0**, verified with `docker compose version` |
| Docker Engine server | Unverified at installation on 2026-10-21; **29.9.2 verified through the local Engine API on 2026-10-22**, as detailed below |
| Restart | No restart command was issued. Post-install component/update restart indicators were false; no restart was requested |

Docker was downloaded only from Docker's official server. Its downloaded installer SHA-256 **87950d4659b9485c664b37a375276d4fc7bb88f948ddcb81314b843424bfac32** matched the published 4.96.1 checksum and its Authenticode signature was **Valid**, publisher **Docker Inc**. Installation rechecked both before execution.

The direct official Microsoft GitHub MSI transfer was extremely slow; a curl diagnostic timed out after 120 seconds with about 3 MB. The original background transfer eventually completed during the interruption. Its SHA-256 **ae977286974255bd26bf925f00f40f5692c6b2084155cbc0563c09aea091f211** matched Microsoft's release digest and signature was **Valid**, publisher **Microsoft Corporation**. This MSI was **not executed**: Microsoft's built-in installer had already installed WSL successfully, and no redundant WSL installation was attempted.

Downloaded installers, the partial diagnostic download, helper scripts and results are retained in ignored `.expo/phase-h1-3/installation/`. The MSI helper is unused. Do not execute it merely because it is present. No installer/volume cleanup was performed.

Docker install arguments were exactly:

```text
install --user --backend=wsl-2 --quiet --accept-license
```

No `--always-run-service`, Hyper-V/Windows-container backend, Docker account, paid add-on or Supabase package installation was selected. The installer registered its normal per-user application integration/PATH/startup components; no unrelated development tool settings were edited.

## Actual startup verification and errors

1. CLI and Compose version commands passed. Desktop initially reported it was not running.
2. One start was attempted: `docker desktop start --timeout 60`. It returned exit **1**: **Docker Desktop is still starting: context deadline exceeded**.
3. One bounded follow-up check found Desktop status **running** and verified that `desktop-linux` targets the **local named pipe** `npipe:////./pipe/dockerDesktopLinuxEngine`. No remote Docker context or DOCKER_HOST override was adopted.
4. `docker --context desktop-linux info --format '{{json .}}'` did not return within the **12-second** diagnostic limit. The diagnostic killed only its own CLI query, not the backend. No Engine server version, health or container inventory was established.
5. `wsl --list --verbose` showed **docker-desktop / Running / 2**, proving that Docker's WSL 2 backend had launched. This does not prove Docker Engine/API readiness.
6. Available host RAM fell from 3.97 GiB before installation/startup to **1.45 GiB**, then **0.83 GiB**. No explicit OOM error was observed, so memory pressure is a measured concern, not a proven root cause of the API timeout. The initial VM log was empty and the backend log was minimal; no raw private log payloads were published.
7. To protect existing workloads, the newly started Desktop was gracefully stopped using **`docker desktop stop --timeout 30`**, exit **0**. A final `wsl --list --verbose` confirmed **docker-desktop / Stopped / 2**. The bounded post-stop Desktop status query timed out; it was not treated as a healthy-engine result. No force, removal, reset, global WSL shutdown or unrelated process termination was used. Available RAM subsequently recovered to **2.70 GiB**; free disk was approximately **43.22 GiB**. Both Windows restart indicators remained false.

No repeated start, engine restart, factory reset or test container was attempted. In particular, `docker run hello-world` was not used. No container creation commands were issued; a server-side container inventory could not be established because the Engine API check timed out.

## Original proposed limits — 2026-10-21

For a controlled future **engine-only verification**, propose a WSL 2 ceiling of **4 GiB RAM**, **4 logical CPUs**, and **2 GiB swap**, retaining page reporting. Consider gradual memory reclaim through the supported WSL setting. These are ceilings, not reserved capacity or proof that the full Supabase stack will fit.

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
pageReporting=true

[experimental]
autoMemoryReclaim=gradual
```

At the end of the 2026-10-21 task, no `%UserProfile%\.wslconfig` file existed or had been created. These settings apply to **all WSL 2 distributions**, so applying them required explicit approval and review for other WSL workloads. That approval and the actual configuration are recorded in the 2026-10-22 follow-up. No global shutdown, hypervisor/security change or emulator stop was used.

Before another engine attempt, arrange sufficient memory headroom while preserving active work; a conservative operational target is approximately **6 GiB available host RAM** for the proposed 4 GiB ceiling plus headroom. This target is a planning margin, not a vendor minimum. Recheck memory/disk immediately before use. If the real Supabase service set needs more than this ceiling, stop and agree a larger capacity budget or a reduced, explicitly reviewed service set rather than silently raising limits.

About **43.22 GiB** free disk remains after installation/backend initialization. Keep approximately **20–30 GiB** headroom for future images, writable layers and retained synthetic database/Storage volumes. Do not allocate the remaining disk to a new fixed-size VM or remove unrelated resources.

## Original readiness gates — 2026-10-21

**At the end of installation on 2026-10-21, local Supabase staging was not ready.** The required gates were:

1. Approve resource limits and establish memory headroom without disrupting existing development work.
2. Complete a controlled Docker Engine API/server-version check against the verified local Linux context. Desktop process status, WSL mode and CLI/Compose versions alone are insufficient.
3. Confirm local resource inventory without changing/removing anything, then obtain separate approval to create/start the isolated Supabase stack described in `phase-h1-3-local-staging-plan.md`.

Do not launch Supabase, copy credentials/users/documents, apply migrations, serve/deploy functions or assign reviewer permissions as part of finishing this installation. No Windows restart is currently indicated by the checked flags. If any subsequent installer or Windows operation requires one, stop and ask the user to schedule it first.

## Preservation

No Supabase project was contacted or modified. CampusStay and Mumus Property, cloud billing, Auth users, credentials, Storage, submissions and deployments remain untouched. No Supabase stack, migration, function, database reset, Docker resource deletion or volume wipe was performed. The Docker-managed WSL backend/data disk was retained after the graceful stop.

The existing 192 repository files and Git index were fingerprinted before resumption and retained. Only this installation report was added to the non-ignored repository files. Installation helpers/downloads/results are under the already ignored `.expo/` directory. No application code, dependency, environment file, Expo configuration, emulator setting, commit or push changed.

## 2026-10-22 — approved limits and successful Engine verification

The user resumed the unfinished verification. Read-only checks confirmed the installed versions remained intact, `docker-desktop` was stopped, no `.wslconfig` or local staging workspace existed, and no component/update restart was pending. Available host RAM had improved to **5.43 GiB**, with **41.64 GiB** free disk.

The user then explicitly approved creating `C:\Users\mudau\.wslconfig` with a 4 GiB RAM ceiling, 4 CPUs, 2 GiB swap and gradual memory reclamation, followed by **one** Engine verification attempt. Only `docker-desktop` was installed; all WSL distributions were stopped. The helper used exclusive CreateNew semantics, refusing an existing file rather than overwriting any user configuration. No shutdown/reboot was needed because WSL was already stopped.

Actual applied configuration:

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB

[experimental]
autoMemoryReclaim=gradual
```

Only the currently documented resource keys were written. The older proposal's explicit `pageReporting=true` line was omitted; the platform default was left untouched. The configuration applies globally to WSL 2, as disclosed in the approval request. File content was verified after creation. It contains no credentials or database endpoints.

| Fresh verification | Actual result |
| --- | --- |
| WSL package / mode | **3.0.3.0**, `docker-desktop` runs in **WSL 2** |
| Docker CLI / Compose | **29.9.2**, build a82e528 / **v5.6.0** |
| Single Desktop startup | `docker desktop start --timeout 90`, exit **0**, completed in approximately **10.6 seconds** |
| Memory guard | No critical-memory stop was triggered; initial available host RAM **5.59 GiB**, **3.96 GiB** at startup completion |
| Engine API | **Responding**, server **29.9.2**, OS type **linux**, operating system **Docker Desktop** |
| Target isolation | Explicit `desktop-linux` context, endpoint **`npipe:////./pipe/dockerDesktopLinuxEngine`**; no remote Docker host/context adopted |
| Running kernel | **6.18.54.1-microsoft-standard-WSL2** |
| Effective CPU / memory | Engine reports **4 CPUs**, **3.83 GiB** usable guest memory under the 4 GiB ceiling |
| Effective swap | Read-only `/proc/meminfo` in the already running Docker WSL distro reports **2 GiB**; no test container used |
| Resource inventory | **0 total/running containers, 0 images, 0 Docker volumes** |
| Host RAM at Engine verification | **3.10 GiB available**; no OOM error observed |
| End of check | Empty Desktop backend gracefully stopped with `docker desktop stop --timeout 30`, exit **0**; WSL confirms **docker-desktop / Stopped / 2** |
| Post-stop capacity | **4.53 GiB available RAM**, approximately **41.51 GiB free disk** at sampling time |
| Restart flags | Both checked Windows component/update restart indicators remain **false**; no restart performed |

**The Docker installation/runtime prerequisite now passes.** A fresh isolated Supabase stack has still **not** been created or started, and its fit within the 4 GiB ceiling has not been established. The current capacity is not a promise that the full stack will fit. Recheck headroom and agree the service/resource budget before separately approving creation/startup. No image pulls, test containers, local SQL migrations, function serving/deployment, synthetic accounts/reviewer assignments or live manager activation were performed in this check.

The previous API timeout is no longer reproduced under today's approved configuration and improved headroom. This does not prove its original root cause: no controlled comparison was made that isolates memory limits from other changes between sessions. No dependency/software upgrade, reinstall, factory reset or volume recreation was needed.

Evidence is retained in ignored `.expo/phase-h1-3/installation/`, including the reviewed proposal, guarded configuration helper, bounded startup/memory monitor, `engine-check-start-result.json`, private startup log and sanitized `engine-verification-result.json`. No raw credential/configuration payloads were logged. The diagnostic helpers are not automatic startup jobs; do not rerun the startup helper without approval for another attempt.

Only this existing report was updated in the repository. All other **192 existing files** and the Git index were preserved. The only external configuration edit was the explicitly approved new `.wslconfig`; Expo, the Android emulator, app dependencies, public/private app environment files, Supabase SQL/function sources, CampusStay and Mumus Property were untouched. No cloud project operation, billing change, credential change, commit or push occurred. No TypeScript/lint/app suite rerun was needed for this documentation and local-machine verification task; no app code was edited.

## References

- [Docker Windows requirements, per-user install and WSL backend options](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker WSL 2 backend and no user-distro requirement](https://docs.docker.com/desktop/features/wsl/)
- [Docker free-license eligibility](https://docs.docker.com/subscription-billing/desktop-license/)
- [Docker Desktop 4.96.1 release and checksum](https://docs.docker.com/desktop/release-notes/)
- [Microsoft WSL installation](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Microsoft WSL 3.0.3 release](https://github.com/microsoft/WSL/releases/tag/3.0.3)
- [WSL global resource settings](https://learn.microsoft.com/en-us/windows/wsl/wsl-config)
- [Intel i5-13420H virtualization/EPT specification](https://www.intel.com/content/www/us/en/products/sku/232173/intel-core-i513420h-processor-12m-cache-up-to-4-60-ghz/specifications.html)
