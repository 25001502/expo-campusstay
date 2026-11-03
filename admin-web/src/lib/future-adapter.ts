import type { AdminDataAdapter } from "./contracts";
// Deliberately no SDK, URL, key, fetch or client. A reviewer RPC is not an admin
// authentication mechanism. Replace only after a separate server authorization phase.
export const futureSupabaseAdapter: AdminDataAdapter = {
  async listApplications() {
    throw new Error(
      "Backend integration unavailable: verified server authorization required.",
    );
  },
  async review() {
    throw new Error("Administrative operations are not connected.");
  },
};
