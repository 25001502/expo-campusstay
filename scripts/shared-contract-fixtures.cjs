// Synthetic offline inputs only. No account, network client or environment loading.
const owner = '10000000-0000-4000-8000-000000000001';
const applicationId = '20000000-0000-4000-8000-000000000001';
const documentId = '30000000-0000-4000-8000-000000000001';
const propertyId = '40000000-0000-4000-8000-000000000001';
const other = '50000000-0000-4000-8000-000000000001';
const application = (patch = {}) => ({
  id: applicationId, applicant_id: owner, full_name: 'Synthetic Applicant', phone: '+27 72 123 4567', business_name: 'Synthetic Residence', property_location: '1 Example Road', relationship: 'owner',
  revision: 3, status: 'pending', submitted_at: '2026-10-23T12:00:00+00:00', reviewed_at: null, review_reason: null,
  proof: { id: documentId, file_name: 'proof.pdf', mime_type: 'application/pdf', byte_size: 5 }, ...patch,
});
const state = (patch = {}) => ({ version: 1, ready: true, application: application(), access: { state: 'none', authorized: false }, ...patch });
const review = (patch = {}) => ({ p_application: applicationId, p_revision: 3, p_decision: 'needs_information', p_reason: 'Clarify the property management declaration.', ...patch });
const proposedReview = (patch = {}) => ({ contract: 'proposed-manager-review', version: 2, request_id: other, application_id: applicationId, expected_revision: 3, decision: 'approved', applicant_reason: 'The supplied management authority evidence was examined.', checklist: { schema_version: 1, applicant: true, business: true, authority: true }, ...patch });
const eligibility = (patch = {}) => ({
  contract: 'proposed-publication-eligibility', version: 1, property_id: propertyId, manager_id: owner, catalogue_ready: true, verification_ready: true,
  manager_application_status: 'approved', manager_authorization: 'active', assignment: { property_id: propertyId, manager_id: owner, state: 'active', trusted: true, current: true, primary: true },
  review: { status: 'approved', approved_revision: 4 }, publication: { state: 'published', revision: 4 }, approved_media_ready: true, ...patch,
});
module.exports = { owner, other, applicationId, documentId, propertyId, application, state, review, proposedReview, eligibility };
