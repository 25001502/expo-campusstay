# H1.3 local Supabase staging — assessment and execution plan

Assessed 2026-10-21. **Assessment only. Docker/WSL installation, container creation, local-stack migration execution and integration-test mutations have not been performed.** CampusStay and Mumus Property were not contacted or changed. No cloud provisioning, billing change, deployment, role assignment, real-user import or live readiness change occurred.

## Decision

Local staging is a suitable next test environment, but **cannot run on the currently verified setup**. Docker Desktop/engine were not detected and WSL explicitly reports it is not installed. Installation and any required Windows-feature changes/reboot require the user's permission. No installation was attempted. Do not interrupt the Expo session or Android emulator to make room without permission.

## Environment evidence

| Item | Actual result |
| --- | --- |
| Docker | `docker` not on PATH; no installation found in standard system/per-user paths or uninstall entries; no matching running process/service detected. No engine connection or container/volume inventory could be verified without a client |
| Other container runtimes | No Podman/Rancher install entry detected; no alternative runtime was adopted |
| WSL | `wsl --status` and `wsl --list --verbose` exit 1: Windows Subsystem for Linux is not installed. The `wsl.exe` launcher alone is present |
| Supabase | Not on PATH; existing pinned **2.121.0** works at `.expo/phase-h1-3/tools/node_modules/.bin/supabase.cmd` |
| CLI startup limitation | Initial version/help invocation failed trying to write telemetry under the sandbox-protected user profile. Process-only `SUPABASE_TELEMETRY_DISABLED=true`, `DO_NOT_TRACK=1`, `SUPABASE_NO_UPDATE_NOTIFIER=true` allow version/help to succeed without changing profile settings. No elevated retry was made |
| CLI commands | Installed help verified for init, start, status, stop, functions serve, migration up/list, db query/lint, test db and gen signing-key. No lifecycle command was executed |
| Node / Deno | Node **25.8.1**; existing Deno **2.9.6** executable works directly at `.expo/phase-h1-3/tools/node_modules/@deno/win32-x64/deno.exe`. The npm Deno launcher returned exit 1 without output; no reinstall attempted |
| Native PostgreSQL client | `psql` not on PATH. Later local SQL access can use CLI `db query --local` or the isolated database container's psql, avoiding a host PostgreSQL installation |
| OS | x64, build **26300.9711**, DisplayVersion **26H2**, edition **CoreSingleLanguage**. Registry ProductName says Windows 10 Home Single Language; confirm the actual Windows edition/support status in Settings before choosing the Docker installer |
| Memory | Node OS API reports **15.71 GiB total**, **2.52 GiB available** at sampling time; 12 logical CPUs. This is insufficient headroom for an unmeasured full stack alongside existing workloads |
| Disk | Approximately **52.68 GiB free** on C: |
| Verification limits | CIM hardware/network queries were denied; performance-counter lookup failed. BIOS virtualization/SLAT and Windows optional-feature readiness remain unverified. `netstat` showed no TCP listeners in proposed 55320–55330 range at the check; recheck immediately before setup |

No Docker context/host overrides, Supabase access token, server URL/service key or database URL were present in the assessed shell environment. Only presence was checked; values were not printed. This does not prove there are no saved credentials in another process/profile. An isolated execution environment must explicitly exclude inherited remote configuration.

## Repository findings

