import { previewAllowed } from "../../security.mjs";
import type { ReviewerIdentity } from "./contracts";
import { reasonError } from "./review-safety";
import {
  propertyChecklistItems,
  type ConfirmedPropertyReview,
  type PropertyConfirmations,
  type PropertyDecision,
  type PropertyManager,
  type PropertyReview,
} from "./property-contracts";

export const managerStateLabels = {
  pending: "Pending verification",
  approved: "Approved · active access",
  inactive: "Approved · access not granted",
  suspended: "Suspended",
  revoked: "Revoked",
  rejected: "Rejected",
  needs_information: "Needs information",
  draft: "Not submitted",
} as const;
export function managerState(
  manager: PropertyManager,
): keyof typeof managerStateLabels {
  if (
    manager.authorization === "suspended" ||
    manager.authorization === "revoked"
  )
    return manager.authorization;
  if (manager.verificationStatus === "approved")
    return manager.authorization === "active" ? "approved" : "inactive";
  return manager.verificationStatus;
}
export function managerEligible(manager: PropertyManager): boolean {
  return (
    manager.source === "synthetic" &&
    manager.verificationStatus === "approved" &&
    manager.authorization === "active"
  );
}
export function roomSummary(property: PropertyReview) {
  return {
    quantity: property.roomTypes.reduce(
      (total, room) => total + room.quantity,
      0,
    ),
    startingRent: property.roomTypes.length
      ? Math.min(...property.roomTypes.map((room) => room.monthlyRent))
      : null,
  };
}
export function formatRent(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}
export function emptyPropertyConfirmations(): PropertyConfirmations {
  return {
    location: false,
    description: false,
    rooms: false,
    photos: false,
    amenities: false,
    manager: false,
  };
}
export function propertyApprovalBlock(property: PropertyReview): string {
  if (!managerEligible(property.manager))
    return "Approval is blocked: the responsible manager needs approved verification and active manager authorisation. A submitted application or declared manager intent is insufficient.";
  if (!property.images.length || !property.roomTypes.length)
    return "Approval is blocked: example property images and declared room details must be available for review.";
  return "";
}
export function propertyChecklistError(
  decision: PropertyDecision,
  confirmations: PropertyConfirmations,
): string {
  return decision === "approved" &&
    !propertyChecklistItems.every((item) => confirmations?.[item.key] === true)
    ? "Complete all six simulated reviewer confirmations before previewing listing approval."
    : "";
}
export const propertyPreviewNotice =
  "Demo preview only — no listing will be published, no permissions will change and no changes will be saved to Supabase.";
export function filterProperties(
  records: PropertyReview[],
  query: string,
  status: string,
  manager: string,
) {
  const normalized = query.trim().toLocaleLowerCase();
  return records.filter(
    (property) =>
      (status === "all" || property.status === status) &&
      (manager === "all" || managerState(property.manager) === manager) &&
      `${property.name} ${property.city} ${property.address} ${property.manager.name}`
        .toLocaleLowerCase()
        .includes(normalized),
  );
}
export function applyPropertyReview(
  records: PropertyReview[],
  review: ConfirmedPropertyReview,
  reviewer: ReviewerIdentity,
  mode: { nodeEnv: string; optIn: string },
  now: string,
): PropertyReview[] {
  if (
    !previewAllowed(mode.nodeEnv, mode.optIn) ||
    reviewer.source !== "synthetic"
  )
    throw new Error("Property preview action unavailable.");
  if (review?.confirmation !== "confirmed-in-dialog")
    throw new Error("Open and confirm the listing decision dialog first.");
  const target = records.find((property) => property.id === review.propertyId);
  if (
    !target ||
    target.source !== "synthetic" ||
    target.status !== "awaiting_review" ||
    target.manager.id === reviewer.id
  )
    throw new Error(
      "Only another manager’s synthetic listing awaiting review can be reviewed.",
    );
  if (target.revision !== review.revision)
    throw new Error("This listing changed. Reopen it before reviewing.");
  if (!["approved", "changes_requested", "rejected"].includes(review.decision))
    throw new Error("Choose a supported listing decision.");
  const invalidReason = reasonError(review.reason);
  if (invalidReason) throw new Error(invalidReason);
  if (
    !propertyChecklistItems.every(
      (item) => typeof review.confirmations?.[item.key] === "boolean",
    )
  )
    throw new Error("Listing reviewer confirmations are missing or invalid.");
  if (review.decision === "approved") {
    const blocked =
      propertyApprovalBlock(target) ||
      propertyChecklistError(review.decision, review.confirmations);
    if (blocked) throw new Error(blocked);
  }
  if (!Number.isFinite(Date.parse(now)))
    throw new Error("Preview timestamp is invalid.");
  return records.map((property) =>
    property !== target
      ? property
      : {
          ...property,
          status: review.decision,
          revision: property.revision + 1,
          previewDecision: {
            ...review,
            confirmations: { ...review.confirmations },
            reason: review.reason.trim(),
            previewTimestamp: now,
            reviewer: { ...reviewer },
          },
          history: [
            ...property.history,
            {
              id: `preview-${property.id}-${property.revision + 1}`,
              action: review.decision,
              at: now,
              reason: review.reason.trim(),
              source: "session_preview",
            },
          ],
        },
  );
}
