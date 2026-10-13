# UI Phase E: manager workspace

Phase E replaces the former static manager screen with a typed, session-only property management workspace. It preserves direct-to-Home startup, keeps manager controls outside student tabs, and adds no authentication, backend, persistence, payments, booking confirmation, document verification, or external communication.

## Confirmed pre-change issues

The manager experience was one 642-line screen. Six crowded bottom actions switched between hard-coded sections. Dashboard, occupancy, revenue, application, and tenant figures came from unrelated constants. Add Property and approval actions had no handlers. Properties were a slice of the global student list without an ownership rule. There were no property details, forms, validation, room edits, filters, empty states, settings behavior, or accurate analytics.

## State and scope

`src/manager.ts` defines an explicit local portfolio using property IDs `p1` and `p2`. Manager applications and tenants reference only those IDs. Phase C student applications remain in their separate provider and are never imported into manager state, which prevents unrestricted manager access to student-entered personal information.

The manager reducer owns cloned properties, room edits, newly added properties, internal review notes, and stable local property sequences. It prevents duplicate IDs and never mutates shared seed records. Final application decisions are not modeled as reducer actions.

Dashboard metrics and Analytics derive from the same properties, room availability, scoped applications, and active tenants. Occupancy represents current local records only. Historical trends and revenue were removed because no supporting transaction or time-series data exists.

## Workspace behavior

Primary navigation contains Dashboard, Properties, Applications, and More. More contains Tenants, Analytics, and Settings. The layout uses safe-area padding, four readable bottom targets, selected state, scrollable forms, responsive dashboard columns, and accessible summaries.

Properties support search, availability filters, local creation, prepopulated editing, unsaved-change confirmation, details, and validated room price and availability edits. No image upload or public publishing is claimed.

Applications support scoped status filters, details, and internal session review notes. Approval and rejection controls explain that authenticated server access is required and make no state change. Tenants remain read-only and explicitly linked to portfolio property and room IDs.

## Logout correction

Profile displays Log Out. The exact confirmation dialog provides Cancel and Log Out. Confirmation clears Phase C applications, resets favorites, restores initial messages and notifications, and resets the root navigation stack to Login. Login provides Continue without signing in, which resets the root stack to Main/Home. A fresh launch still starts at Main/Home.

## Service boundaries

All manager changes last only for the current mounted workspace. Returning to the manager route starts from the defined local portfolio. No server session, role authorization, publication, inventory reservation, approval, rejection, lease, payment, upload, or student notification occurs.