- `supabase/config.toml` is explicitly **deployment-only**: one function entry/import map and `verify_jwt=true`. It has no local project ID, service ports, database version, Auth or SMTP setup. Do not run `init --force` over it or start the repository root stack.
- Exactly one application migration exists: `supabase/migrations/20261021135040_manager_verification.sql`, SHA-256 **6317d6fbc72b819b09d30523029c5f815b5ec6c409785c24ece29aecd89cf8ab**. It creates the H1.3 database objects, private bucket/policies, readiness=false row and Realtime publication entries. No real reviewer or approved manager is seeded. Preserve the source unchanged.
- `supabase/.temp` contains only `cli-latest`, not a project link. Do not copy `.temp`, `.branches` or remote profile state into staging.
- Existing `.env.local` contains the two public Expo configuration names and targets **existing CampusStay cloud**, not loopback. Its contents were inspected only through redacted classification. The file is ignored by Git and was not edited or loaded into tests.
- `.expo/` and private `.env` files are already ignored. A separate ignored workspace can live at `.expo/phase-h1-3/local-staging/`. It does not exist yet.
- `src/auth/client.ts` reads the normal Expo variables. `config/account.cjs` requires HTTPS and an `sb_publishable_` key, so a plain HTTP local URL currently fails app configuration. **Do not replace the existing .env.local or launch Expo against it for this task.** API/security tests can proceed independently later. Real mobile local testing needs a separately approved development-only local target guard/environment launcher; production validation must remain strict. Session/keychain isolation must prevent existing cloud sessions being reused with local Auth.
- `scripts/run-manager-verification-hosted.cjs` is deliberately **hosted-only**: exact `https://<ref>.supabase.co`, Management API SQL, hosted function metadata, asymmetric expired-token fixture and PostgreSQL 17.11. It cannot run unchanged against localhost. Do not relax its hosted safeguards. Prepare a separate local adapter/runner in a later implementation step.

## Isolated environment design — proposed, not configured

Use local project ID **campusstay-h13-local-staging**, unique Docker resources and a fresh workspace. Refuse setup if a matching project/container/volume already exists until its ownership and contents are reviewed. Never reset or silently reuse existing volumes. On future runs, verify workspace and resource identity and preserve synthetic test history.

| Service | Proposed host endpoint/port |
| --- | --- |
| API/Auth/Storage/Functions | `http://127.0.0.1:55321`; `/auth/v1`, `/storage/v1`, `/functions/v1/manager-verification-finalize` |
| Database | Host `127.0.0.1`, port **55322**; no password in commands/report |
| Shadow database | **55320**, reserved only; no shadow/reset/diff operation needed for the initial suite |
| Studio | `http://127.0.0.1:55323` |
| Local mail capture | `http://127.0.0.1:55324`; optional SMTP/POP host ports disabled unless needed, otherwise unique 55325/55326 |
| Optional services | Analytics, pooler, image transformation and debugging ports disabled initially where supported; reassign every enabled published port, including inspectors, rather than assuming only API/DB matter |

Generate the new workspace's config with the **existing pinned CLI**, then review its actual schema. Set database major version **17**; record actual PostgreSQL patch, image tags/digests and all service versions after start. A major-version setting does **not** guarantee live's 17.11 patch/build. If different, keep that difference explicit and review compatibility before drawing deployment conclusions. Do not upgrade either cloud project or attach an existing DB volume to a different image.

Keep Auth, Storage, REST, Realtime and Edge runtime enabled for security tests; keep confirmation enabled and anonymous sign-in disabled. Route mail only to the stack's local mail catcher, without external SMTP, SMS, OAuth or webhooks. Configure only local test redirect origins initially. Native custom-scheme callback tests require separate app/environment isolation later.

Expose public application API objects with explicit grants and RLS, never `campusstay_private`. Disable automatic broad table exposure where the installed config supports it; independently inspect actual ACLs/default privileges. Do not infer hosted exposure parity from local defaults. Keep the function's existing JWT verification enabled; never use `--no-verify-jwt` to make tests pass.

The reviewed migration alone creates `campusstay-manager-verification`, private, **5,242,880 bytes**, PDF/JPEG/PNG only. Do not seed/create the same bucket from local config or Studio. Capture a before/after bucket privacy/policy contract. File bytes remain in this stack's new Storage volume, with no external S3 connection.

Generate independent local credentials/signing keys; do not import hosted credentials, JWT signing material, Auth identities, documents or snapshots. The CLI's generated development keys are local secrets, not production credentials. Save startup/status output privately in the ignored workspace with restricted access; never paste raw output because it includes keys. Service credentials stay out of Expo variables and ordinary test output. Any private signing-key generation must capture stdout directly to a private ignored file, never the transcript.

Before test traffic, verify Docker publishes on loopback only or enforce an explicitly approved host restriction; URLs containing 127.0.0.1 alone do not prove interfaces are private. If installed CLI defaults expose ports on all interfaces, stop for an approved supported restriction instead of changing firewall policy silently. Do not publish Studio, mail capture, PostgreSQL or a Docker socket to LAN/Internet. Do not enable unauthenticated Docker TCP. A future Android emulator connection should use an explicitly guarded emulator-to-host endpoint/tunnel, not LAN exposure or modified emulator settings in this assessment.

