import type {
  ApplicationStatus,
  AuthorizationState,
  ReviewerIdentity,
} from "./contracts";
import type { PreviewPropertyReviewStatus, PropertyDecision as SharedPropertyDecision } from "../../../shared/contracts/v1/preview";

// Frontend-only illustrative projections. No property moderation database/RPC is implied.
export const propertyStatuses = [
  "awaiting_review",
  "changes_requested",
  "approved",
  "rejected",
  "published_example",
] as const;
export type PropertyReviewStatus = PreviewPropertyReviewStatus;
export type PropertyDecision = SharedPropertyDecision;
export const propertyStatusLabels: Record<PropertyReviewStatus, string> = {
  awaiting_review: "Awaiting review",
  changes_requested: "Changes requested in preview",
  approved: "Approved in preview",
  rejected: "Rejected in preview",
  published_example: "Published example",
};
export interface PropertyImage {
  id: string;
  src: "/residence.svg" | "/room-single.svg" | "/room-shared.svg";
  alt: string;
  caption: string;
}
export interface DeclaredRoom {
  id: string;
  type: "Single Room" | "Shared Room";
  description: string;
  capacity: number;
  monthlyRent: number;
  quantity: number;
  furnishing: string | null;
  fundingClaim: string | null;
  images: PropertyImage[];
}
export interface PropertyManager {
  id: string;
  name: string;
  applicationId?: string;
  verificationStatus: ApplicationStatus;
  authorization: AuthorizationState;
  source: "synthetic";
}
export const propertyChecklistItems = [
  {
    key: "location",
    label: "Property location and address information examined",
  },
  { key: "description", label: "Property description reviewed" },
  { key: "rooms", label: "Room types, prices and capacities reviewed" },
  { key: "photos", label: "Property photos reviewed" },
  { key: "amenities", label: "Advertised amenities reviewed" },
  {
    key: "manager",
    label: "Responsible manager has approved, active manager access",
  },
] as const;
export type PropertyConfirmations = Record<
  (typeof propertyChecklistItems)[number]["key"],
  boolean
>;
export const amenityLabels = {
  wifi: "Wi-Fi",
  security: "Security",
  electricity: "Electricity",
  water: "Water",
  parking: "Parking",
  laundry: "Laundry",
  study: "Study facilities",
  bathrooms: "Bathrooms",
  kitchen: "Kitchen facilities",
} as const;
export interface DeclaredAmenity {
  type: keyof typeof amenityLabels;
  detail: string;
}
export interface PropertyHistoryEvent {
  id: string;
  action: "submitted" | "information_requested" | "reviewed" | PropertyDecision;
  at: string;
  reason: string;
  source: "sample" | "session_preview";
}
export interface ConfirmedPropertyReview {
  propertyId: string;
  revision: number;
  decision: PropertyDecision;
  reason: string;
  confirmations: PropertyConfirmations;
  confirmation: "confirmed-in-dialog";
}
export interface PropertyDecisionMetadata extends ConfirmedPropertyReview {
  previewTimestamp: string;
  reviewer: ReviewerIdentity;
}
export interface PropertyReview {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  submittedAt: string | null;
  source: "synthetic";
  manager: PropertyManager;
  status: PropertyReviewStatus;
  revision: number;
  images: PropertyImage[];
  roomTypes: DeclaredRoom[];
  amenities: DeclaredAmenity[];
  history: PropertyHistoryEvent[];
  internalNote: string;
  previewDecision?: PropertyDecisionMetadata;
}
