export const FUNDING_SOURCES = ['self-funded', 'nsfas', 'parent-guardian', 'sponsor'] as const;
// Legacy sources remain readable; all new NSFAS declarations use a separate status.
export type FundingSource = typeof FUNDING_SOURCES[number] | 'nsfas-confirmed' | 'nsfas-pending';
export const NSFAS_STATUSES = ['pending', 'confirmed', 'unsuccessful'] as const;
export type NsfasStatus = typeof NSFAS_STATUSES[number];
export type FundingDeclaration = { source: FundingSource | null; nsfasStatus?: NsfasStatus | null; paymentDiscussionRequested: boolean };
export const FUNDING_LABELS: Record<FundingSource, string> = {
  'self-funded': 'Self-funded', nsfas: 'NSFAS', 'nsfas-confirmed': 'NSFAS — confirmation declared',
  'nsfas-pending': 'NSFAS — awaiting confirmation', 'parent-guardian': 'Parent/Guardian funded',
  sponsor: 'Other bursary or sponsor',
};
export const emptyFunding = (): FundingDeclaration => ({ source: null, paymentDiscussionRequested: false });
export function normalizeFunding(funding: FundingDeclaration | undefined): FundingDeclaration {
  const source = funding?.source;
  if (source === 'nsfas-confirmed' || source === 'nsfas-pending') return { source: 'nsfas', nsfasStatus: source === 'nsfas-confirmed' ? 'confirmed' : 'pending', paymentDiscussionRequested: funding?.paymentDiscussionRequested === true };
  const normalized = { source: source && FUNDING_SOURCES.includes(source) ? source : null, paymentDiscussionRequested: funding?.paymentDiscussionRequested === true };
  return normalized.source === 'nsfas' ? { ...normalized, nsfasStatus: funding?.nsfasStatus ?? null } : normalized;
}
export function validateFunding(funding: FundingDeclaration) {
  if (funding.source !== null && ![...FUNDING_SOURCES, 'nsfas-confirmed', 'nsfas-pending'].includes(funding.source)) return 'Choose an available funding source.';
  const value = normalizeFunding(funding);
  return value.source === 'nsfas' && (!value.nsfasStatus || !NSFAS_STATUSES.includes(value.nsfasStatus)) ? 'Choose your current NSFAS funding status.' : undefined;
}
export function fundingStatusLabel(funding: FundingDeclaration | undefined) {
  const value = normalizeFunding(funding);
  if (value.source !== 'nsfas') return value.source ? 'Student-provided · Not verified' : 'Not declared';
  return value.nsfasStatus === 'pending' ? 'Awaiting confirmation' : value.nsfasStatus === 'confirmed' ? 'Student reports confirmed' : value.nsfasStatus === 'unsuccessful' ? 'Student reports unsuccessful' : 'Not declared';
}
export function fundingLabel(funding: FundingDeclaration | undefined) {
  return funding?.source ? FUNDING_LABELS[funding.source] ?? 'Not declared' : 'Not declared';
}
export function paymentDiscussionLabel(funding: FundingDeclaration | undefined) {
  return funding?.paymentDiscussionRequested ? 'Requested · Recorded here only' : 'Not requested';
}

export const FUNDING_REVIEW_STATUSES = ['Not reviewed', 'Needs information', 'Reviewed locally'] as const;
export type FundingReviewStatus = typeof FUNDING_REVIEW_STATUSES[number];
