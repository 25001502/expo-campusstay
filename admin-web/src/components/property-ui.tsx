import {
  propertyStatusLabels,
  type PropertyManager,
  type PropertyReviewStatus,
} from "@/lib/property-contracts";
import { managerState, managerStateLabels } from "@/lib/property-review";

export function PropertyStatusBadge({
  status,
}: {
  status: PropertyReviewStatus;
}) {
  const tone =
    status === "awaiting_review"
      ? "pending"
      : status === "changes_requested"
        ? "needs_information"
        : status === "published_example"
          ? "draft"
          : status;
  return (
    <span className={`badge status-${tone}`}>
      {propertyStatusLabels[status]}
    </span>
  );
}
export function ManagerStateBadge({ manager }: { manager: PropertyManager }) {
  const state = managerState(manager);
  const tone =
    state === "approved"
      ? "approved"
      : ["rejected", "revoked", "suspended"].includes(state)
        ? "rejected"
        : "pending";
  return (
    <span className={`badge status-${tone}`}>{managerStateLabels[state]}</span>
  );
}