The future **local runner** must allow only exact loopback API/DB endpoints and the approved project ID, reject remote hosts/redirects, verify Docker resource identity and actual database identity, and use only captured local keys. It must reject a linked project marker, Management API credentials/endpoints and inherited cloud/Expo environment values. Its container-side Edge URL must be the verified local gateway service on the isolated Docker network, not host 127.0.0.1 (which would mean the Edge container itself). Inspect only sanitized container environment/port facts: raw `docker inspect` can print secrets.

These are required controls for the next setup step, **not safeguards already implemented or runtime-verified**. The current app environment continues pointing to cloud and has intentionally not been repointed or launched.

## Execution sequence and commands — NOT executed here

### Gate L1: installation permission

Confirm Windows support, BIOS virtualization and Docker Desktop free-license eligibility. Docker Desktop is free for personal/education use and eligible small businesses; do not select a paid subscription or accept charges. The user must handle any license acceptance. Use official Microsoft/Docker installers only.

After explicit permission, the Windows prerequisite command is:

```powershell
# Administrator operation; may enable Windows features and require reboot.
# Not executed. Default installs a Linux distribution as well as WSL.
wsl --install
```

Review the install choices before proceeding; avoid an unnecessary distro if the supported installer offers an appropriate Docker-only setup. Obtain reboot permission and let the user save active work; do not reboot while Expo/emulator are in use. Install Docker Desktop from the official vendor with WSL 2 / **Linux containers**, then verify WSL version and Windows support. Do not change global WSL resource settings or unrelated Docker resources automatically.

### Gate L2: engine and resource inspection

Once installed/started with approval, these read-only commands confirm the local engine before any image pull or stack creation:

```powershell
wsl --version
wsl --status
docker context show
docker context inspect
docker version
docker info --format '{{.OSType}}'
docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
docker volume ls
docker network ls
docker system df
netstat -ano -p tcp
```

Require the expected **local Docker Desktop Linux engine**, not a remote Docker context/DOCKER_HOST. A successful client version alone is insufficient; server response is required. Review names/labels/mounts of any collisions without dumping credentials. Leave unrelated containers, volumes, networks and contexts unchanged. Recheck available memory/ports and license eligibility before approving resource creation.

### Gate L3: prepare/start one fresh workspace

The following commands are a template for an approved future setup. They do not constitute an executable end-to-end setup yet: stop after init to configure/validate ports, isolation and keys, and before start until all stated gates pass.

```powershell
$taskRepo = 'C:\Users\mudau\Documents\GitHub\expo-campusstay'
$taskCli = Join-Path $taskRepo '.expo\phase-h1-3\tools\node_modules\.bin\supabase.cmd'
$taskStage = Join-Path $taskRepo '.expo\phase-h1-3\local-staging'
$env:SUPABASE_TELEMETRY_DISABLED = 'true'
$env:DO_NOT_TRACK = '1'
$env:SUPABASE_NO_UPDATE_NOTIFIER = 'true'

# In a child process with cloud environment variables excluded.
# Refuse an existing directory; do not overwrite it with --force.
if (Test-Path -LiteralPath $taskStage) { throw 'Inspect existing staging workspace before continuing.' }
New-Item -ItemType Directory -Path $taskStage -ErrorAction Stop | Out-Null
& $taskCli --workdir $taskStage init
if ($LASTEXITCODE -ne 0) { throw 'Local initialization failed.' }

# STOP: configure the new config only, as specified above.
# Disable seed execution. Keep the application migrations directory empty
# for first boot so start cannot automatically apply H1.3 before inspection.
# Sanitize inherited remote settings; review bind/exposure behavior.

# Only after gates, safe resource limits, and explicit start approval:
# Output may contain secrets. Capture privately, never print the log.
& $taskCli --workdir $taskStage start *> (Join-Path $taskStage 'start.private.log')
if ($LASTEXITCODE -ne 0) { throw 'Local start failed; inspect private log, do not reset.' }
```

