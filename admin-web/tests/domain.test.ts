import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { previewAllowed, assertProductionSafe } from "../security.mjs";
import {
  applyPreviewReview as applyConfirmedReview,
  filterApplications,
} from "../src/lib/mock-adapter";
import {
  createSyntheticApplications,
  previewReviewer,
  sampleProperties,
} from "../src/lib/mock-data";
import { futureSupabaseAdapter } from "../src/lib/future-adapter";
import {
  applicationStatuses,
  type ManagerApplication,
  type ReviewCommand,
} from "../src/lib/contracts";
import type { VerificationApplication as MobileContract } from "../../src/verification/domain";
const now = "2026-10-23T12:00:00Z";
const mode = { nodeEnv: "development", optIn: "1" };
const initial = () => createSyntheticApplications();
const command = (changes: Partial<ReviewCommand> = {}): ReviewCommand => ({
  p_application: initial()[0].application.id,
  p_revision: 1,
  p_decision: "needs_information",
  p_reason: "Clarify the example declaration.",
  ...changes,
});
// Existing domain cases now model the deliberate, completed dialog path.
function applyPreviewReview(
  records: Parameters<typeof applyConfirmedReview>[0],
  command: ReviewCommand,
  reviewer: Parameters<typeof applyConfirmedReview>[2],
  mode: Parameters<typeof applyConfirmedReview>[3],
  now: string,
) {
  return applyConfirmedReview(
    records,
    {
      command,
      confirmation: "confirmed-in-dialog",
      confirmations: { applicant: true, business: true, authority: true },
    },
    reviewer,
    mode,
    now,
  );
}
test("preview requires exact development environment and explicit opt-in", () => {
  for (const env of ["production", "test", "", undefined])
    assert.equal(previewAllowed(env, "1"), false);
  for (const flag of ["", "true", "0", undefined])
    assert.equal(previewAllowed("development", flag), false);
  assert.equal(previewAllowed("development", "1"), true);
});
test("production flag is rejected by the actual Next configuration", () => {
  assert.throws(() => assertProductionSafe("production", "1"), /forbidden/);
  assertProductionSafe("production", undefined);
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        ["--input-type=module", "-e", "await import('./next.config.mjs')"],
        {
          cwd: process.cwd(),
          env: { ...process.env, NODE_ENV: "production", ADMIN_MOCK_MODE: "1" },
          stdio: "pipe",
        },
      ),
    /Command failed/,
  );
});
test("synthetic fixtures cover all statuses and contain only example email domains", () => {
  assert.deepEqual(
    new Set(initial().map((r) => r.application.status)),
    new Set(applicationStatuses),
  );
  assert.ok(
    initial().every((r) => r.contactEmail.endsWith("@example.invalid")),
  );
});
test("production build and server phases reject preview even if NODE_ENV is forged", () => {
  for (const phase of ["phase-production-build", "phase-production-server"]) {
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `const {default: configure} = await import('./next.config.mjs'); configure('${phase}')`,
          ],
          {
            cwd: process.cwd(),
            env: {
              ...process.env,
              NODE_ENV: "development",
              ADMIN_MOCK_MODE: "1",
            },
            stdio: "pipe",
          },
        ),
      /Command failed/,
    );
  }
});
test("application contract is assignable to the existing mobile H1.3 RPC response", () => {
  function toMobile(value: ManagerApplication): MobileContract {
    return value;
  }
  function fromMobile(value: MobileContract): ManagerApplication {
    return value;
  }
  assert.deepEqual(
    fromMobile(toMobile(initial()[0].application)),
    initial()[0].application,
  );
});
test("local SQL contains the reviewed statuses and revision-bound review RPC", () => {
  const sql = readFileSync(
    new URL(
      "../../supabase/migrations/20261021135040_manager_verification.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    sql.includes(
      "status in ('draft','pending','needs_information','approved','rejected')",
    ),
  );
  assert.ok(
    sql.includes(
      "cs_manager_review(p_application uuid,p_revision integer,p_decision text,p_reason text)",
    ),
  );
  assert.ok(sql.includes("a.applicant_id=actor"));
});
test("search matches name, business and location without case sensitivity", () => {
  for (const q of ["NALEDI", "oak house", "pretoria"])
    assert.equal(
      filterApplications(initial(), q, "all", "newest")[0].application
        .full_name,
      "Naledi Mokoena",
    );
  assert.equal(
    filterApplications(initial(), "not a real name", "all", "newest").length,
    0,
  );
});
test("status filter and sort combine without mutating the source", () => {
  const records = initial();
  const before = structuredClone(records);
  assert.equal(
    filterApplications(records, "", "pending", "oldest")[0].application
      .full_name,
    "Daniel Adams",
  );
  assert.equal(
    filterApplications(records, "", "pending", "newest")[0].application
      .full_name,
    "Naledi Mokoena",
  );
  assert.equal(
    filterApplications(records, "", "pending", "name")[0].application.full_name,
    "Daniel Adams",
  );
  assert.deepEqual(records, before);
});
for (const decision of ["approved", "needs_information", "rejected"] as const)
  test(`preview ${decision} affects only the selected application and its history`, () => {
    const records = initial();
    const before = structuredClone(records);
    const properties = structuredClone(sampleProperties);
    const updated = applyPreviewReview(
      records,
      command({ p_decision: decision }),
      previewReviewer,
      mode,
      now,
    );
    assert.equal(updated[0].application.status, decision);
    assert.equal(updated[0].application.revision, 2);
    assert.equal(updated[0].history.at(-1)?.action, decision);
    assert.deepEqual(updated.slice(1), before.slice(1));
    assert.deepEqual(records, before);
    assert.deepEqual(sampleProperties, properties);
  });
