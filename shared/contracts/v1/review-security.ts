import { boolean, ContractError, integer, member, object, revision, text, uuid, version } from './core';
import { parseManagerApplication, reviewDecisions, type ManagerApplication, type ReviewDecision } from './manager-verification';
import type { ReviewerConfirmations } from './preview';

/** H1.5B1 forward migration implementation, local only; no transport or browser authorization. */
export const REVIEW_SECURITY_CONTRACT = { version: 2, implementation: 'local-sql', deployment: 'not-deployed' } as const;
export type ReviewCommandV2 = {
  contract: 'manager-review'; version: 2; request_id: string; application_id: string;
  expected_revision: number; decision: ReviewDecision; applicant_reason: string;
  checklist: ReviewerConfirmations & { schema_version: 1 };
};
/** Backend policy counts Unicode code points, not the preview's UTF-16 units. */
export function parseReviewReason(value: unknown): string {
  if (typeof value !== 'string') throw new ContractError();
  const reason = text(value.replace(/^ +| +$/g, ''), 2000, 20);
  const placeholders = new Set(['good', 'okay', 'ok', 'yes', 'approved', 'approve', 'rejected', 'reject', 'test', 'testing', 'placeholder']);
  const words = reason.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (new Set(words.filter(word => Array.from(word).length > 1 && !placeholders.has(word) && !/^(.)\1+$/u.test(word))).size < 3) throw new ContractError();
  return reason;
}
export function parseReviewCommandV2(value: unknown): ReviewCommandV2 {
  const c = object(value, ['contract', 'version', 'request_id', 'application_id', 'expected_revision', 'decision', 'applicant_reason', 'checklist']);
  version(c.version, 2);
  if (c.contract !== 'manager-review') throw new ContractError();
  const p = object(c.checklist, ['schema_version', 'applicant', 'business', 'authority']); version(p.schema_version, 1);
  const checklist = { schema_version: 1 as const, applicant: boolean(p.applicant), business: boolean(p.business), authority: boolean(p.authority) };
  const decision = member(c.decision, reviewDecisions);
  if (decision === 'approved' && (!checklist.applicant || !checklist.business || !checklist.authority)) throw new ContractError();
  return { contract: 'manager-review', version: 2, request_id: uuid(c.request_id), application_id: uuid(c.application_id), expected_revision: revision(c.expected_revision), decision, applicant_reason: parseReviewReason(c.applicant_reason), checklist };
}
export type ReviewResponseV2 = { version: 2; request_id: string; application: ManagerApplication };
export function parseReviewResponseV2(value: unknown): ReviewResponseV2 {
  const r = object(value, ['version', 'request_id', 'application']); version(r.version, 2);
  return { version: 2, request_id: uuid(r.request_id), application: parseManagerApplication(r.application) };
}
export type AccessCommandV2 = { version: 2; request_id: string; user_id: string; expected_version: number; state: 'active' | 'suspended' | 'revoked'; reason: string };
export function parseAccessCommandV2(value: unknown): AccessCommandV2 {
  const r = object(value, ['version', 'request_id', 'user_id', 'expected_version', 'state', 'reason']); version(r.version, 2);
  return { version: 2, request_id: uuid(r.request_id), user_id: uuid(r.user_id), expected_version: integer(r.expected_version, 2147483647, 1), state: member(r.state, ['active', 'suspended', 'revoked']), reason: parseReviewReason(r.reason) };
}
export type NoteWriteCommand = { application_id: string; application_revision: number; note_revision: number; note: string };
/** Private reviewer operation only. Never add notes to the public application DTO. */
export function parseNoteWriteCommand(value: unknown): NoteWriteCommand {
  const r = object(value, ['application_id', 'application_revision', 'note_revision', 'note']);
  return { application_id: uuid(r.application_id), application_revision: revision(r.application_revision), note_revision: revision(r.note_revision), note: text(r.note, 4000) };
}