Do not use `--ignore-health-check`. Inspect sanitized health, mounts, bind addresses and engine/version facts; verify no Auth/application data was imported. Initial start may run bundled Supabase system migrations on its **fresh** database; H1.3 is intentionally absent until the next gate. A failed partial start is not permission to remove volumes or restart unrelated workloads.

### Gate L4: approved local migration/function/testing step

Once the fresh stack is verified and this mutation step is approved, copy **only** the hash-matching H1.3 migration and function sources/import map/lock into the staging workspace. Merge its existing function config, preserving `verify_jwt=true`. Never copy `.temp`, root `.env.local`, Auth data, documents or unrelated migrations. Check whether start already applied any migration before explicitly applying one; never replay it on a nonempty/previously migrated database.

Installed help confirms these local commands (using the variables above):

```powershell
& $taskCli --workdir $taskStage db query --local 'select current_setting(''server_version_num'') as version;'
& $taskCli --workdir $taskStage migration list --local
# After reviewing the only pending file, apply once without resetting:
& $taskCli --workdir $taskStage migration up --local
& $taskCli --workdir $taskStage db lint --local --schema public,campusstay_private --fail-on warning

# All functions are served by this CLI; workspace contains only the finalizer.
# Explicit private env file prevents accidental per-function .env inheritance.
# Use a separate approved terminal and private logs; keep JWT checks enabled.
& $taskCli --workdir $taskStage functions serve --env-file (Join-Path $taskStage '.env.edge.local')
```

Check every exit code before proceeding. `.env.edge.local` is a planned, not created file; only required local-only overrides belong there. Prefer CLI-injected local SUPABASE_URL and public/server keys after validating their origin. The handler already supports injected publishable/secret and legacy anon/service-role key names; never inject a hosted key.

Keep readiness false until local Auth, Storage privacy, gateway JWT checks, function execution and local-target guards pass. Then an approved local suite may create synthetic accounts/reviewer fixture and temporarily open **local** readiness for workflow tests, always leaving readiness false at the end. Retain synthetic data/history; refuse blind reruns or automatic destructive cleanup.

Use two independent real database sessions to test pause-lock ordering. Do not treat sequential PGlite checks as concurrency evidence. A future pgTAP port of the SQL assertions can use `test db --local`; **no pgTAP files exist now**. The PGlite runner's catalog/role bootstrapping must never run unchanged against a real Supabase database.

After tests, stop **only** the known project while retaining data:

```powershell
& $taskCli --workdir $taskStage stop --project-id campusstay-h13-local-staging
```

Never add `--all` or `--no-backup`. Do not run database reset, volume removal, system/volume prune, factory reset, WSL unregister/shutdown, remote link/login/push/deploy/secrets/config operations or any commands against CampusStay/Mumus Property. New volumes need explicit future deletion approval; this plan includes no deletion.

## Test coverage and readiness gaps

| Prepared coverage | Can run now | After approved Docker/local setup |
| --- | --- | --- |
| Domain/controller/UI/API contracts and finalizer handler cases | Yes, existing Node harness | Keep as fast regression layer; not native-device evidence |
| Migration/RLS/reviewer/readiness/storage-policy SQL assertions | Yes, existing PGlite with synthetic managed catalogs | Port assertions to real managed catalogs/auth identities; verify explicit grants, owner isolation and untouched baseline data |
| Student/manager metadata, cross-account reads, self-approval/reviewer denial | Harness/SQL assertions only | Actual Auth/REST/RLS tests with independent synthetic accounts and one explicitly designated synthetic reviewer |
| Private PDF/PNG/JPEG upload/download, anonymous/public/cross-owner denial, no overwrite/delete | Handler/policy simulations only | Real local Storage HTTP + byte roundtrip; size/MIME/reservation-expiry limits; no real documents |
| Finalization, draft/submit/revision/idempotency, correction and approval | Harness/SQL assertions only | Actual local Edge + RPC responses and authoritative reload; concurrent duplicate requests |
| Readiness-off decisions/finalization/activation; retained reads/revocation | Harness/SQL assertions only | End-to-end local data/audit snapshots plus two-session pause ordering and in-flight upload behavior |
| JWT denial, genuine expired tokens, CORS | Handler mocks/runner guard checks only | Real local gateway + handler Auth checks; local genuine expired session; asymmetric/JWKS compatibility must be verified rather than assuming hosted configuration |
| Manager revocation with existing JWT/Realtime/fallback polling | Harness/SQL assertions only | Real local Auth/Realtime API checks; later separately isolated app runtime tests |
| Confirmation/recovery emails | Not performed | Local captured mail verifies link generation/flow; never real outbound delivery |
| Hosted integration runner | Offline `--plan` and guards only | Requires a **separate** local runner replacing Management API SQL/deployment metadata checks; keep hosted target checks intact |

