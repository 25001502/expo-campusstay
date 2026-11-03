import type {
  ApplicationView,
  ConfirmedPreviewReview,
  ReviewerIdentity,
} from "./contracts";
import { previewAllowed } from "../../security.mjs";
import {
  checklistError,
  confirmationItems,
  reasonError,
} from "./review-safety";
export function applyPreviewReview(
  records: ApplicationView[],
  review: ConfirmedPreviewReview,
  reviewer: ReviewerIdentity,
  mode: { nodeEnv: string; optIn: string },
  now: string,
): ApplicationView[] {
  if (
    !previewAllowed(mode.nodeEnv, mode.optIn) ||
    reviewer.source !== "synthetic"
  )
    throw new Error("Preview action unavailable.");
  if (review?.confirmation !== "confirmed-in-dialog" || !review.command)
    throw new Error("Open and confirm the preview decision dialog first.");
  const { command, confirmations } = review;
  const target = records.find(
    (r) => r.application.id === command.p_application,
  );
  if (
    !target ||
    target.application.status !== "pending" ||
    target.application.applicant_id === reviewer.id
  )
    throw new Error(
      "Only another applicant’s pending application can be reviewed.",
    );
  if (target.application.revision !== command.p_revision)
    throw new Error("This example changed. Reopen it before reviewing.");
  if (
    !["approved", "needs_information", "rejected"].includes(command.p_decision)
  )
    throw new Error("Choose a supported preview decision.");
  const invalidReason = reasonError(command.p_reason);
  if (invalidReason) throw new Error(invalidReason);
  if (
    !confirmationItems.every(
      (item) => typeof confirmations?.[item.key] === "boolean",
    )
  )
    throw new Error("Reviewer confirmations are missing or invalid.");
  const invalidChecklist = checklistError(command.p_decision, confirmations);
  if (invalidChecklist) throw new Error(invalidChecklist);
  if (!Number.isFinite(Date.parse(now)))
    throw new Error("Preview timestamp is invalid.");
  return records.map((r) =>
    r !== target
      ? r
      : {
          ...r,
          previewDecision: {
            applicationId: command.p_application,
            revision: command.p_revision,
            decision: command.p_decision,
            confirmations: { ...confirmations },
            applicantVisibleReason: command.p_reason.trim(),
            previewTimestamp: now,
            reviewer: { ...reviewer },
          },
          application: {
            ...r.application,
            status: command.p_decision,
            review_reason: command.p_reason.trim(),
            reviewed_at: now,
            revision: r.application.revision + 1,
          },
          history: [
            ...r.history,
            {
              id: `preview-${r.application.id}-${r.application.revision + 1}`,
              application_id: r.application.id,
              actor_id: reviewer.id,
              action: command.p_decision,
              occurred_at: now,
              reason: command.p_reason.trim(),
              revision: r.application.revision + 1,
            },
          ],
        },
  );
}
export function filterApplications(
  records: ApplicationView[],
  query: string,
  status: string,
  sort: string,
) {
  const q = query.trim().toLocaleLowerCase();
  return records
    .filter(
      (r) =>
        (status === "all" || r.application.status === status) &&
        [
          r.application.full_name,
          r.application.business_name,
          r.application.property_location,
        ].some((t) => t.toLocaleLowerCase().includes(q)),
    )
    .toSorted((a, b) =>
      sort === "name"
        ? a.application.full_name.localeCompare(b.application.full_name)
        : sort === "oldest"
          ? (a.application.submitted_at ?? "").localeCompare(
              b.application.submitted_at ?? "",
            )
          : (b.application.submitted_at ?? "").localeCompare(
              a.application.submitted_at ?? "",
            ),
    );
}
