import { DOCUMENT_CATEGORIES, getSubmittedApplicationSummary, isValidPhone, type PersonalInformation, type SubmittedApplication } from './application';
import { copyAttachments, validLocalDocument } from './documents';
import { universities, type Property } from './data';

export type ProfileDetails = PersonalInformation;
export type ProfileErrors = Partial<Record<keyof ProfileDetails, string>>;
export const PROFILE_LIMITS = { fullName: 100, email: 254, phone: 40, studentNumber: 40, universityId: 40 } as const;

export function createEmptyProfile(): ProfileDetails {
  return { fullName: '', email: '', phone: '', universityId: '', studentNumber: '' };
}

export function normalizeProfile(details: ProfileDetails): ProfileDetails {
  return {
    fullName: details.fullName.trim(), email: details.email.trim(), phone: details.phone.trim(),
    universityId: details.universityId.trim(), studentNumber: details.studentNumber.trim(),
  };
}

export function validateProfile(details: ProfileDetails): ProfileErrors {
  const normalized = normalizeProfile(details);
  const errors: ProfileErrors = {};
  for (const key of Object.keys(PROFILE_LIMITS) as (keyof ProfileDetails)[]) {
    if (normalized[key].length > PROFILE_LIMITS[key]) errors[key] = `Use ${PROFILE_LIMITS[key]} characters or fewer.`;
    else if (Array.from(normalized[key]).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) errors[key] = 'Remove unsupported control characters.';
  }
  if (!errors.email && normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) errors.email = 'Enter a valid email address.';
  if (!errors.phone && normalized.phone && !isValidPhone(normalized.phone)) errors.phone = 'Enter a phone number with 7 to 15 digits.';
  if (!errors.universityId && normalized.universityId && !universities.some((university) => university.id === normalized.universityId)) errors.universityId = 'Select an available university.';
  return errors;
}

export function profileReducer(state: ProfileDetails, action: { type: 'save'; details: ProfileDetails } | { type: 'reset' }): ProfileDetails {
  if (action.type === 'reset') return createEmptyProfile();
  return Object.keys(validateProfile(action.details)).length ? state : normalizeProfile(action.details);
}

export function profilesEqual(left: ProfileDetails, right: ProfileDetails) {
  return (Object.keys(PROFILE_LIMITS) as (keyof ProfileDetails)[]).every((key) => left[key] === right[key]);
}

export function getApplicationDocumentGroups(applications: readonly SubmittedApplication[], properties: readonly Property[]) {
  return applications.map((application) => {
    const property = properties.find((item) => item.id === application.propertyId);
    return {
      applicationId: application.id,
      property,
      canOpenApplication: !!property && !!getSubmittedApplicationSummary(application, property),
      categories: DOCUMENT_CATEGORIES.map((category) => ({ ...category,
        attachment: copyAttachments(application.attachments)[category.id],
        selected: validLocalDocument(application.attachments?.[category.id], category.id),
        legacySelection: application.selectedDocuments?.includes(category.id) ?? false,
      })),
    };
  });
}

export const PROFILE_FAQS = [
  { id: 'find', question: 'How do I find and filter accommodation?', answer: 'Open Explore from the student tabs. Search by location or university and use Filters to narrow price, room type, distance, and amenities.' },
  { id: 'favorites', question: 'How do I save or compare properties?', answer: 'Tap the heart on a property to save it in Favorites. Select properties in Favorites and choose Compare. Favorites stay in this app session.' },
  { id: 'apply', question: 'How do I complete an application?', answer: 'Open a property, choose an available room, and complete the application steps. Review the details before saving. The record stays in this session; it is not sent to a provider and does not confirm a booking.' },
  { id: 'documents', question: 'How do application attachments work?', answer: 'Choose PDF, JPG, JPEG or PNG files, up to 10 MB each, within an application. My Documents shows their filenames and temporary availability for this session. Files are not sent to a provider or verified, and may become unavailable after restart or cache cleanup.' },
  { id: 'status', question: 'Where can I find my application status?', answer: 'Open Bookings and select Applications, then open your saved record. Provider review, decisions, and booking confirmation are not connected.' },
  { id: 'messages', question: 'How do messages work?', answer: 'Open Messages to view conversations. Messages you write remain in this session and are not delivered externally. No provider response is generated.' },
  { id: 'access', question: 'Do I need to sign in?', answer: 'Yes. Use your shared CampusStay account with a confirmed email. Students and accommodation managers use the same registration and sign-in system. Forgot password on Sign In requests a recovery email. Google sign-in is not offered.' },
  { id: 'logout', question: 'What happens when I log out?', answer: 'Profile → Log Out opens a confirmation. Cancel keeps your session. Successful sign-out removes saved account access on this device and clears current local applications and personal details. Sign in again with your existing account to continue. Other devices are not signed out.' },
] as const;
