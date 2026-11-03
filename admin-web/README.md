# CampusStay Admin Web — H1.4

Standalone **Next.js 16.4.2 App Router / React 19.2.3 / TypeScript** frontend. Uses synthetic records only. H1.3 remains undeployed and no administrative operation connects to Supabase. Do not deploy this application as a working administration service.

**H1.5B2 local foundation:** [implementation and security report](../docs/phase-h1-5b2-admin-authentication.md). Sign-in, recovery, MFA, expiry and sign-out presentation now accompany independently tested server-boundary primitives. The provider remains disconnected; `/auth/*` returns 503, production `/admin/*` remains 403, and no credentials are collected. The H1.4 inventory below describes the preserved synthetic dashboard, not enabled live authentication. There is still no Supabase SDK installed in this separate app.

## Run locally without Docker

From Windows PowerShell:

```powershell
cd C:\Users\mudau\Documents\GitHub\expo-campusstay\admin-web
npm ci
npm run dev:preview
```

Open **http://127.0.0.1:3100/admin**. `dev:preview` explicitly enables synthetic data, binds the server to loopback, and removes inherited Supabase, Expo public configuration and selected database target variables from its child environment. It does not read or change the mobile app's `.env.local`. No keys, accounts, Docker containers or Supabase services are needed.

Stop the terminal's own server with Ctrl+C. No automatic browser opening, native emulator, installation, deployment or remote mutation is involved.

`npm run dev` starts with access denied unless the private `ADMIN_MOCK_MODE=1` development flag is explicitly supplied. There is no guest/admin sign-in bypass. Do not copy `.env.example` to a production environment.

## Pages

| URL | Frontend experience |
| --- | --- |
| `/admin` | Synthetic statistics, pending queue, status distribution and recent example activity |
| `/admin/applications` | Search, status filter, date/name sorting and semantic application table |
| `/admin/applications/<id>` | Applicant and business information, evidence metadata, review history, local notes and confirmed preview decisions |
| `/admin/properties` | Example residence illustrations, indicative room data and disabled, separate listing moderation controls |
| `/admin/users` | Synthetic directory including students, applicants, active, suspended and revoked access examples; no account operations |
| `/admin/audit` | Filterable sample events and this session's preview decision history, with SAST timestamps |
| `/admin/settings` | Integration boundaries and reset of synthetic in-memory examples |
| `/sign-in` | Visual prototype with disabled credentials and sign-in controls |

All preview pages display **“Demo preview — no changes saved to Supabase”**. Review buttons require a reason and a separate confirmation. They modify one synthetic application in memory, append a preview history item and lock repeat decisions. They grant no real role, publish no property and send no notification. Internal notes are separate from the applicant-visible review reason. Reloading restores the synthetic baseline; nothing uses browser storage.

## Isolation and design

This directory has its own package manifest, exact direct versions, lockfile, node_modules, Next/Turbopack root, TypeScript, ESLint and CI workflow. It is not an npm workspace and does not hoist dependencies into Expo. The root TypeScript/ESLint exclusions and the narrow Metro block list keep the web tree out of mobile compilation and crawling. No mobile source, Expo package, lockfile, Android project or cloud configuration changes are required.

CampusStay navy `#0F1B2D`, blue `#2563EB` and existing neutral/status palettes are mirrored locally. Outfit and Inter font assets are copied from the existing installed font packages, with their OFL licenses retained. Fonts and the original example residence illustration are served locally. No remote asset/font requests are needed. Lucide icons, consistent cards, restrained shadows and rem-based spacing accompany a collapsible desktop sidebar and a modal mobile menu. Keyboard focus, Escape dismissal, skip navigation, accessible labels, horizontally scrollable table regions and reduced motion/transparency preferences are supported.

## Production is closed

```powershell
npm run build
npm run start
```

With the preview flag absent, production builds successfully and **every `/admin` route returns HTTP 403**. The disabled sign-in prototype remains accessible at http://127.0.0.1:3101/sign-in. The flag is rejected by the Next configuration in production build/server phases, including a misleading `NODE_ENV=development` override. It is never a `NEXT_PUBLIC_` variable. Cookies, query strings, browser state, user metadata and email allowlists confer no access.

