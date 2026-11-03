// No cookie, browser state, public environment flag or request parameter grants access.
export function previewAllowed(nodeEnv, optIn) {
  return nodeEnv === "development" && optIn === "1";
}
export function assertProductionSafe(nodeEnv, optIn) {
  if (nodeEnv === "production" && optIn === "1") {
    throw new Error(
      "ADMIN_MOCK_MODE is forbidden in production. No admin authentication is implemented.",
    );
  }
}
export const deniedHtml =
  '<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/access.css"><title>CampusStay Admin — Access unavailable</title></head><body><main><div class="brand"><span>CS</span>CampusStay Admin</div><h1>Administrator access unavailable</h1><p>Verified server-side administrator authorization is required. Sign-in and administrative operations are not enabled.</p><p class="note">No administrative data has been loaded.</p></main></body></html>';
