import { PROOF_LIMIT, PROOF_TYPES, type VerificationFields, type ManagerApplication, type ProofType, type VerificationState } from '../../shared/contracts/v1/manager-verification';
export { PROOF_LIMIT, PROOF_TYPES };
export type { ProofType, VerificationFields, VerificationState };
export const emptyFields = (): VerificationFields => ({ phone: '', business_name: '', property_location: '', relationship: '' });
export type VerificationApplication = ManagerApplication;
export type Evidence = { name: string; mime: ProofType; bytes: ArrayBuffer; dispose(): void };
export const editable = (application: VerificationApplication | null) => !application || ['draft', 'needs_information'].includes(application.status);
export function validateVerification(fields: VerificationFields) {
  const errors: Partial<Record<keyof VerificationFields, string>> = {};
  if (!/^\+?[0-9 ()-]{7,24}$/.test(fields.phone.trim()) || fields.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid contact number.';
  if (!fields.business_name.trim() || fields.business_name.trim().length > 160) errors.business_name = 'Enter an accommodation or business name (up to 160 characters).';
  if (fields.property_location.trim().length < 5 || fields.property_location.trim().length > 500) errors.property_location = 'Enter the property address or location (5–500 characters).';
  if (!['owner', 'authorised_manager'].includes(fields.relationship)) errors.relationship = 'Select your relationship to the property.';
  return errors;
}
export class VerificationIssue extends Error {
  constructor(readonly code: 'setup' | 'request' | 'changed' | 'file' | 'permission' | 'expired' | 'upload' | 'limit') { super(code); }
}
export function verificationMessage(error: unknown): string {
  if (error instanceof VerificationIssue) {
    if (error.code === 'setup') return 'Manager verification is awaiting secure setup. No submission has been made.';
    if (error.code === 'changed') return 'Your application changed. Refresh it before making another change.';
    if (error.code === 'file') return 'Choose a PDF, JPG or PNG file no larger than 5 MB whose content matches its format.';
    if (error.code === 'permission') return 'This action is not available for your account or application status.';
    if (error.code === 'expired') return 'Your session has changed. Sign in again before continuing.';
    if (error.code === 'upload') return 'We could not confirm the proof upload. Refresh your application to check the saved proof before retrying.';
    if (error.code === 'limit') return 'You have reached the supporting proof upload limit. Please try again later.';
  }
  return 'We could not confirm this request. Refresh your application before trying again. No new submission is confirmed.';
}
export function validEvidence(evidence: Evidence) {
  const bytes = new Uint8Array(evidence.bytes);
  const signature = evidence.mime === 'application/pdf' ? [37, 80, 68, 70, 45] : evidence.mime === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255];
  const extension = evidence.name.split('.').pop()?.toLowerCase();
  return evidence.name.length > 0 && evidence.name.length <= 160 && !/[/\\]/.test(evidence.name)
    && !Array.from(evidence.name).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    && bytes.length > 0 && bytes.length <= PROOF_LIMIT && PROOF_TYPES.includes(evidence.mime)
    && (evidence.mime === 'application/pdf' ? extension === 'pdf' : evidence.mime === 'image/png' ? extension === 'png' : ['jpg', 'jpeg'].includes(extension ?? ''))
    && signature.every((byte, i) => bytes[i] === byte);
}
