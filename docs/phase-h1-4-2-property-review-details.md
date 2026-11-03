# CampusStay H1.4.2 — Full property review details

Completed 23 October 2026. Frontend-only enhancement of the existing `admin-web` application. H1.3 remains undeployed; no live data, privileged operations or Docker resources were accessed.

## Implemented experience

The existing property cards and search remain, with listing-status and manager-verification/access filters, readable status badges, derived declared-room totals and indicative ZAR starting rents. **View Details** now opens `/admin/properties/<property-id>` through the existing guarded Next.js catch-all route. Missing IDs show a recovery link to Property Reviews.

The responsive details page reuses the existing two-column design, shared headings, rounded cards, badges, history layout, focus treatment and modal styles. It includes:

- Property name, location, review status, submission date, responsible manager and revision.
- Full example address, description, accommodation type, non-deliverable example contacts, room total and starting rent.
- Separate manager verification baseline and authorisation state, plus a link to the existing manager application where available. The baseline scenarios are explicitly synthetic and do not change when an application decision is previewed.
- Cover illustration, additional local illustrations, selected thumbnails, full-image dialog, Previous/Next and arrow-key navigation, descriptive alternatives, Close/Escape focus return, and missing/failed-image fallback. These are illustrations, never presented as real accommodation photographs. No production/private media are fetched.
- Single and Shared Room cards with descriptions, declared occupancy/capacity, monthly ZAR prices, quantities, advertised furnishing, optional room illustrations and optional advertised funding claims. NSFAS compatibility is labelled an unverified claim. No Studio offering is introduced.
- Nine declared amenity categories with existing Lucide icons: Wi-Fi, security, electricity, water, parking, laundry, study, bathrooms and kitchen. Amenities are not inferred from illustrations or presented as verified facilities.
- A separate listing moderation panel, session-only history and manager-visible review feedback. Internal notes have an explicit **Keep property note in preview** action and remain separate from decision reasons.

The review panel follows the manager-review experience: six initially unchecked native checkboxes, meaningful manually entered reasons, inline errors and focus, a detailed native confirmation dialog, cancellation without mutation, and locked decisions after confirmation. Confirmation displays property, manager, proposed decision, reason and checklist summary. The prominent disclosure reads:

> Demo preview only — no listing will be published, no permissions will change and no changes will be saved to Supabase.

The dialog captures and consumes a single pending snapshot; the UI and pure adapter independently validate the target, revision, state, reason and approval requirements. Controls reset between property/revision forms. Completed confirmations are retained as detached session-only metadata. The dialog is height-bounded and scrollable; the six-item checklist, gallery and links wrap at enlarged text sizes.

## Synthetic records and routes

The original three property IDs, names, declared totals, starting prices and baseline review meanings are preserved. Three additional scenarios demonstrate blocked manager access.

| Route suffix under `/admin/properties/` | Property | Manager scenario | Rooms | Starting rent |
| --- | --- | --- | --- | --- |
| `property-oak` | Oak House Student Living | Naledi Mokoena · pending, no access | 24 | R2,200 |
| `property-hillcrest` | Hillcrest House | Lerato Molefe · approved, active | 18 | R2,400 |
| `property-acacia` | Acacia Student Village | Zanele Dube · approved, active | 12 | R3,500 |
| `property-courtyard` | Courtyard House | Sihle Example · suspended | 10 | R2,300 |
| `property-gardens` | Garden Court Rooms | Amara Example · revoked; no images supplied | 8 | R2,600 |
| `property-west-end` | West End Living | Mpho Khumalo · rejected, no access | 6 | R3,000 |

Acacia retains its **Published example** baseline and locked controls; it is not an actual publication. New approvals become **Approved in preview**, never **Published example**. Totals and starting rents are derived from each property's declared room records. Declared quantities are never labelled live vacancies. New room IDs are deterministic, distinct, property-scoped frontend identifiers; mobile room/application IDs are untouched.

The property provider is the single source of session property state. Overview's property queue count uses that same state. Existing Settings → Reset synthetic examples resets both preview collections. Full browser reload also restores the baseline. There is no browser persistence or service write. The old `sampleProperties` export is retained as a factory-derived compatibility snapshot for existing adapter isolation tests; UI code uses the provider.

## Manager-versus-property safeguards

Approval requires **both** approved verification **and** active manager authorisation in the synthetic manager scenario. Pending, rejected, suspended, revoked, approved-without-access and active-without-approval states are denied. A submitted manager application, selected intent or checked confirmation alone is insufficient. Application review previews do not assign manager access, change the property manager scenario or publish a listing.

Approval also requires available declared property image/room records, all six simulated confirmations, a reason of 20–2,000 trimmed characters with at least three distinct substantive non-placeholder words, and deliberate modal confirmation. Request changes and Reject require a meaningful reason and confirmation, but do not require the approval checklist or an eligible manager.

The pure adapter rejects production/non-preview execution, non-synthetic reviewers or targets, self-review, missing confirmation, stale revision and completed/repeated decisions. It rechecks manager eligibility against the current property when applying a decision, including a revoked manager after an earlier snapshot was prepared. It changes only the target's local review status, revision, history and preview metadata; manager access is preserved.