test("duplicate/stale reviews, self-review and invalid targets are denied", () => {
  const changed = applyPreviewReview(
    initial(),
    command(),
    previewReviewer,
    mode,
    now,
  );
  assert.throws(
    () => applyPreviewReview(changed, command(), previewReviewer, mode, now),
    /pending/,
  );
  assert.throws(
    () =>
      applyPreviewReview(
        initial(),
        command({ p_revision: 99 }),
        previewReviewer,
        mode,
        now,
      ),
    /changed/,
  );
  assert.throws(
    () =>
      applyPreviewReview(
        initial(),
        command(),
        { ...previewReviewer, id: initial()[0].application.applicant_id },
        mode,
        now,
      ),
    /another applicant/,
  );
  assert.throws(
    () =>
      applyPreviewReview(
        initial(),
        command({ p_application: "missing" }),
        previewReviewer,
        mode,
        now,
      ),
    /pending/,
  );
});
test("blank/oversized reasons, production and non-synthetic reviewers are denied", () => {
  for (const reason of [" ", "x".repeat(2001)])
    assert.throws(
      () =>
        applyPreviewReview(
          initial(),
          command({ p_reason: reason }),
          previewReviewer,
          mode,
          now,
        ),
      /reason/,
    );
  assert.throws(
    () =>
      applyPreviewReview(
        initial(),
        command(),
        previewReviewer,
        { nodeEnv: "production", optIn: "1" },
        now,
      ),
    /unavailable/,
  );
  assert.throws(
    () =>
      applyPreviewReview(
        initial(),
        command(),
        { ...previewReviewer, source: "verified-server" },
        mode,
        now,
      ),
    /unavailable/,
  );
});
test("new page-session fixture restores the baseline", () => {
  applyPreviewReview(initial(), command(), previewReviewer, mode, now);
  assert.equal(initial()[0].application.status, "pending");
});
test("future adapter denies reads and mutations without any network connection", async () => {
  await assert.rejects(
    futureSupabaseAdapter.listApplications(),
    /authorization required/,
  );
  await assert.rejects(
    futureSupabaseAdapter.review(command()),
    /not connected/,
  );
});
