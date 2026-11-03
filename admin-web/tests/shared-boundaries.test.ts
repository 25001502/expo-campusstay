import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { parseH13ReviewCommand, parseManagerApplication, applicationStatuses as sharedStatuses } from "../../shared/contracts/v1/manager-verification";
import { previewPropertyStatuses } from "../../shared/contracts/v1/preview";
import { meaningfulReviewReason, parseProposedManagerReview } from "../../shared/contracts/v1/proposed";
import { applyPreviewReview } from "../src/lib/mock-adapter";
import { createSyntheticApplications, previewReviewer } from "../src/lib/mock-data";
import { applicationStatuses, type ManagerApplication } from "../src/lib/contracts";
import { propertyStatuses } from "../src/lib/property-contracts";
import { reasonError } from "../src/lib/review-safety";
import { futureSupabaseAdapter } from "../src/lib/future-adapter";
import { proxy } from "../src/proxy";
const now = "2026-10-23T12:00:00Z";
const mode = { nodeEnv: "development", optIn: "1" };
const command = () => ({ p_application: createSyntheticApplications()[0].application.id, p_revision: 1, p_decision: "approved" as const, p_reason: "The supplied management authority evidence was examined." });

test("admin aliases and preview status tuples match shared contracts without changing previews", () => {
  assert.deepEqual(applicationStatuses, sharedStatuses);
  assert.deepEqual(propertyStatuses, previewPropertyStatuses);
  const parsed: ManagerApplication = parseManagerApplication(createSyntheticApplications()[0].application);
  assert.equal(parsed.status, "pending");
});
test("synthetic UUID-shaped data is not evidence of server provenance or authorization", () => {
  // The fixtures intentionally have valid UUIDs. Schema parsing cannot authenticate their origin.
  assert.equal(parseH13ReviewCommand(command()).p_decision, "approved");
  assert.throws(() => parseProposedManagerReview({ ...command(), confirmation: "confirmed-in-dialog", confirmations: { applicant: true, business: true, authority: true } }));
});
test("actual future adapter rejects synthetic review input and performs no network calls", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("Unexpected network access"); };
  try {
    await assert.rejects(futureSupabaseAdapter.listApplications(), /authorization required/);
    await assert.rejects(futureSupabaseAdapter.review(command()), /not connected/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});
test("actual synthetic approval changes only preview data, never manager/admin permission", () => {
  const records = createSyntheticApplications();
  const changed = applyPreviewReview(records, { command: command(), confirmation: "confirmed-in-dialog", confirmations: { applicant: true, business: true, authority: true } }, previewReviewer, mode, now);
  assert.equal(changed[0].application.status, "approved");
  assert.equal(changed[0].previewDecision?.reviewer.source, "synthetic");
  assert.equal(records[0].application.status, "pending");
  assert.equal("authorization" in changed[0], false);
  assert.equal("role" in changed[0], false);
});
test("actual production Proxy denies manager/admin flags and mock opt-in", () => {
  const previous = process.env.NODE_ENV, optIn = process.env.ADMIN_MOCK_MODE;
  try {
    Object.assign(process.env, { NODE_ENV: "production", ADMIN_MOCK_MODE: "1" });
    const response = proxy();
    assert.equal(response.status, 403);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: previous });
    if (optIn === undefined) delete process.env.ADMIN_MOCK_MODE; else process.env.ADMIN_MOCK_MODE = optIn;
  }
});
test("new proposed reason specification agrees with current preview rules on representative copy", () => {
  for (const reason of ["x", " ", "approved approved approved", "placeholder ".repeat(5), "The supplied management authority evidence was examined.", "  Explain the property authority document discrepancy.  ", "x".repeat(2001)]) {
    let accepted = true;
    try { meaningfulReviewReason(reason); } catch { accepted = false; }
    assert.equal(accepted, !reasonError(reason));
  }
});
test("admin consumes shared models only through erased type imports, preserving Turbopack isolation", () => {
  for (const file of ["contracts.ts", "property-contracts.ts"]) {
    const source = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), "utf8");
    const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const output = ts.createSourceFile(file, emitted, ts.ScriptTarget.Latest, true);
    assert.equal(output.statements.some(statement => ts.isImportDeclaration(statement)), false);
    assert.doesNotMatch(emitted, /shared\/contracts|react-native|\bexpo\b|supabase|service_role/);
  }
});
