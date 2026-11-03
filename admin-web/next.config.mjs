import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductionSafe } from "./security.mjs";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
assertProductionSafe(process.env.NODE_ENV, process.env.ADMIN_MOCK_MODE);
const root = dirname(fileURLToPath(import.meta.url));
/** @param {boolean} development @returns {import('next').NextConfig} */
function makeConfig(development) {
  return {
    poweredByHeader: false,
    devIndicators: false,
    turbopack: { root },
    outputFileTracingRoot: root,
    experimental: { cpus: 2 },
    async headers() {
      return [
        ...["/sign-in", "/auth/:path*"].map(source => ({ source, headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Pragma", value: "no-cache" },
        ] })),
        {
          source: "/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Referrer-Policy", value: "no-referrer" },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
            {
              key: "Content-Security-Policy",
              value: `default-src 'self'; script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'`,
            },
          ],
        },
      ];
    },
  };
}
export default function configure(phase) {
  assertProductionSafe(
    phase === PHASE_DEVELOPMENT_SERVER ? "development" : "production",
    process.env.ADMIN_MOCK_MODE,
  );
  return makeConfig(phase === PHASE_DEVELOPMENT_SERVER);
}