Proxy performs the initial denial; a `server-only` guard independently checks the page and layout before rendering preview content. These are fail-closed placeholders, not implemented administrator authentication. The future data adapter rejects every operation. There is no Supabase SDK, service-role key, database connection, private document URL, Auth Admin API, server action or backend mutation in this app. Synthetic client fixtures must never be replaced with real private data as a shortcut around server authorization.

Headers restrict network sources to self, prohibit framing and forms, disable camera/microphone/geolocation and mark admin responses private/no-store. The preview's development CSP permits the evaluation needed by development tooling; production does not. The current Next rendering setup still permits inline framework scripts/styles; a future authenticated implementation should review nonce-based CSP alongside its session strategy.

## Prepared H1.3 interfaces

`src/lib/contracts.ts` models the reviewed **local** migration's application response, five statuses, evidence metadata, review command, reviewer projection, event projection and manager authorization states. It makes no live-schema assertion. Unit/type tests check compatibility with the existing mobile DTO and the local SQL review signature.

- Future review RPC: `cs_manager_review(p_application, p_revision, p_decision, p_reason)`.
- Decisions: `approved`, `needs_information`, `rejected`; every decision requires a reason, pending status, current revision, trusted reviewer, readiness and no self-review in the prepared backend.
- Application status, manager authorization and property publication remain separate concepts.
- Email is an illustrative identity projection, not an H1.3 application column. Reviewer labels also require an approved identity-read contract.
- Internal notes are local UI drafts; H1.3 has no private-notes field. Never send them as `p_reason`, which is applicant-visible.
- Drafts are included to demonstrate UI states. Existing reviewer RLS only permits submitted applications; do not broaden it to satisfy this fixture.
- Evidence is metadata only. No proof content, object path, signed/public URL or document-download adapter exists.
- Audit rows add a UI-only sample/preview outcome label; this is not a database outcome column or a durable security log.

`mock-data.ts`, `mock-adapter.ts` and the preview provider are separate from the rejecting `future-adapter.ts` and presentation components. Trusted admin authorization is still undefined; an H1.3 reviewer assignment must not automatically be treated as a platform administrator role.

## Verification commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:production
npm run test:browser
```

Typecheck generates Next route declarations first. Local browser tests use already installed Google Chrome; they do not download a browser. CI installs Playwright Chromium on its Linux runner. Browser tests start and stop only their own loopback servers. Screenshots/traces are ignored under `test-results/`.

Production mock rejection is also exercised against the actual Next configuration. Browser verification covers the status-changing journey, navigation, reset, no external requests/browser storage, 320/390/768/1440px widths at 100/130/200% root text size, narrow page layouts, production 403 and disabled sign-in. This is desktop Chrome with resized viewports, not physical-device or Safari verification. Loading/error components are render-tested; no artificial backend failure simulation or latency was added to the product.

## Dependency limitations

The runtime audit reports zero advisories at the time of verification. The full npm audit reports five high-severity **development-tool dependency findings** rooted in `braces` through `micromatch`, `fast-glob` and the official Next lint plugin/configuration. No safe matching-config fix was reported. npm suggested an inappropriate major downgrade; it was not applied. ESLint 9.39.4 also reports end of support; it is retained because the installed React/accessibility plugins do not declare ESLint 10 compatibility. Review the tooling stack before production engineering work; do not use force or legacy-peer-deps to conceal conflicts.

On this Windows/npm installation, `npm ls` exits successfully but labels two lockfile-recorded optional WASM packages (`@img/sharp-wasm32`, `@emnapi/runtime`) as extraneous. No peer conflict was reported. They were not promoted to direct dependencies or removed through broad cleanup.

## Next phase

Finish approved H1.3 staging/security validation, then separately design server-validated administrator identity, trusted bootstrap/revocation, session checks and permissions. Agree reviewer reads, pagination, safe private-document access, audit visibility, concurrency and error contracts. Implement a distinct listing moderation permission model. Only then replace the rejecting adapter under integration tests. Do not deploy, assign roles or connect privileged live operations as part of H1.4.
