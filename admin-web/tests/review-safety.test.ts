import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ConfirmedPreviewReview,
  ReviewDecision,
} from "../src/lib/contracts";
import { applyPreviewReview } from "../src/lib/mock-adapter";
import {
  createSyntheticApplications,
  previewReviewer,
} from "../src/lib/mock-data";
import {
  checklistError,
  emptyConfirmations,
  reasonError,
} from "../src/lib/review-safety";
import { previewReducer } from "../src/components/preview-context";

const mode = { nodeEnv: "development", optIn: "1" };
const now = "2026-10-23T15:00:00.000Z";
const complete = { applicant: true, business: true, authority: true };
const reason =
  "The example authority declaration matches the supplied business details.";
const review = (
  decision: ReviewDecision = "approved",
): ConfirmedPreviewReview => ({
  command: {
    p_application: createSyntheticApplications()[0].application.id,
    p_revision: 1,
    p_decision: decision,
    p_reason: reason,
  },
  confirmation: "confirmed-in-dialog",
  confirmations: { ...complete },
});
const apply = (value: ConfirmedPreviewReview) =>
  applyPreviewReview(
    createSyntheticApplications(),
    value,
    previewReviewer,
    mode,
    now,
  );

for (const value of [
  "",
  "   ",
  "good",
  "okay",
  "yes",
  "approved",
  "a".repeat(40),
  "good ".repeat(10),
  "approved okay yes approved",
  "abc ".repeat(10),
  "x".repeat(2001),
])
  test(`reason safeguard rejects ${JSON.stringify(value.slice(0, 30))}`, () => {
    assert.notEqual(reasonError(value), "");
    const input = review();
    input.command.p_reason = value;
    assert.throws(() => apply(input), /reason|placeholders/);
  });
test("specific Unicode reasons are allowed without fabricating content", () => {
  for (const value of [
    reason,
    "L’autorité déclarée nécessite des précisions supplémentaires.",
  ])
    assert.equal(reasonError(value), "");
});
for (const key of ["applicant", "business", "authority"] as const)
  test(`approval rejects missing ${key} confirmation at state boundary`, () => {
    const value = review();
    value.confirmations[key] = false;
    assert.notEqual(checklistError("approved", value.confirmations), "");
    assert.throws(() => apply(value), /all three/);
  });
test("new checklists are independent and initially unchecked", () => {
  const first = emptyConfirmations();
  first.authority = true;
  assert.deepEqual(emptyConfirmations(), {
    applicant: false,
    business: false,
    authority: false,
  });
});
test("confirmed approval captures detached session-only metadata and locks further decisions", () => {
  const value = review();
  const before = createSyntheticApplications();
  const result = applyPreviewReview(before, value, previewReviewer, mode, now);
  assert.equal(result[0].application.status, "approved");
  assert.deepEqual(result[0].previewDecision, {
    applicationId: value.command.p_application,
    revision: 1,
    decision: "approved",
    confirmations: complete,
    applicantVisibleReason: reason,
    previewTimestamp: now,
    reviewer: previewReviewer,
  });
  value.confirmations.authority = false;
  assert.equal(result[0].previewDecision?.confirmations.authority, true);
  assert.deepEqual(result.slice(1), before.slice(1));
  assert.equal(before[0].previewDecision, undefined);
  assert.throws(
    () => applyPreviewReview(result, review(), previewReviewer, mode, now),
    /pending/,
  );
  assert.equal(createSyntheticApplications()[0].application.status, "pending");
});
for (const decision of ["needs_information", "rejected"] as const)
  test(`${decision} requires a reason and dialog, without approval checklist`, () => {
    const value = review(decision);
    value.confirmations = emptyConfirmations();
    assert.equal(apply(value)[0].application.status, decision);
    value.command.p_reason = "yes";
    assert.throws(() => apply(value), /reason/);
  });
test("unconfirmed, missing or malformed confirmations and stale revisions cannot update records", () => {
  for (const changes of [
    { confirmation: "not-confirmed" },
    { confirmations: undefined },
    { confirmations: { ...complete, authority: "true" } },
  ])
    assert.throws(
      () =>
        apply({ ...review(), ...changes } as unknown as ConfirmedPreviewReview),
      /confirmations|dialog/,
    );
  const value = review();
  value.command.p_revision = 2;
  assert.throws(() => apply(value), /changed/);
});
test("reducer revalidates alternate actions and preserves notes, records and identity boundaries", () => {
  const previous = process.env;
  try {
    process.env = { ...previous, NODE_ENV: "development" };
    const records = createSyntheticApplications();
    records[0].internalNote = "Internal reasoning, not applicant-facing.";
    const state = { records, notice: "", error: "" };
    const invalid = review();
    invalid.confirmations = emptyConfirmations();
    const denied = previewReducer(state, {
      type: "review",
      review: invalid,
      now,
    });
    assert.equal(denied.records, records);
    assert.match(denied.error, /all three/);
    const accepted = previewReducer(state, {
      type: "review",
      review: review(),
      now,
    });
    assert.equal(accepted.error, "");
    assert.equal(accepted.records[0].internalNote, records[0].internalNote);
    assert.equal(accepted.records[0].application.review_reason, reason);
    assert.deepEqual(accepted.records[1], records[1]);
    const reset = previewReducer(accepted, { type: "reset" });
    assert.deepEqual(reset.records, createSyntheticApplications());
    process.env = { ...previous, NODE_ENV: "production" };
    assert.match(
      previewReducer(state, { type: "review", review: review(), now }).error,
      /unavailable/,
    );
  } finally {
    process.env = previous;
  }
});