These are frontend safety controls, not authentication or production enforcement. A person modifying browser code/state can bypass client controls. Checklist selection and reason length prove neither authenticity nor truthful/sufficient review. No immutable/durable audit claim is made.

## Exact files changed

Seven existing files modified:

| File | Purpose |
| --- | --- |
| `admin-web/src/app/admin/[[...path]]/page.tsx` | Allows the guarded two-segment property detail route |
| `admin-web/src/components/pages.tsx` | Wires property list/detail, shared property queue count and combined synthetic reset |
| `admin-web/src/components/preview-context.tsx` | Mounts the independent property-session provider within the existing preview lifetime |
| `admin-web/src/lib/mock-data.ts` | Replaces the old shallow property snapshot with the typed synthetic factory snapshot |
| `admin-web/src/app/globals.css` | Scoped property layout, gallery, rooms, amenities, wrapping badges/links and filter styles |
| `admin-web/playwright.config.ts` | Includes the new property browser suite alongside existing preview regressions |
| `admin-web/tests/browser/production.spec.ts` | Adds production denial checks for existing, eligible and missing property detail URLs |

Fourteen files created:

| File | Purpose |
| --- | --- |
| `admin-web/src/lib/property-contracts.ts` | Frontend-only property, room, image, manager, checklist, decision and history types; no database/RPC schema |
| `admin-web/src/lib/property-data.ts` | Synthetic property scenarios and local media metadata |
| `admin-web/src/lib/property-review.ts` | Pure filters, totals, eligibility, reason/checklist guards and session-only decision transform |
| `admin-web/src/components/property-preview-context.tsx` | Session reducer/provider for property decisions and separate internal notes |
| `admin-web/src/components/property-list.tsx` | Existing card browsing with practical filters and detail links |
| `admin-web/src/components/property-detail.tsx` | Dedicated overview, manager state, gallery, rooms, amenities, history and notes |
| `admin-web/src/components/property-decision.tsx` | Listing checklist, reason validation, confirmation snapshot/dialog and locking |
| `admin-web/src/components/property-gallery.tsx` | Local image/thumbnail selection, lightbox, keyboard navigation and empty states |
| `admin-web/src/components/property-ui.tsx` | Shared listing/manager status badges |
| `admin-web/public/room-single.svg` | Local synthetic single-room illustration |
| `admin-web/public/room-shared.svg` | Local synthetic shared-room illustration |
| `admin-web/tests/property-review.test.tsx` | 33 focused domain, render, reducer, isolation and guard tests |
| `admin-web/tests/browser/property.spec.ts` | 24 local browser workflow and responsive-layout tests |
| `docs/phase-h1-4-2-property-review-details.md` | This implementation report and manual testing guide |

H1.4.1's manager review component, validation helpers, contracts and focused tests are unchanged. No package manifest, lockfile, mobile source/configuration, SQL migration, credential file, Docker/WSL configuration or recovery backup was modified. All 257 starting Git-visible files remain present; only the seven listed existing files changed. The Git index and root cloud `.env.local` hashes remain unchanged. No reset, cleanup, commit or push was performed.

## Actual checks

| Check | Actual result |
| --- | --- |
| Admin `npm run typecheck` | Passed; Next route generation and strict TypeScript |
| Admin `npm run lint` | Passed, zero warnings |
| Admin `npm test` | **77 passed**, zero failed/skipped: 44 existing + 33 focused property tests |
| Admin full development browser suite | **55 passed**, zero failed/skipped: 31 existing + 24 property tests |
| Targeted correction recheck | **3 passed** before the final full browser run |
| Admin `npm run build` | Passed; production build completed |
| Admin `npm run test:production` | **12 passed**, zero failed/skipped: 11 admin URLs return 403/private-no-store; sign-in remains disabled |
| Existing local auth/verification/hosted-target guard/Metro isolation tests | **165 passed**; no hosted integration calls |
| Whitespace/diff checks | Passed for tracked work and every task file, including untracked files |
| Preservation comparison | All starting files retained; index, root cloud configuration and unrelated existing file hashes unchanged |

The existing local regression command was:

```powershell
node --test --test-reporter=dot scripts/admin-isolation.test.cjs scripts/auth-h1.test.cjs scripts/auth-journeys.test.cjs scripts/auth-storage.test.cjs scripts/auth-ui-links.test.cjs scripts/manager-verification.test.cjs scripts/manager-verification-hosted-guard.test.cjs
```

Browser tests used the installed desktop Chrome against loopback only. The already-running CampusStay development server was verified and reused using an ignored test configuration, without terminating it or changing its configuration. The production test server was managed by Playwright and stopped afterward. No dependencies or browser packages were installed.