**Hosted behavior remains unverified:** managed gateway/JWT/secret injection and signing-key rotation; exact hosted PostgreSQL build/ownership/default privileges/extension behavior; cloud Storage backend, CDN, signed-link delivery and operational limits; internet TLS/DNS, CORS from a deployed browser origin, real SMTP deliverability and rate limits; provider provisioning/deployment permissions; regional latency, cold starts, quotas, backups/PITR and live recovery. Local native execution also cannot prove iPhone/Android flows without separate device testing. Local success reduces risk but does not establish hosted/production readiness or a live backup gate.

## Fresh checks performed

| Check | Result |
| --- | --- |
| Focused Node tests: `node --test --test-reporter=tap scripts/manager-verification.test.cjs scripts/manager-verification-hosted-guard.test.cjs` | **57 passed**, 0 failed/skipped; dependency mocks, no hosted requests |
| `node scripts/check-manager-verification-sql.cjs` | **79 passed**, PostgreSQL **18.6**, PGlite **0.5.11**, isolated in-memory synthetic catalogs; not PostgreSQL 17.11/Supabase service evidence |
| `node scripts/run-manager-verification-hosted.cjs --plan` | Passed; explicitly offline, no mutation/network execution |
| CLI version/help with telemetry disabled | Passed; **2.121.0**, no lifecycle/remote commands |
| `git diff --check` | Passed; existing LF/CRLF notices only |
| Docker/real local Auth, Storage, Edge, Postgres 17 integration | **Blocked/not run**: prerequisites missing |
| Typecheck/lint/exports/native smoke | Not rerun: this task changes only this planning report, not code/config/dependencies |

## Resource budget and approval needed

Planning estimate, not measured Supabase usage: allow roughly **4–6 GiB RAM**, **2–4 logical CPUs**, and **20–30 GiB disk headroom** for Docker/WSL images, writable layers, database/Storage volumes and growth; image pulls can consume several GiB of network traffic. A full stack can need more. Current 2.52 GiB available RAM is a stop condition until an agreed capacity plan leaves room for Windows, Expo and the emulator. Do not close applications, stop the emulator, edit `.wslconfig`, constrain unrelated workloads or silently increase swap/disk allocation.

Supabase local testing creates no cloud subscription/resource charges. Docker Desktop is $0 only when the applicable free-license conditions are met; if not, stop for a different approved option. Internet metering, disk and host resource costs are the user's existing resources, not a promise of zero operating cost.

Approval requested next: **install WSL 2 and Docker Desktop for Linux containers, conditional on free-license eligibility and supported Windows/virtualization, with reboot scheduled by the user.** Then reassess engine/resources before requesting permission to create/start the dedicated stack. Migration/function execution, synthetic reviewer setup and integration traffic remain a later local testing step; no hosted approval is implied.

## Official references checked

- [Supabase CLI setup, local runtime and telemetry](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase local configuration](https://supabase.com/docs/guides/local-development/cli/config)
- [CLI command reference](https://supabase.com/docs/reference/cli/supabase-start); installed 2.121.0 help takes precedence for available commands
- [Supabase changelog](https://supabase.com/changelog): reviewed relevant local/self-hosted gateway, database and Data API exposure changes; generic compose/self-hosted changes are not proof of the pinned CLI's generated stack configuration
- [Docker Desktop Windows prerequisites and installation](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Desktop free-license eligibility](https://docs.docker.com/subscription-billing/desktop-license/)
- [Microsoft WSL installation and reboot requirements](https://learn.microsoft.com/en-us/windows/wsl/install)

Only this planning report was added. Existing application/configuration/migration/environment files and the Git index were preserved. No packages installed, container lifecycle actions taken, Windows features changed, emulator settings changed, commits or pushes performed.
