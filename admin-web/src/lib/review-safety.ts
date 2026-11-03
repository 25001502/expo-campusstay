import type { ReviewDecision, ReviewerConfirmations } from "./contracts";

export const confirmationItems = [
  { key: "applicant", label: "Applicant information reviewed" },
  { key: "business", label: "Accommodation/business details reviewed" },
  {
    key: "authority",
    label: "Ownership or management-authority evidence reviewed",
  },
] as const;
export const previewDecisionNotice =
  "Demo preview only — no manager permissions will be granted and no changes will be saved to Supabase.";
export function emptyConfirmations(): ReviewerConfirmations {
  return { applicant: false, business: false, authority: false };
}
// A basic copy-quality safeguard, not a judgement of truth or evidential sufficiency.
export function reasonError(reason: string): string {
  if (reason.trim().length < 20 || reason.trim().length > 2000)
    return "Enter a review reason between 20 and 2,000 characters explaining your decision.";
  const placeholders = new Set([
    "good",
    "okay",
    "ok",
    "yes",
    "approved",
    "approve",
    "rejected",
    "reject",
    "test",
    "testing",
    "placeholder",
  ]);
  const words =
    reason
      .normalize("NFKC")
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  const meaningful = new Set(
    words.filter(
      (word) =>
        word.length > 1 && !placeholders.has(word) && !/^(.)\1+$/u.test(word),
    ),
  );
  return meaningful.size < 3
    ? "Explain the specific basis for your decision using at least three distinct words; avoid placeholders or repetition."
    : "";
}
export function checklistError(
  decision: ReviewDecision,
  confirmations: ReviewerConfirmations,
): string {
  return decision === "approved" &&
    !confirmationItems.every((item) => confirmations?.[item.key] === true)
    ? "Complete all three simulated reviewer confirmations before previewing approval."
    : "";
}
