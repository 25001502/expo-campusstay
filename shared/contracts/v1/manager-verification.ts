import { boolean, ContractError, integer, member, nullable, object, revision, text, uuid, version } from './core';

/** Implemented by the local H1.3 migration; NOT deployed/hosted-verified. */
export const H13_CONTRACT = { version: 1, implementation: 'local-h13', deployment: 'not-deployed' } as const;
export const applicationStatuses = ['draft', 'pending', 'needs_information', 'approved', 'rejected'] as const;
export type ApplicationStatus = typeof applicationStatuses[number];
export const reviewDecisions = ['approved', 'needs_information', 'rejected'] as const;
export type ReviewDecision = typeof reviewDecisions[number];
export const authorizationStates = ['none', 'active', 'suspended', 'revoked'] as const;
export type AuthorizationState = typeof authorizationStates[number];
export const PROOF_LIMIT = 5242880;
export const PROOF_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type ProofType = typeof PROOF_TYPES[number];
export type VerificationFields = { phone: string; business_name: string; property_location: string; relationship: '' | 'owner' | 'authorised_manager' };
/** Safe application_json projection, NOT a raw database row or confidential review. */
export type EvidenceMetadata = { id: string; file_name: string; mime_type: ProofType; byte_size: number };
export type ManagerApplication = VerificationFields & {
  id: string; applicant_id: string; full_name: string; revision: number; status: ApplicationStatus;
  submitted_at: string | null; reviewed_at: string | null; review_reason: string | null; proof: EvidenceMetadata | null;
};
export type VerificationState = { version: 1; ready: boolean; application: ManagerApplication | null; access: { state: AuthorizationState; authorized: boolean } };
export type H13ReviewCommand = { p_application: string; p_revision: number; p_decision: ReviewDecision; p_reason: string };
export const verificationEventTypes = ['draft_saved', 'proof_reserved', 'proof_verified', 'submitted', 'needs_information', 'approved', 'rejected', 'active', 'suspended', 'revoked'] as const;
export type VerificationEventType = typeof verificationEventTypes[number];
const applicationKeys = ['id', 'applicant_id', 'full_name', 'phone', 'business_name', 'property_location', 'relationship', 'status', 'revision', 'submitted_at', 'reviewed_at', 'review_reason', 'proof'] as const;
function timestamp(value: unknown): string {
  const result = text(value, 64, 1);
  if (!Number.isFinite(Date.parse(result))) throw new ContractError();
  return result;
}
export function parseEvidenceMetadata(value: unknown): EvidenceMetadata {
  const p = object(value, ['id', 'file_name', 'mime_type', 'byte_size']);
  const file_name = text(p.file_name, 160, 1);
  if (/[/\\]/.test(file_name) || Array.from(file_name).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new ContractError();
  return { id: uuid(p.id), file_name, mime_type: member(p.mime_type, PROOF_TYPES), byte_size: integer(p.byte_size, PROOF_LIMIT, 1) };
}
export function parseManagerApplication(value: unknown): ManagerApplication {
  const a = object(value, applicationKeys);
  return {
    id: uuid(a.id), applicant_id: uuid(a.applicant_id), full_name: text(a.full_name, 200),
    phone: text(a.phone, 24), business_name: text(a.business_name, 160), property_location: text(a.property_location, 500),
    relationship: member(a.relationship, ['', 'owner', 'authorised_manager']), status: member(a.status, applicationStatuses), revision: revision(a.revision),
    submitted_at: nullable(a.submitted_at, timestamp), reviewed_at: nullable(a.reviewed_at, timestamp),
    review_reason: nullable(a.review_reason, input => text(input, 2000)), proof: nullable(a.proof, parseEvidenceMetadata),
  };
}
/** Owner binding for mobile own-state only; admin queues must not use this as a role check. */
export function parseOwnApplication(value: unknown, owner: string): ManagerApplication {
  const application = parseManagerApplication(value);
  if (application.applicant_id !== uuid(owner)) throw new ContractError('forbidden');
  return application;
}
export function parseOwnState(value: unknown, owner: string): VerificationState {
  const s = object(value, ['version', 'ready', 'application', 'access']); version(s.version, 1);
  uuid(owner);
  const a = object(s.access, ['state', 'authorized']);
  const ready = boolean(s.ready), state = member(a.state, authorizationStates), authorized = boolean(a.authorized);
  const application = s.application === null ? null : parseOwnApplication(s.application, owner);
  // Preserve the existing fail-closed UX. A parsed flag is never a server permission grant.
  return { version: 1, ready, application, access: { state, authorized: ready && authorized && state === 'active' && application?.status === 'approved' } };
}
export function parseH13ReviewCommand(value: unknown): H13ReviewCommand {
  const c = object(value, ['p_application', 'p_revision', 'p_decision', 'p_reason']);
  // PostgreSQL btrim's default removes ASCII spaces, not all JS whitespace.
  const reason = typeof c.p_reason === 'string' ? c.p_reason.replace(/^ +| +$/g, '') : c.p_reason;
  return { p_application: uuid(c.p_application), p_revision: revision(c.p_revision), p_decision: member(c.p_decision, reviewDecisions), p_reason: text(reason, 2000, 1) };
}
/** Shape/optimistic-state preflight only. The existing SQL still checks actor, readiness and locks. */
export function checkH13ReviewTarget(input: unknown, current: ManagerApplication): H13ReviewCommand {
  const command = parseH13ReviewCommand(input), application = parseManagerApplication(current);
  if (application.id !== command.p_application || application.status !== 'pending') throw new ContractError('forbidden');
  if (application.revision !== command.p_revision || application.revision === 2147483647) throw new ContractError('conflict');
  return command;
}
export type FinalizeRequest = { document_id: string; revision: number };
export function parseFinalizeRequest(value: unknown): FinalizeRequest {
  const r = object(value, ['document_id', 'revision']);
  // Existing Edge accepts safe integers; SQL int4 is narrower. Do not silently change the handler.
  return { document_id: uuid(r.document_id), revision: integer(r.revision, Number.MAX_SAFE_INTEGER) };
}
export const finalizerErrorCodes = ['input', 'authentication', 'permission', 'method', 'file', 'unavailable', 'not_confirmed'] as const;
export type FinalizeResponse = { ok: true; code: 'verified' } | { ok: false; code: typeof finalizerErrorCodes[number] };
export function parseFinalizeResponse(value: unknown): FinalizeResponse {
  const r = object(value, ['ok', 'code']);
  if (boolean(r.ok)) {
    if (r.code !== 'verified') throw new ContractError();
    return { ok: true, code: 'verified' };
  }
  return { ok: false, code: member(r.code, finalizerErrorCodes) };
}
