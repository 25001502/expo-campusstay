# H1.5B3 — Hosted security readiness and environment recovery assessment

Assessed **23 October 2026**. **Gate A only: investigation, documentation and offline checks.** No installation, repair, uninstall, registry write, service start/stop, WSL change, image download, migration execution, account/permission assignment, live query, backup/restore or deployment occurred. Neither CampusStay nor Mumus Property was contacted. The existing mobile environment and production admin denial remain unchanged.

## 1. Decision and recommended route

**Not ready for a Supabase runtime trial or live deployment.** The Docker Linux engine is unavailable, available host RAM is below the existing safety threshold, and the prepared integration runner/configuration is not B1/MFA-ready. A functioning container engine alone would not resolve the latter blockers.

The least destructive practical laptop candidate is **a separately approved Rancher Desktop installation using dockerd/Moby, Kubernetes disabled and the optional all-interface privileged service omitted**. Preserve the broken Docker installation, its WSL distribution, original disks and D: backup in place. Supabase lists Rancher Desktop as a Docker-API-compatible alternative, and Rancher documents Windows Home support and loopback-only exposure without that optional service. This is a supported candidate, **not a compatibility test result or permission to install it**. The current Desktop-specific test adapter must not be pointed at it unchanged. [Supabase runtime choices](https://supabase.com/docs/guides/local-development), [Rancher Windows installation](https://docs.rancherdesktop.io/getting-started/installation/), [Moby Docker API](https://docs.rancherdesktop.io/ui/preferences/container-engine/general/).

**Do not start that route under the current memory load.** First obtain sufficient headroom through user-controlled workload scheduling or an already available separate Linux machine. A dedicated Linux host is preferable for repeatable concurrency/recovery tests if one can be supplied at no additional charge; none was identified or accessed. A third hosted Free project is not available under the stated constraints. No alternative removes the eventual hosted-verification requirement.

Continue investigating the Docker registration defect through vendor guidance independently. Do not repeat the same-version installer, manually invent discovery keys or uninstall as a shortcut to staging.

## 2. Basis and evidence labels

Reviewed the H1.5 architecture package; H1.5A, B1 and B2 reports; H1.3 migrations, preflight/pause/staging/local-configuration/capacity documents; Supabase configuration and finalizer; shared contracts; prepared local/hosted test adapters; and the three Docker repair/backup reports. Earlier reports describe dated states and sometimes superseded base-only contracts. B1's forward migration and the two fingerprints below are the current local SQL sequence.

- **Observed:** fresh read-only command/file result during B3.
- **Historical:** retained report, log or prior test result; not rerun as a live assertion.
- **Hypothesis:** plausible explanation requiring further evidence.
- **Proposed:** future action or acceptance criterion; no approval is implied.

The user's manual visual review of Admin Sign In, Recovery and MFA is retained as UI evidence, not evidence of authentication, MFA or hosted authorization.

## 3. Fresh environment observations

| Check | Observed result |
| --- | --- |
| Windows | Windows 11 Home Single Language, version 10.0.26300 / build 26300; WSL reports 10.0.26300.9711 |
| User context | `MUDAU\mudau`, SID `S-1-5-21-1568050007-447478135-1051333106-1001`, 64-bit process; same SID as the user's prior ordinary PowerShell output |
| CPU/memory | Intel i5-13420H, 12 logical processors, about 15.71 GiB visible host RAM |
| Available RAM | Initial sample about **0.96 GiB**; three later samples at 14:22:44–47 UTC about **1.19 GiB**. Every observed sample was below the previous 1.5 GiB stop threshold |
| Disk | Approximately **37.94 GiB free on C:** and **310.16 GiB on D:** at the sample. D: capacity does not imply a new runtime will store its disks there |
| WSL limits | `.wslconfig` still **4 CPUs / 4 GiB RAM / 2 GiB swap**, gradual reclamation. Effective engine limits cannot be queried while the engine is absent |
| WSL version | **3.0.3.0**, kernel **6.18.54.1-1**; `docker-desktop` is the only enumerated distribution, **Stopped / Version 2** |
| Windows features/services | VirtualMachinePlatform installed; legacy Microsoft-Windows-Subsystem-Linux feature reported disabled. WslService and vmcompute running. No `com.docker.service` found; no change made |
| Virtualization interpretation | HypervisorPresent=true, while CIM CPU virtualization/SLAT fields report false. These observations do not prove firmware virtualization is disabled; do not alter BIOS/features on this evidence. Store WSL2 is present and the legacy feature's disabled state is consistent with WSL's WSL1 warning |
| Docker binaries | Per-user `C:\Users\mudau\AppData\Local\Programs\DockerDesktop`; Desktop/backend/maintenance installer **4.96.1.244132**, CLI **29.9.2**, all four signatures **Valid / Docker Inc.** |
| Other installation | No machine-wide `C:\Program Files\Docker\Docker` directory, Docker HKLM uninstall match, or Docker Appx package result was found in the inspected context. No competing installation was established |
| Docker state | No Desktop/backend/dockerd processes observed. One explicit local named-pipe `docker version` query exited **1**: client information returned, Server=null, Linux engine pipe not found. No Desktop launch was attempted |
| PATH tools | `docker`, `supabase`, `deno`, `psql` not found through PATH. Existing explicit Docker/CLI/Deno paths work for the read-only checks described below; absence from PATH is not absence of installation |
| Development ports | Required staging ports **55321, 55322, 55324** had no listeners; 55320/55328 also clear. Existing **127.0.0.1:3100** node listener and **127.0.0.1:5037** ADB listener were left untouched. Port 3101/8081 was not listening at that sample |

Docker's documented per-user WSL mode does not require its privileged machine service, so the absent `com.docker.service` is not independently a failure. Home is a Linux-container route; Windows-container/Hyper-V instructions must not be substituted. Exact support for this Windows build/channel still requires vendor confirmation before repair if relevant. [Docker installation modes and prerequisites](https://docs.docker.com/desktop/setup/install/windows-install/).

**Diagnostic limitations:** initial restricted CIM/WSL queries were denied. Selected read-only queries outside that sandbox then succeeded. Initial HKCU uninstall reads were access-denied, not proof of absence; the subsequent successful registry inspection below is authoritative for this execution context. The command batches' overall success codes did not erase individual denied results. No auto-review rejection required an unsafe workaround.

## 4. Registration mismatch and root-cause assessment

Fresh read-only registry inspection used explicit HKCU/HKLM 32-bit and 64-bit views and scanned Docker uninstall display names without using `Win32_Product` or running an installer:

| Location | 64-bit view | 32-bit view |
| --- | --- | --- |
| HKCU `SOFTWARE\Docker Inc.\Docker Desktop` | Absent | Absent |
| HKLM same discovery path | Absent | Absent |
| HKCU `...\CurrentVersion\Uninstall\Docker Desktop` | Present, version 4.96.1, correct per-user InstallLocation | Same |
| HKLM Docker uninstall matches | None observed | None observed |

The visible uninstall record still has `NoRepair=1` and `NoModify=1`. The user's prior normal non-elevated terminal found zero uninstall matches and no discovery key under the **same SID**. A fresh truly independent manual normal-terminal comparison was not available in B3; this task must not overwrite that contrary evidence with the Codex result. Agreement between both registry views makes an ordinary 32/64-bit-view difference insufficient to explain it.

WSL registration still points to the physical Codex package cache:

`C:\Users\mudau\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\Docker\wsl\main`

Selected Desktop settings there show `AutoStart=false`, `EngineTypeWindows=wsl2`, SettingsVersion=46. Current Python `GetCurrentPackageFullName` returned 15700 (no direct package identity); that does not establish escape from inherited package-related context. Prior file-handle diagnostics proved AppData resolution into this cache. Microsoft documents packaged desktop file/registry virtualization, so a merged/private registry view is a **plausible explanation**, not proven causation for either the view discrepancy or Docker's discovery defect. [Microsoft MSIX behavior](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes).

Relevant retained installer logs still contain one successful-installation marker and the later “Existing installation is up to date” marker. Only known non-sensitive phrase counts and file metadata were extracted; raw logs were not printed. Historical controlled-attempt evidence records exit **3**, one attempt and unchanged data. The local message explains why that attempt did not restore registration; no official guarantee that code 3 repairs registration was found.

| Hypothesis | Evidence and confidence |
| --- | --- |
| Per-user installation discovery/registration mismatch | Leading explanation: signed matching binaries and uninstall metadata exist, while the required discovery key does not. Explains the reported launch failure; exact installer/launcher defect remains unproven |
| Package-related virtualization or inherited context | Plausible: same SID but inconsistent uninstall visibility and package-cache data registration. Affects recovery-path safety. Direct package identity result alone neither proves nor disproves this |
| Interrupted installation or corrupt executable | Not established: original success log, valid signatures and historical working engine are contrary evidence. No current launch or filesystem-health test was performed |
| Conflicting all-users install, firmware fault or security-software deletion | Not established by the inspected records. No security-product configuration/detection history was changed or treated as confirmed cause |

Docker's issue tracker has a similar per-user missing-key report. It is corroborating user evidence, not vendor confirmation of this machine's cause or an endorsed registry fix. [Issue 14912](https://github.com/docker/for-win/issues/14912).

## 5. Recovery and environment options

All costs below are estimates/eligibility statements, **not spending authorization**. None was installed, provisioned or started.

| Option | Requirements / CLI fit | Cost and privileges | Data risk, backup/rollback and approval |
| --- | --- | --- | --- |
| **A1. Vendor-supported in-place registration recovery** | Obtain a documented remedy applicable to 4.96.1 per-user installation/context. Current install guide has no established guaranteed registration-only repair; existing same-version attempt was a no-op | No software fee expected for confirmed personal/educational eligibility; exact vendor procedure determines elevation/download needs | Lowest disruption if genuinely supported. Reverify backup and normal-context paths first. Approve the exact vendor steps separately; do not retry installer or invent keys |
| **A2. Controlled uninstall/reinstall/recovery** | Last resort, after vendor confirmation and a tested recovery package. Keep mode/version/path explicit; do not switch to MSI/all-users implicitly | Potentially $0 license; installation, registration, settings and process changes; elevation depends on chosen supported mode | Official EXE `uninstall --keep-data` exists, but its documented VM preservation is not a guarantee that every setting/WSL registration survives this context defect. Normal uninstall can destroy data. Requires explicit uninstall + install + restoration approvals, independent verified copies and tested rollback; not recommended next |
| **B1. Rancher Desktop + dockerd/Moby** | Supported Docker API candidate on Windows Home/WSL2; choose Moby, not containerd/nerdctl-only; disable Kubernetes. Pinned CLI/runtime adapter and network semantics need verification | $0 software candidate, existing hardware/bandwidth; download/install required. Vendor permits skipping optional privileged all-interface service; stop if chosen installer cannot honor the reviewed options | New independent runtime data/WSL resources, no Docker disk reuse. Review shims/context/PATH and named-pipe conflicts. Preserve Docker and its backup; no automatic destructive rollback/uninstall. Approve a pinned signed installer/options and narrowly scoped preparation first |
| **B2. Podman machine** | Supabase lists a Docker-compatible alternative, but existing Windows named-pipe, network/label/SQL guards are Desktop-specific | $0 software candidate; new software/VM resources; privilege/port behavior must be checked | More compatibility work than Moby for the current harness. Never infer Docker bridge/binding equivalence. New owned data only; preserve existing disks. Requires separate setup and adapter/network proof |
| **C1. Dedicated existing Linux machine** | Preferred stable concurrency/recovery platform if available: supported Linux, Docker Engine/Compose, pinned CLI, private network; run CLI on the Linux host, not an unauthenticated remote Docker TCP socket | $0 incremental infrastructure only if hardware/access already exists; otherwise unknown cost and unapproved. Installing Engine generally needs root/admin and changes host services | Does not touch this laptop's Docker/WSL data. Must inventory host ownership/data first; no package removal on a shared host. Dedicated volumes and backup; approve target/setup and later startup separately |
| **C2. New local Linux WSL2 distro / VM** | Fresh Ubuntu plus Docker Engine inside it can isolate its data from Desktop. WSL2/VM API routing, port binding and Docker behavior still require proof; Home excludes relying on client Hyper-V as a given | Software can be $0; downloads, distro/VM registration and possibly Windows prerequisites require approval. Same laptop RAM pressure remains | New distro only; never install into `docker-desktop`, unregister an existing distro or import old disks. Separate approved data root and rollback preservation; higher setup burden than the reviewed Windows Moby option |
| **C3. Remote Linux VM / CI runner** | Dedicated rootful Docker and sufficient RAM/disk; explicit ephemeral/durable storage and restricted networking. CLI runs inside the remote environment; SSH/tunnels and approved test-only targets | No known free allocation. Provider cost, quotas, storage/egress and runner entitlement must be confirmed before any action; root/container privileges may be required | Keep live credentials/users off the runner. Ephemeral jobs are poor sole recovery evidence unless artifacts/volumes are explicitly retained securely. Requires provider/target, budget and resource approval |
| **D. Independent hosted Supabase staging** | Best eventual managed-platform evidence; fresh independent project with synthetic data, separate keys, no live clone. No slot currently available under stated constraints | Free pricing lists two active projects. Pro starts US$25/month; additional compute/usage/tax can apply. No paid route approved | Do not pause/delete/upgrade either existing project or create another identity/org to evade quotas. A branch in either live project is not equivalent to independent staging. Requires a legitimately available slot or separately approved plan/budget and project creation |

Docker documents EXE `--keep-data` for preserving underlying VM resources during uninstall; it does **not** certify recovery of this installation's missing discovery key, all settings or package-cache registration. No uninstall was attempted. The retained whole-disk copy is not permission to risk its only source. [Documented flag](https://docs.docker.com/desktop/enterprise/enterprise-deployment/faq/), [uninstall warning](https://docs.docker.com/desktop/uninstall/), [whole-VM recovery guidance](https://docs.docker.com/desktop/settings-and-maintenance/backup-and-restore/).

The Linux option should use an officially supported distribution and Docker packages, with host firewall/port behavior reviewed rather than assuming published Docker ports obey generic host firewall rules. [Official Ubuntu Engine requirements](https://docs.docker.com/engine/install/ubuntu/). Current Supabase native-process runtime is not supported on Windows and provides less project isolation than containers; it is not a drop-in replacement for this pinned legacy-start workspace. Experimental/native migration is not recommended as a new variable here. [Runtime differences](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).

Hosted cost/limit basis: [Supabase pricing](https://supabase.com/pricing). No cloud quota, billing or project inventory was queried during B3; the no-spare-slot constraint comes from the user and prior work.

### Capacity and network conditions for any approved local route

- Current 0.96–1.19 GiB free RAM fails preflight. A conservative proposed entry target is **at least 5.5 GiB available host RAM** before a trial using the existing 4 GiB guest ceiling and a 1.5 GiB host reserve. This is a planning margin, not a measured minimum. Do not close Expo/emulator/apps automatically or change global WSL limits.
- Previous planning allowed up to roughly **2 GiB image transfer / 15 GiB incremental stack disk**, before a new alternative runtime's installation/VM/cache overhead. These are unmeasured allowances, not download totals. Recheck the exact pinned image manifest before download, add installer/VM expansion, and retain at least a proposed 10 GiB C: reserve. D: can be used only through an explicitly approved, supported new-runtime location, never the Docker recovery folder.
- Required services: PostgreSQL, GoTrue/Auth, PostgREST, Kong, Storage API, Edge Runtime and Mailpit. Studio, Realtime, analytics, imgproxy and pooling remain excluded for the initial trial. Realtime-specific revocation requires a later separately approved optional service; foreground/polling checks can run without it.
- Preserve the dedicated isolated workspace/identity and no-cloud environment allowlist. A new engine needs a reviewed explicit endpoint, not the user's global default context. No root app dotenv loading or hosted Management API fallback. Do not weaken target guards to make an alternative engine work.
- The prepared CLI publishes ports without an explicit host IP. Its dedicated internal bridge/loopback binding plan is still **unverified on a running engine**. Require actual inspect results, Windows listener observations, host/LAN IPv4/IPv6 reachability tests and confirmation that no other network is attached. Loopback protects network exposure, not access by other local processes.
- The pinned local database uses a fixed development bootstrap password. A safe listener boundary is mandatory. Do not silently add public port forwarding, remove internal networking or bypass Windows/Hyper-V firewall protections.
- Internal networking can block Edge dependency downloads. Prepare a reviewed cached/bundled dependency path and test it without adding unrestricted egress. No application functions were deployed or invoked here.
- One bounded trial only after approval; monitor guest/host RAM, swap, CPU, health, OOM, disk and network. Stop if host available RAM falls below 1.5 GiB, sustained guest use approaches the earlier proposed 3.3 GiB warning, swap grows dangerously, a service remains unhealthy or exposure differs. Those guest thresholds need calibration, not assumed reliability.

## 6. Configuration, migration and test-infrastructure readiness

### Exact migration sequence

| Order | File | Fresh SHA-256 |
| --- | --- | --- |
| 1 | `supabase/migrations/20261021135040_manager_verification.sql` | `6317d6fbc72b819b09d30523029c5f815b5ec6c409785c24ece29aecd89cf8ab` |
| 2 | `supabase/migrations/20261023130036_manager_review_security.sql` | `c50aef02608844863200e0188809395eee5f91cee4871743bd3c27d041a73ea0` |

Both are transaction-wrapped and intentionally non-idempotent. Neither declares `CREATE EXTENSION`; verify built-in UUID/JSON/Unicode-normalization functions and UTF-8 support on the target rather than installing an invented extension. B1 depends on base H1.3 objects, Supabase Auth helpers/roles and `auth.sessions(id,user_id,aal,not_after)`. Storage requires compatible `objects`/`buckets` columns and RLS already enabled. PostgreSQL operator privileges must support all intended DDL, definer ownership and locks.

The base migration creates the **private** `campusstay-manager-verification` bucket, 5,242,880-byte limit, PDF/JPEG/PNG MIME allowlist and restrictive object/bucket policies in its transaction. Do not manually create a competing bucket first. The private schema must not be Data-API-exposed; preserve explicit narrow grants and RLS on application relations. RPC permission checks must include PUBLIC/anon/authenticated/service-role inheritance and default EXECUTE, not only a list of named grants.

B1 replaces reviewer admission with AAL2/current owned Auth-session/active assignment checks; closes both legacy review/access RPCs in both ACL and rejecting bodies; adds private decision, access, note and security-event history. Only the four v2/note RPCs receive the intended authenticated execution, with ordinary access to new private helpers/tables revoked. Access-management scope is additional to reviewer admission. No reviewer/admin grant is seeded. The server-only proof finalizer remains its narrow exception; a server key is not evidence of a human reviewer session.

`finalizer_ready` defaults **false**. Paused draft saves, reservations/uploads, finalization, submissions/retries, review decisions and activation fail. Identity/RLS-protected reads and scoped investigation/suspension/revocation remain available for recovery. Readiness changes serialize with admitted RPCs through the existing locking design; already completed work and bytes already delivered are not rolled back.

**Failure recovery:** H1.3 and B1 are separate transactions, not an atomic two-file deployment. If B1 fails after base commits, keep readiness false, assignments absent and privileged client access closed; inspect before any retry. Do not mark a failed migration applied, edit history, use force/reset or re-run a committed non-idempotent file. A fresh approved synthetic test database is different from resetting retained data. There is no approved destructive down migration. Prefer containment and forward repair while retaining private evidence/audit, not dropping schema or restoring unchecked legacy functions.

### Current tooling and workspace

- Existing pinned **Supabase CLI 2.121.0** reports that exact version through `.expo/phase-h1-3/tools/node_modules/supabase/dist/supabase.js`; no executable at the older guessed `supabase/bin/supabase.exe` path is required. `start --help` and `stop --help` succeeded. `--network-id`, `--workdir` and exclusion options exist; `stop --no-backup` deletes volumes and `--all` spans projects, so both are prohibited in the proposed safe procedure.
- PGlite **0.5.11** is installed in the ignored tools workspace; historical SQL engine evidence is PostgreSQL **18.6**. Existing Deno **2.9.6** is present. Supabase JS remains **2.118.0**, Next **16.4.2**. No dependency was installed or upgraded.
- Prepared local TOML parses and byte-matches its template; identity/endpoint/link guards pass. Root and workspace have no `.temp/project-ref`. Workspace application migration/function directories remain empty and `private/integration-evidence.json` is absent. Root Supabase config only defines the JWT-checked finalizer; it is not a local-stack config or remote link.
- The current local template selects PostgreSQL major **17**; existing runners insist on exact **17.11 / 170011**, reflecting historical hosted evidence. A newer provisioned patch cannot be silently accepted. Record the actual supported managed/component versions and approve a compatibility assessment instead of pinning vulnerable software or upgrading live to satisfy a test.
- **MFA blocker:** template omits `[auth.mfa.totp]`; its retained generated configuration and current CLI documentation default `enroll_enabled` and `verify_enabled` to false. Real AAL2 tests need an explicitly approved staging-only MFA configuration and actual enrollment/challenge. Nothing was enabled here. [CLI MFA settings](https://supabase.com/docs/guides/local-development/cli/config).
- **Runner blocker:** local Docker transport still builds a nonexistent `C:\Program Files\Docker\Docker\resources\bin\docker.exe` path and pins the Desktop Linux pipe. A new runtime requires reviewed exact-path/identity/loopback guards, not a permissive fallback.
- **B1 blocker:** hosted/local suites still call legacy `cs_manager_review` / `cs_manager_set_authorization`, check only the base deployment, and lack real AAL2 fixtures and B1 decision/note/access-scope coverage. They must not run unchanged. Bind both migration hashes, functions/configuration, current Auth/Storage catalogs and v2 payloads in new evidence. Hosted target guard also needs an independently approved staging allowlist protecting **both** important projects, not only its historical CampusStay denylist.
- **B2 blocker:** no deployed trusted admin capability resolver, independent web-session admission or live SSR adapter exists. These are proposed interfaces, not B1 RPCs. Backend reviewer tests can proceed after their own gates, but cannot clear real web-admin access. Production `/admin/**` remains 403 and the disconnected auth endpoints remain unavailable.
- Edge source preserves `verify_jwt=true` plus server `getUser`, owner-scoped record/file access and narrow server-only finalization. CORS currently permits bearer-token requests from any origin without cookie credentials; it is not authorization. Test actual OPTIONS/POST, opaque API-key versus user-JWT behavior, signing algorithms and managed gateway/runtime versions. Do not disable JWT checking to make staging pass. [Edge authentication guidance](https://supabase.com/docs/guides/functions/auth).

## 7. Security verification matrix

Environment codes: **L** = genuine isolated Supabase service stack with real synthetic Auth users, not PGlite; **H** = independent hosted Supabase project; **F** = approved future contract implementation; **R** = separate recovery target. P0 blocks the relevant real privileged activation; P1 blocks its named production feature/operational acceptance. Neither means a new confirmed production exploit was found.

Historical PGlite (base **86**, B1 **143**) proves behavior against simulated catalogs/claims, not JWT cryptography, Auth, Storage HTTP or managed roles. B2 boundary tests use mocks. None of the real-service passes below exists yet.

| Test | Attack / failure | Expected result | Environment | Current coverage | Missing coverage | Required pass evidence | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Target isolation | Live URL/ref/DSN or inherited cloud key | Refuse before transport/mutation | L/H harness | Fresh offline guards pass | B1-aware alternate-runtime/hosted allowlist | Refused cases, explicit owned target, no fallback | P0 |
| Identity verification | Missing/forged JWT, wrong issuer/audience/signature, API key used as user | No private read or operation | L + H | Mock/Auth-boundary and simulated SQL | Real gateway/Auth issuance and rejection | Sanitized HTTP status + unchanged state for every credential case | P0 |
| Confirmed identity | Valid session for unconfirmed or banned/deleted account | Appropriate user admission denied | L + H; F for ban policy | Confirmation checks in source/mocks | Real confirmation, banning and deletion semantics | Own/cross-account negative results with real issued sessions | P0 |
| AAL1 / missing MFA | Active reviewer presents real AAL1 token | Cross-account reviewer reads/writes denied; owner-only rights unchanged | L + H | Simulated SQL and B2 mocks | Actual TOTP-enabled Auth | Genuine AAL1 issuance followed by denial, no assignment change | P0 |
| AAL2 positive | Enrolled/challenged synthetic reviewer | Only assigned scope succeeds | L + H | Simulated AAL2 acceptance | Real factor enrollment/challenge/session rows | Real AAL2 token, authoritative session/scope checks, valid scoped operation | P0 |
| Forged role / self-promotion | Student/manager edits metadata or sends admin flags | No new reviewer/admin/access scope | L + H | Fresh pure negative cases | Direct HTTP/RPC/table attempts | No assignment/audit/domain mutation; denied cross-account access | P0 |
| Capability separation | Reviewer lacks access-management scope | Review may pass; grant/revoke denied | L + H; F for general admin | B1 simulated; B2 capability mocks | Real assignments/RPC grants | Per-scope result and absence of unauthorized access change | P0 |
| Admin website admission | Verified Auth user has no admitted admin session or current permission | All real admin entry/operations denied | L/H + F | B2 mocks, fresh actual Proxy test; B2 historical production browser 403 | Resolver/SSR/admission implementation and real-session tests | Trusted per-request capability checks plus production negative HTTP results | P0 |
| Cross-account RLS | A reads B's case/doc/history/access or draft | No unauthorized rows or mutation | L + H | Historical PGlite, prepared base scenarios | Managed roles and B1 reviewer AAL2 | Real user-JWT REST/RPC results; owner/reviewer/draft matrix | P0 |
| Private object leakage | Anonymous/public/cross-owner/private URL access | No proof bytes or signed/public URL leak | L + H | Storage policy fixtures only | Actual Storage object serving/caching | Byte-level allowed-owner result and denied public/foreign requests | P0 |
| Reservation ownership | Upload to other case/path, upsert/delete or bucket-public change | Denied; previous proof intact | L + H | Simulated policies/base plan | Real Storage HTTP metadata/owner behavior | Object/hash inventory unchanged after negative requests | P0 |
| Finalizer validation | Foreign document, altered path/actor, invalid signature/size/MIME | Closed denial; no attachment | L + H | Mock handler and simulated SQL | Real Edge download + user scope + server RPC | Error status and before/after proof/revision/hash comparison | P0 |
| Server-key isolation | Browser/mobile gains key; user calls server-only finalizer | No key in bundle/log/response; ordinary caller denied | L + H | Source and B2 client-marker checks | Actual deployment secrets and public RPC ACL | Artifact/config audit, denial and no reflected secret values | P0 |
| Edge authentication/CORS | Missing/expired/invalid JWT or API-key-only request; OPTIONS | Unauthorized POST rejected; permitted preflight reveals no data | L + H | Mock headers/prepared scenarios | Managed gateway, SDK keys, browser CORS | Browser and HTTP results with platform JWT enabled and empty unauthorized side effects | P0 |
| Legacy bypass | Direct call to old review/access RPC, even after accidental grant in disposable test | Denied | L + H | B1 historical ACL/body tests | Real catalog/gateway role inheritance | ACL inspection and actual old-RPC rejection | P0 |
| SECURITY DEFINER / ACL | PUBLIC/default EXECUTE, private helper/table access, search-path shadowing | Only intended entry points; no privilege escalation | L + H | Static and simulated SQL | Target owner/managed role/default privileges | Catalog ACL/RLS/owner/search-path evidence + denied calls as ordinary users | P0 |
| Self-review / self-grant | Real reviewer reviews own pending case or changes own authorization | Denied | L + H | Historical PGlite | Real MFA/ownership records | Actual rejection with unchanged decision/grant/audit state | P0 |
| Revision conflicts | Stale submitted, access or note revision | Conflict; no overwrite | L + H | Historical B1 SQL | Multi-connection requests | One authoritative revision; rejected stale payload with no partial write | P0 |
| Retry/idempotency | Reuse request ID identically or with changed actor/payload | Exact replay returns historical result; mismatch fails; no regrant | L + H | Historical B1 SQL | Real retries after revocation/network failure | One decision/event/grant transition, current access stays revoked | P0 |
| Concurrent reviews | Two reviewers decide same submitted revision | At most one commits; loser cannot grant | L + H | Single-session simulation only | Real overlapping transactions | Two-connection barrier/timing evidence; one final decision and atomic audit | P0 |
| Duplicate submit | Two same-revision submissions | One pending application/event | L + H | Historical SQL/base scenario | Real concurrent HTTP requests | Stable IDs, exact final revision/event count | P0 |
| Audit atomicity / notes | Write fails mid-audit, or applicant reads/writes private note/history | Mutation rolls back; notes remain private/immutable | L + H | Historical B1 SQL | Managed rollback and RPC/table/read paths | Unchanged state on failure; no note text in owner/general audit projection | P0 |
| Pause behavior | Existing reservation/finalization/review/reactivation during pause | Writes denied; investigative reads/scoped revoke retained | L + H | Historical source/SQL; base suite needs B1 update | Real late pause and two-session lock ordering | Readiness commit timing, allowed recovery operations, unchanged denied-write snapshots | P0 |
| Session revocation | Reuse old AAL2 JWT after session removal/downgrade or reviewer deactivation | Sensitive next request denied | L + H | Historical B1 simulation/B2 fresh mocks | Real Auth sign-out/session events | Old token retained privately, rejection before expiry, current DB permission/session proof | P0 |
| Expiry and refresh | Genuine issued JWT expires; refresh races/revocation | Expired rejected, valid refresh cannot resurrect scope | L + H; F for SSR | B2 mocks; expired fixture guards | Actual elapsed expiry, refresh rotation, secure cookie chunks | Verified issuer/signature before expiry then rejection; safe refresh/deletion traces | P0 |
| Manager vs publication | Manager approved without property assignment/moderation | No listing publication or student-data access | F + L/H | Pure H1.5A future policy, no real property backend | Approved property/publication contracts | Real eligibility checks only when implemented; no fixture promotion | P0 for publication |
| Service containment | Wildcard/LAN binding, unexpected egress or memory/OOM | Stop owned trial; no public default-password database | L | Offline binding policy only | Running Windows/engine behavior and capacity | Actual host bindings, denied external reachability, health/OOM/RAM logs | P0 for trial acceptance |
| Recovery | Partial migration / lost file / failed restore | Fail closed, recover owned target without data loss | L/R; H/R for managed proof | Historical byte-copy/transaction tests only | Real restore and managed Auth/file compatibility | Independent backup, restored IDs/ACL/file hashes, observed RPO/RTO | P0 before deployment |

**What local testing can prove:** real synthetic GoTrue password/confirmation/MFA flows, cryptographic JWT issuance/rejection, PostgreSQL RLS/ACLs and locks, Storage HTTP ownership, local Edge authentication, byte finalization, transaction races and synthetic recovery for the exact pinned versions/configuration actually exercised.

**What it cannot prove:** managed gateway/Edge deployment and injected-secret behavior, live project's Auth/Storage schemas and grants, actual hosted signing-key rotation/settings, public HTTPS/cookies and email-provider delivery, hosted Storage/CDN caching/revocation, network policies, quotas, platform backups and restore-to-project behavior. Local Mailpit is not external email delivery; local service success is not a hosted pass. Local browser tests are not native iOS/Android/Safari evidence. Hosted verification eventually requires a separately approved independent project; neither important project is an acceptable substitute.

## 8. Backup and recovery requirements

### Existing Docker recovery set — not altered

`D:\CampusStay-Docker-Recovery\20261022-205124-f4e272a2` exists. Its `VERIFIED-BACKUP.json` still records **398 files / 3,133,433,602 bytes**, two disks and matching original/copy hashes from 22 October. Fresh metadata checks found all 398 destination files present with the recorded byte sizes. Manifest SHA-256 remained `f62d26a12c77961fdd1b50703ea9ae99f8ef3729813fa511dc11742e6bc6231f` across this assessment.

| Disk | Original exists / bytes | Backup exists / bytes |
| --- | ---: | ---: |
| `docker_data.vhdx` | 1,657,798,656 | 1,657,798,656 |
| `ext4.vhdx` | 100,663,296 | 100,663,296 |

Original disk paths and last-write metadata agree with retained stopped-source observations. **No fresh full-disk hash verification, mount, filesystem check or restoration drill was run in B3.** File presence/size and the historical verified manifest do not prove filesystem health or recoverability. No backup file was opened for writing, moved, overwritten or deleted.

Before any risky Docker reinstall, separately approve: rehash all sources/copies while stopped; independently preserve the installer/settings/registration paths and a second encrypted copy; use a sacrificial restore destination with enough disk; verify old/new path context; then demonstrate readable images/volumes in a controlled target without overwriting the originals or sole backup. Settings/WSL registration recovery is a separate concern from VHDX byte integrity. If a restore cannot be rehearsed safely without affecting existing registration, obtain a vendor-reviewed recovery path first. Uninstall is not an experiment to discover whether the backup works.

### Supabase deployment recovery — still blocked

No live backup/export or restore was authorized or performed. Do not assume Free provides usable PITR or a downloadable managed recovery point. Supabase recommends independent exports for Free projects, and database backups do not contain Storage object bytes. [Backup limits and scope](https://supabase.com/docs/guides/platform/backups).

Required separately approved procedure before any live deployment:

1. Re-inventory the chosen live project's managed versions, application migration history, Auth/user relationships, buckets/policies/functions, roles and external jobs through a new approved read-only preflight. The 21 October two-user/empty-application observation is historical, not a current backup guarantee.
2. Agree encryption/access controls, independent off-machine destination, secret custody, retention and acceptable RPO/RTO. A private D: copy alone is not off-machine recovery; custom-format dump compression is not encryption.
3. Export through existing approved TLS credentials, without resetting passwords or creating roles implicitly. Use compatible PostgreSQL dump/restore tools; `psql` is not currently on PATH. Capture consistent database/application/Auth coverage, role/grant definitions and migration history if present. A default application-schema dump alone is not proof that Auth identities, hashes, factors, sessions or managed encrypted data can be recovered. [PostgreSQL dump semantics](https://www.postgresql.org/docs/17/app-pgdump.html).
4. Preserve Storage file bytes separately with an encrypted ownership/path/hash manifest; capture bucket privacy/MIME/size/policies, Auth/provider/redirect/MFA configuration, Edge source/import map/lock/configuration, and secret names. Recover actual secret values only through approved secret custody, never this report or a client bundle.
5. Create a separate approved recovery target on compatible managed schema versions; disable external mail, webhooks and scheduled effects before restoration. Review a selective restore manifest. Do not replay raw managed Auth/Storage DDL, migration rows or all source grants blindly. Supabase's managed encryption-root-key handling needs its supported recovery procedure; stop if complete coverage cannot be demonstrated. [Managed backup/restore considerations](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
6. Drill first with synthetic data. Any later drill containing real account records needs its own privacy/target approval and must never become the functional test fixture environment. Verify stable UUIDs, identity/confirmation/password-hash equivalence privately, required MFA/encrypted-data behavior, FK/sequence/RLS/ACL parity, private object hashes and expected denial cases. Approved recovery-account login checks create recovery sessions and need explicit scope.
7. Record backup timestamps, warning-free exits, checksums, manifests, restore time and observed loss window. Successful recovery, not archive creation alone, clears Gate F. Full restore/target-switch/drop operations can lose post-checkpoint data and remain separate incident approvals.

After a later incident, first contain with readiness=false and wait for commit, retain investigation/revocation, independently restrict the finalizer if necessary, preserve evidence and favor secured additive-schema/forward recovery. No destructive down migration or automatic rollback script is prepared here.

## 9. Separate execution gates

Passing an earlier gate never approves a later one. **Only A is completed in B3.**

| Gate | Prerequisites | Proposed actions | Required evidence | Risk / rollback | State changes |
| --- | --- | --- | --- | --- | --- |
| **A — assessment** | Existing source/reports available | Read-only diagnostics, static checks, documentation | This report; fresh hashes, command outcomes and explicit gaps | Restricted failures remain limitations; no repair workaround | Only this new report |
| **B — environment setup approval** | User chooses route; adequate RAM/disk; verified backup/context; signed vendor release/options reviewed | Recommended alternate Moby runtime installation/preparation only; disable Kubernetes, omit all-interface service; preserve Docker; prepare separately reviewed engine guards and staging-only config/test adaptations | Exact installer/version/signature, affected files/registrations/resources, explicit engine identity and config/test diff | New install/WSL/context/shim changes; do not overwrite old disks, relax guards or uninstall on failure. Preserve diagnostics and stop. Reboot needs separate scheduling approval | Local software/config only after explicit B approval; no Supabase images, application SQL or cloud changes |
| **C — isolated runtime** | B evidence passes; distinct workspace/ports/network; no cloud inherited; fresh capacity preflight | Separately approved one bounded engine + reduced-stack capacity trial, approved image pulls/new owned resources | Seven healthy services, actual versions/digests, RAM/swap/CPU/disk/OOM, loopback/external-denial and internal-network proof | Stop only owned resources; preserve successful volumes/images. CLI may remove only a newly created disposable first-start volume on failure, requiring explicit acknowledgment; no pre-existing data cleanup | Local containers/network/volumes; no application migrations/users/functions |
| **D — migration isolation** | C accepted; exact target/both hashes/catalog preflight; verified synthetic checkpoint | Separately approved base then B1 execution; inspect actual tables/functions/ACL/RLS and migration history with readiness false | Both fingerprints/commits and post-schema/privilege assertions; historical files unchanged | Stop on collision/partial chain; transaction rollback where applicable; keep readiness false; no reset or ledger repair | Isolated application SQL only; no live changes or real-user copying |
| **E — real security testing** | D; B1-aware runner; staging TOTP, real synthetic users/assignments explicitly approved; Edge dependency/config readiness; F contracts where required | Approved synthetic Auth/MFA, private file, Edge and concurrency matrix; reviewer/access fixtures scoped to tests; leave readiness false afterward | Sanitized per-case real-service evidence plus hosted-specific passes on an independent project when available | Fixtures/uploads/assignments mutate isolated data. Retain artifacts; on failure pause/restrict owned target, no automatic deletion/retry. No live admin activation | Isolated local or explicitly approved independent hosted mutations; cloud not implied by local approval |
| **F — recovery exercise** | Approved backup destination/tools/target and restore manifest; E-style security checks | Synthetic recovery rehearsal, then separately approved real-data backup/recovery verification if required | Restore correctness, private hashes/ACLs and observed RPO/RTO; independent recoverable copy | Data export/restore is sensitive and stateful; no overwrite of originals/sole backup, no blind managed-schema replay | Approved recovery target/files only; live export requires separate explicit approval |
| **G — live deployment** | A–F applicable evidence accepted, no open P0, independently hosted verification, approved admin contracts and current live preflight | Present exact target, hashes, role/secret/readiness actions, cost and containment plan for separate deployment decision | User's explicit scoped approval and post-deployment negative/positive evidence | Live SQL/function/storage/config changes can be irreversible; pause/forward recovery first; restore only under incident approval | Live changes only after new explicit G approval; administrator assignment/login/submissions each require explicit scope |

**Exact next approval recommended:** authorize **Gate B alternate-runtime setup only**, conditional on reviewing a pinned official Rancher Desktop release/installer and confirming adequate resource headroom. Scope must include any new Rancher-owned WSL/data/registration/shim changes and the minimal engine-target/MFA/B1-runner preparation diff; exclude uninstall/repair of Docker, existing distro/data changes, global WSL-limit changes, Supabase startup/image pulls, SQL, functions, test identities/assignments and all cloud operations. Stop after installation/configuration verification, before Gate C. If the signed installer/options or isolation cannot meet those limits, return a revised plan rather than broadening approval. If an already available dedicated Linux host is supplied instead, approve that exact host/setup separately in place of this route.

No action in that proposed approval was executed. No paid resource, third project or live branch is proposed as an automatic fallback.

## 10. Validation and preservation

| Diagnostic/check | Actual B3 outcome |
| --- | --- |
| Restricted CIM / WSL state / selected HKCU access | Failed with access denied; not treated as absent installation/state |
| Read-only external-sandbox CIM, services, processes, ports, WSL and registry views | Succeeded; results and caveats recorded above |
| Installed binary metadata/signatures, safe settings/log extraction | Succeeded; no binary/installer was run except the explicit read-only Docker CLI query |
| Explicit local Docker Engine query | Failed, exit 1, named pipe absent; returned CLI 29.9.2, no server. No retry/start |
| Pinned CLI version, start/stop help; Deno version | Succeeded: 2.121.0 / 2.9.6; help only, no lifecycle invocation |
| Local workspace identity, unlinked target and TOML/hash checks | Passed; MFA and runtime-evidence omissions remain blockers |
| Root offline security/isolation tests | **84 passed**, zero failed/skipped: `node --test scripts/h13-local-staging.test.cjs scripts/manager-verification-hosted-guard.test.cjs scripts/manager-review-security.test.cjs scripts/security-boundaries.test.cjs scripts/shared-contracts.test.cjs` |
| Admin offline Auth/boundary tests | **61 passed**, zero failed/skipped: installed `tsx --test tests/auth-boundary.test.ts tests/auth-session.test.ts tests/auth-ui.test.tsx tests/shared-boundaries.test.ts` from `admin-web` |
| PGlite SQL runners / runtime integration / hosted tests / restore drill | **Not run**; prior PGlite counts are historical only |
| Vendor research | Docker install/uninstall/backup/keep-data, Microsoft MSIX, Rancher, Supabase runtime/MFA/Auth/backup/pricing and PostgreSQL docs reviewed. Supabase changelog Markdown retrieval failed and HTML retrieval timed out; no claim that every current changelog entry was cleared. One guessed Rancher docs URL returned 404; canonical vendor page was then used |
| TypeScript/lint/build/export/device suites | Not rerun: documentation-only phase, no app/config/dependency code changed. B2's prior passing results remain historical |
| Whitespace and preservation | New report checked; all **303 starting Git-visible files**, Git index, root cloud `.env.local`, `.wslconfig`, both migrations and dependency/lockfiles preserved |

Only `docs/phase-h1-5b3-hosted-security-readiness.md` was added. No existing source/report was modified, no backup or private configuration contents were printed, and no Git reset, clean, commit or push occurred. No Docker/Desktop/WSL application was launched, no existing listener or emulator was stopped, and production admin access was not enabled. **Stopped after assessment and recommendation.**
