# H1.3 single local capacity trial — stopped at engine preflight

Assessed 2026-10-22. The conditional trial was entered, but **no Supabase startup, image pull, staging Docker network/container/volume creation, migration, application function, test user or integration mutation occurred**. The single Docker Desktop startup command did not complete within its bound. Per the user's stop condition, startup was not retried.

## Outcome

**Reduced-stack capacity remains unmeasured.** This result does not establish that the laptop lacks RAM or that the Docker installation is broken. The blocker is the unsuccessful bounded Desktop launch/engine verification in this attempt's execution context.

| Requested evidence | Actual result |
| --- | --- |
| Reduced Supabase stack started | **No**; essential engine preflight did not pass |
| Healthy Supabase services | **None established**; all seven remained unstarted by this trial |
| Effective Docker CPU/RAM/swap | Could not reverify against the nonresponding engine; `.wslconfig` remains 4 CPUs / 4 GiB / 2 GiB swap, unchanged |
| Host RAM before initial checks | 4.62 GiB available, 15.71 GiB total |
| Host RAM at bounded launch | 4.440 GiB available |
| Lowest host available RAM | **3.846 GiB**, from 64 approximately one-second samples |
| Host RAM at monitor completion | 4.103 GiB available; later independent sample 4.17 GiB |
| Memory safety threshold | 1.5 GiB available; **not crossed** |
| Actual peak/steady Docker or container RAM | **Unavailable**, not inferred from host available-memory changes |
| Guest swap / CPU load / OOM state | **Unavailable** without an engine; no trial containers existed to inspect |
| Startup command duration | **65.039 seconds**, then the outer safety timer terminated the CLI process; no successful command exit |
| Image downloads | **0 image pulls issued**, no Supabase container images downloaded by the trial |
| Free disk at launch / later check | Approximately **42.94 / 42.93 GiB**; an earlier initial sample was 41.05 GiB, so changes between samples must not be attributed wholly to Docker |
| Local diagnostic files | About 31 KiB at the measured point; staging profile files about **11.43 MiB** logical size; no database/image footprint was created by a trial command |
| Port bindings | No listeners on **55321, 55322 or 55324** before or after the attempt |
| External exposure test | **Not performed**: no services were started; this is not a passing runtime loopback/isolation test |
| First-start automatic volume removal | **Not invoked**: no `supabase start` or volume creation occurred |

## Preflight that passed

- The dedicated `campusstay-h13-local-staging` workspace matched its reviewed config and identity manifest.
- No remote project link, version override, application migration, schema or function was present in its execution paths. The root deployment configuration was not used.
- The launcher used the fixed local Desktop Linux engine named pipe, not a remote Docker context.
- The staging environment allowlist and locally generated Auth credentials were validated; no app dotenv, production key, Supabase access token or cloud project reference was inherited.
- Required ports were free. No firewall rule, port forwarding, public exposure or network isolation setting was changed.
- The approved WSL limits were read and retained. Fresh engine-side resource/inventory verification was gated after successful Desktop startup and therefore could not pass.

## Attempt and diagnostics

The actual installed Docker executable is `C:/Users/mudau/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe`. The standard Program Files path assumed by the previously prepared integration adapter does not exist on this machine. This is a **separate future integration-launcher portability issue**; the capacity helper used the verified per-user installation path and did not edit the adapter or other existing source.

An initial monitor-helper invocation had an incorrect relative import and exited before any Docker call or attempt marker. That path was corrected. It was not an engine/startup retry. Exactly **one real Desktop startup command** was subsequently invoked:

```text
docker --host npipe:////./pipe/dockerDesktopLinuxEngine desktop start --timeout 60
```

The helper enforced a separate 65-second outer bound. The CLI produced no captured output and did not complete; the outer timer terminated it. The helper recorded a failed preflight and never proceeded to image downloads, engine inventory, network creation or Supabase startup. No global Desktop/WSL shutdown was issued.

This attempt used isolated staging profile variables and a dedicated Docker config containing only an empty auth map and the installed plugin search directory. The sanitized launcher help check succeeded beforehand. The profile may affect Desktop management/IPC or first-use behavior, but **that is an unverified explanation**, not a diagnosed Docker failure. No comparison startup with the normal Desktop profile was attempted because the user authorized only one bounded trial. No reinstall, reset, license reacceptance, settings change or second startup was attempted.

After the failure, one separately bounded, read-only engine query exited **1** without returning engine info. It did not time out and did not restart anything. WSL enumeration reported **docker-desktop / Stopped / 2**. Docker Desktop UI/backend processes remained present; the Linux engine did not respond at the checked endpoint. Their cumulative process CPU readings are not a steady CPU-load measurement. The exact reason for the failed Desktop command is not established by the retained diagnostics.

Private evidence is under `.expo/phase-h1-3/capacity-trial/`: the preservation baseline, isolated Docker profile, monitor helper, engine attempt marker, empty private startup log, memory samples/failure result, post-attempt engine result and preservation result. Staging profile caches are retained. No credentials or raw container environment were printed.

## Networking decision

The prepared dedicated internal bridge and per-network loopback binding approach were not weakened or replaced. Its documented driver option was rechecked against [Docker's bridge documentation](https://docs.docker.com/engine/network/drivers/bridge/#default-host-binding-address). No network was created because successful engine identity/resource inspection was an essential prerequisite.

Therefore Windows/Desktop forwarding, actual published host IPs, reachability through other host interfaces and internal-network behavior remain **unverified**. Empty ports while no stack runs cannot prove safe exposure after a future start. A future trial must establish those checks before accepting the fixed local database bootstrap credential's exposure boundary.

## Resources remaining and shutdown

- No staging service was launched, so there was no H1.3 container to stop and no staging network/volume to remove.
- No trial images or database volumes were created; automatic first-start rollback did not run.
- Existing Docker image/volume inventory could not be refreshed while the engine was unavailable. No deletion or cleanup command was issued, so do not mistake unavailable inventory for a confirmed empty global Docker installation.
- Docker Desktop UI/backend processes were left present; stopping Desktop globally or shutting down WSL was excluded. The Docker-managed WSL distro was stopped at the final check.
- Workspace configuration, generated local credentials, profile caches and trial diagnostics remain for inspection. No credentials are included in this report.

## Preservation and verification

All **200 starting repository files** match their starting fingerprints. None was removed. The Git index, cloud `.env.local` and `.wslconfig` hashes match their starting values. Only this report was added to the reviewable repository files; diagnostic helpers/evidence are ignored under `.expo/`. The student app, Expo configuration, emulator, both hosted projects, existing Auth users, application data and cloud billing were untouched. No commit/push/reset/prune/database cleanup occurred.

The bounded helper executed and its safety stop was observed. Read-only capacity/port/WSL checks and workspace identity/environment checks were performed. No app-code change was made, so TypeScript/lint/app tests were not rerun; prior results remain historical. Git whitespace checks for this report passed.

## Readiness and next boundary

The laptop is **not cleared for the integration phase by this trial**. Neither steady service capacity nor secure runtime networking was measured. Resolve the Desktop launch/management-profile issue through a separately authorized investigation, preserve the existing installation/data, and obtain fresh approval before any new startup trial. The local integration adapter's executable path also needs correction before later integration use.

No migration, function serving/invocation, test account/reviewer creation, private-file test or integration mutation is authorized or performed. Stop here as requested.
