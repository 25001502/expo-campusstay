import { boolean, ContractError, member, object, revision, uuid, version } from './core';
import { applicationStatuses, authorizationStates, type ApplicationStatus, type AuthorizationState, type ReviewDecision, reviewDecisions } from './manager-verification';
import type { ReviewerConfirmations } from './preview';

/** Pure future contract specifications. No schema, authorizer, RPC or integration exists here. */
export const PROPOSED_CONTRACT = { version: 1, implementation: 'proposed-not-implemented' } as const;
export type ProposedManagerReviewV2 = {
  contract: 'proposed-manager-review'; version: 2; request_id: string; application_id: string;
  expected_revision: number; decision: ReviewDecision; applicant_reason: string;
  checklist: ReviewerConfirmations & { schema_version: 1 };
};
/** Matches current preview copy-quality rules; not evidence of authenticity or server enforcement. */
export function meaningfulReviewReason(value: unknown): string {
  if (typeof value !== 'string') throw new ContractError();
  const reason = value.trim();
  if (reason.length < 20 || reason.length > 2000) throw new ContractError();
  const placeholders = new Set(['good', 'okay', 'ok', 'yes', 'approved', 'approve', 'rejected', 'reject', 'test', 'testing', 'placeholder']);
  const words = reason.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (new Set(words.filter(word => word.length > 1 && !placeholders.has(word) && !/^(.)\1+$/u.test(word))).size < 3) throw new ContractError();
  return reason;
}
export function parseProposedManagerReview(value: unknown): ProposedManagerReviewV2 {
  const c = object(value, ['contract', 'version', 'request_id', 'application_id', 'expected_revision', 'decision', 'applicant_reason', 'checklist']);
  version(c.version, 2);
  if (c.contract !== 'proposed-manager-review') throw new ContractError();
  const checklist = object(c.checklist, ['schema_version', 'applicant', 'business', 'authority']); version(checklist.schema_version, 1);
  const confirmations = { schema_version: 1 as const, applicant: boolean(checklist.applicant), business: boolean(checklist.business), authority: boolean(checklist.authority) };
  const decision = member(c.decision, reviewDecisions);
  if (decision === 'approved' && (!confirmations.applicant || !confirmations.business || !confirmations.authority)) throw new ContractError();
  return { contract: 'proposed-manager-review', version: 2, request_id: uuid(c.request_id), application_id: uuid(c.application_id), expected_revision: revision(c.expected_revision), decision, applicant_reason: meaningfulReviewReason(c.applicant_reason), checklist: confirmations };
}
export const proposedPropertyReviewStatuses = ['draft', 'pending', 'changes_requested', 'approved', 'rejected'] as const;
export type ProposedPropertyReviewStatus = typeof proposedPropertyReviewStatuses[number];
export type PublicationEligibilityInputsV1 = {
  contract: 'proposed-publication-eligibility'; version: 1; property_id: string; manager_id: string;
  catalogue_ready: boolean; verification_ready: boolean; manager_application_status: ApplicationStatus; manager_authorization: AuthorizationState;
  assignment: { property_id: string; manager_id: string; state: 'provisional' | 'active' | 'suspended' | 'revoked'; trusted: boolean; current: boolean; primary: boolean };
  review: { status: ProposedPropertyReviewStatus; approved_revision: number | null };
  publication: { state: 'unpublished' | 'published' | 'blocked'; revision: number };
  approved_media_ready: boolean;
};
export function parsePublicationEligibilityInputs(value: unknown): PublicationEligibilityInputsV1 {
  const r = object(value, ['contract', 'version', 'property_id', 'manager_id', 'catalogue_ready', 'verification_ready', 'manager_application_status', 'manager_authorization', 'assignment', 'review', 'publication', 'approved_media_ready']);
  version(r.version, 1);
  if (r.contract !== 'proposed-publication-eligibility') throw new ContractError();
  const a = object(r.assignment, ['property_id', 'manager_id', 'state', 'trusted', 'current', 'primary']);
  const review = object(r.review, ['status', 'approved_revision']), publication = object(r.publication, ['state', 'revision']);
  return {
    contract: 'proposed-publication-eligibility', version: 1, property_id: uuid(r.property_id), manager_id: uuid(r.manager_id),
    catalogue_ready: boolean(r.catalogue_ready), verification_ready: boolean(r.verification_ready), manager_application_status: member(r.manager_application_status, applicationStatuses), manager_authorization: member(r.manager_authorization, authorizationStates),
    assignment: { property_id: uuid(a.property_id), manager_id: uuid(a.manager_id), state: member(a.state, ['provisional', 'active', 'suspended', 'revoked']), trusted: boolean(a.trusted), current: boolean(a.current), primary: boolean(a.primary) },
    review: { status: member(review.status, proposedPropertyReviewStatuses), approved_revision: review.approved_revision === null ? null : revision(review.approved_revision) },
    publication: { state: member(publication.state, ['unpublished', 'published', 'blocked']), revision: revision(publication.revision) }, approved_media_ready: boolean(r.approved_media_ready),
  };
}
/** Specification only: callers cannot obtain trustworthy eligibility by supplying their own flags. */
export function evaluatePublicationEligibility(value: unknown): { contract: 'proposed-only'; eligible: boolean } {
  const r = parsePublicationEligibilityInputs(value);
  return { contract: 'proposed-only', eligible: r.catalogue_ready && r.verification_ready && r.manager_application_status === 'approved' && r.manager_authorization === 'active'
    && r.assignment.state === 'active' && r.assignment.trusted && r.assignment.current && r.assignment.primary
    && r.assignment.property_id === r.property_id && r.assignment.manager_id === r.manager_id
    && r.review.status === 'approved' && r.review.approved_revision !== null
    && r.publication.state === 'published' && r.publication.revision === r.review.approved_revision && r.approved_media_ready };
}
export const proposedAuditEventTypes = ['manager.review_decided', 'manager.access_changed', 'privilege.assignment_changed', 'property.submitted', 'property.reviewed', 'property.published', 'property.unpublished', 'property.assignment_changed', 'evidence.accessed'] as const;
export type ProposedAuditEventType = typeof proposedAuditEventTypes[number];
