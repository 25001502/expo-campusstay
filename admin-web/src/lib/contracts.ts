import type {
  ApplicationStatus as SharedApplicationStatus,
  AuthorizationState as SharedAuthorizationState,
  EvidenceMetadata as SharedEvidenceMetadata,
  H13ReviewCommand,
  ManagerApplication as SharedManagerApplication,
  ReviewDecision as SharedReviewDecision,
  VerificationEventType,
} from "../../../shared/contracts/v1/manager-verification";
import type { ReviewerConfirmations as SharedReviewerConfirmations } from "../../../shared/contracts/v1/preview";
/** Local H1.3 aliases; type-only imports keep Next and native runtime trees separate. */
export const applicationStatuses = [
  "draft",
  "pending",
  "needs_information",
  "approved",
  "rejected",
] as const;
export type ApplicationStatus = SharedApplicationStatus;
export type ReviewDecision = SharedReviewDecision;
export type AuthorizationState = SharedAuthorizationState;
export type EvidenceMetadata = SharedEvidenceMetadata;
export type ManagerApplication = SharedManagerApplication;
export type ReviewCommand = H13ReviewCommand;
export interface ReviewerIdentity {
  id: string;
  label: string;
  source: "synthetic" | "verified-server";
}
// Client-only preview structures. These are NOT H1.3 RPC fields or durable audit records.
export type ReviewerConfirmations = SharedReviewerConfirmations;
export interface ConfirmedPreviewReview {
  command: ReviewCommand;
  confirmations: ReviewerConfirmations;
  confirmation: "confirmed-in-dialog";
}
export interface PreviewDecisionMetadata {
  applicationId: string;
  revision: number;
  decision: ReviewDecision;
  confirmations: ReviewerConfirmations;
  applicantVisibleReason: string;
  previewTimestamp: string;
  reviewer: ReviewerIdentity;
}
export interface VerificationAuditEntry {
  id: string;
  application_id: string;
  actor_id: string;
  action: VerificationEventType;
  occurred_at: string;
  reason: string | null;
  revision: number;
}
// Email and internal notes are presentation projections, NOT fields in the H1.3 RPC.
export interface ApplicationView {
  application: ManagerApplication;
  contactEmail: string;
  city: string;
  initials: string;
  history: VerificationAuditEntry[];
  internalNote: string;
  previewDecision?: PreviewDecisionMetadata;
}
export interface ManagerAuthorization {
  user_id: string;
  application_id: string;
  state: Exclude<AuthorizationState, "none">;
  granted_by: string;
  reason: string;
}
export interface AdminDataAdapter {
  listApplications(): Promise<ApplicationView[]>;
  review(command: ReviewCommand): Promise<ManagerApplication>;
}
export const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  needs_information: "Needs information",
  approved: "Approved",
  rejected: "Rejected",
};