Coverage includes list navigation, direct detail routing, search and combined filters, rooms/facilities, thumbnails/lightbox/keyboard focus, image-empty state, manager access states, approval gating, placeholder reasons, Cancel/Escape, internal-note separation, local-only history and status updates, locking, record isolation, reset/reload, application-versus-property independence, missing records and illustrative published examples. The focused decision journey observed no non-loopback requests, mutation requests, localStorage or sessionStorage writes. Static tests reject network/privileged-client/persistence calls in the new property modules.

Property layouts were exercised at **320, 390, 768 and 1440 CSS px**, each with **100%, 130% and 200% root text**. Tests assert actual computed font size, content/checklist/room/amenity containment, narrow page width, dialog bounds, reachable confirmation, image-preview containment and focus return. Visual inspection covered desktop details/cards and the phone decision panel. Evidence and the temporary local test configuration are preserved under ignored `.expo/phase-h1-4-2/`.

The first property browser run found two issues: a test selector used raw nested-label text instead of the combobox's accessible name, and the manager-application link overflowed at 320px/200% text. The selector now uses the semantic combobox role; the scoped property link wraps. The correction recheck and full final suite passed. The pre-existing wide/200% account-header overflow described in H1.4.1 remains outside this property enhancement; wide tests ensure the new controls/dialog add no overflow. Next development mode can still emit an image LCP/loading recommendation for the reused illustration; it is not a production build failure.

## Production security verification

Existing proxy, server-only rendering guard, development-only opt-in, production build flag rejection, CSP and disconnected future adapter are preserved. Production tests attempted property list/detail and missing IDs with `?ADMIN_MOCK_MODE=1`; they still received HTTP 403 and private/no-store responses. A query parameter cannot enable preview. The sign-in form remains disabled. No service-role credentials, real administrator identity, SQL, role assignment, Supabase property records, document access, notification or publishing operation was introduced.

## Manual browser instructions

1. From `C:\Users\mudau\Documents\GitHub\expo-campusstay\admin-web`, use the existing preview at `http://127.0.0.1:3100/admin/properties`. If no server is running, run `npm run dev:preview`. Do not start a second server on the occupied port. Docker, Supabase credentials and authentication are unnecessary.
2. Search by name, location, address or manager. Combine **Listing status** and **Manager verification / access**; clear filters after an empty result. Confirm the original Oak/Hillcrest/Acacia cards, declared counts and starting rents remain.
3. Open **Hillcrest House → View Details**. Inspect overview, manager baseline/access, gallery thumbnails and full-image preview. Use arrow keys/Previous/Next; Close or Escape should return focus. Inspect Single/Shared capacities, room quantities, prices, furnishing/funding claim and nine amenity categories.
4. Try Preview approve listing with blank, short or repeated placeholder reasons. Enter your own specific reason; all six confirmations must still be required. Use Tab/Space to check them. Check the confirmation summary and preview-only disclosure. Cancel/Escape must leave Awaiting review unchanged.
5. Keep an internal note, then deliberately confirm an approval. Only this listing becomes Approved in preview; its history shows your reason and preview timestamp. Controls lock. Return to the list/reopen and confirm it remains for this session; other listings and manager access remain unchanged. Refresh to restore the baseline.
6. Open Oak, Courtyard, Garden Court and West End. Approval must be disabled with an explanation for pending/suspended/revoked/rejected managers. Garden Court demonstrates no-image states. Request changes or reject with meaningful feedback and unchecked approval confirmations; these still require modal confirmation. Acacia's Published example remains illustrative and locked.
7. Optionally preview approval of Oak's **manager application** through the existing link. Return to Oak's property details: the fixed synthetic authorisation scenario remains ineligible and the property stays Awaiting review. No real manager permission is granted by either preview.
8. Test 320/390px widths and 130%/200% text, plus tablet/desktop. Scroll the long page and inside the modal. Labels, room details and gallery controls should remain readable/reachable without clipping. Settings → Reset synthetic examples restores both application and property fixtures.
9. For production checks, run `npm run build`, then `npm run start` on loopback port 3101. `/admin/properties`, `/admin/properties/property-hillcrest` and missing property IDs must return 403, including with `?ADMIN_MOCK_MODE=1`. Do not enable preview in production. Stop only the server you started with Ctrl+C.

## Remaining backend requirements and limits

This is a development-only frontend preview, not an operational administration service. Real property moderation has no approved live contract. Before integration, separately agree authoritative property/media/room records, server-authenticated reviewer permissions, manager ownership/access, private-media access, separate manager/property moderation policies, reason/checklist validation, revision/idempotency handling and durable auditing. Publication must independently require current active server-authorised manager access and an authorised approved property review. Define and test the treatment of already-published listings when access is suspended or revoked; the preview does not invent that live policy.

No hosted security or integration tests were executed; H1.3 has not been deployed or hosted-security-tested. Current checks cannot establish RLS, real authentication, role freshness, storage isolation, real evidence authenticity, notification delivery or publication correctness. Browser verification is desktop Chrome at responsive widths, not Safari/Firefox, actual iOS/Android or spoken assistive-technology verification. Larger galleries and real-photo performance require future approved media contracts and representative testing.

Stopped after H1.4.2 frontend implementation. No deployment or live administrative connection was performed.
