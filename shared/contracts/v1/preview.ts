import type { ReviewDecision } from './manager-verification';

/** Frontend-only preview types. No RPC grants, persistence or server authenticity. */
export const PREVIEW_CONTRACT = { version: 1, implementation: 'frontend-only-preview' } as const;
export type ReviewerConfirmations = { applicant: boolean; business: boolean; authority: boolean };
export const previewPropertyStatuses = ['awaiting_review', 'changes_requested', 'approved', 'rejected', 'published_example'] as const;
export type PreviewPropertyReviewStatus = typeof previewPropertyStatuses[number];
export type PropertyDecision = 'approved' | 'changes_requested' | 'rejected';
export type FrontendPreview<T> = { version: 1; source: 'synthetic'; data: T };
export type PreviewReviewDecision = { decision: ReviewDecision; confirmations: ReviewerConfirmations; confirmation: 'confirmed-in-dialog' };
