import { DOCUMENT_CATEGORIES, isValidPhone, type PersonalInformation, type SubmittedApplication } from './application';
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
      canOpenApplication: !!property?.rooms.some((room) => room.id === application.selectedRoomId),
      categories: DOCUMENT_CATEGORIES.map((category) => ({ ...category, selected: application.selectedDocuments?.includes(category.id) ?? false })),
    };
  });
}

export const PROFILE_FAQS = [
  { id: 'find', question: 'How do I find and filter accommodation?', answer: 'Open Explore from the student tabs. Search by location or university and use Filters to narrow price, room type, distance, and amenities.' },
  { id: 'favorites', question: 'How do I save or compare properties?', answer: 'Tap the heart on a property to save it in Favorites. Select properties in Favorites and choose Compare. Favorites stay in this app session.' },
  { id: 'apply', question: 'How do I complete an application?', answer: 'Open a property, choose an available room, and complete the application steps. Review the details before saving. The record stays in this session; it is not sent to a provider and does not confirm a booking.' },
  { id: 'documents', question: 'What do document selections mean?', answer: 'Applications let you select document categories. These selections are not files, uploads, or verification. My Documents shows the categories linked to each saved application.' },
  { id: 'status', question: 'Where can I find my application status?', answer: 'Open Bookings and select Applications, then open your saved record. Provider review, decisions, and booking confirmation are not connected.' },
  { id: 'messages', question: 'How do messages work?', answer: 'Open Messages to view conversations. Messages you write remain in this session and are not delivered externally. No provider response is generated.' },
  { id: 'access', question: 'Do I need to sign in?', answer: 'You can use the student app without credentials. Account services, Google sign-in, password changes, and password recovery are not available yet.' },
  { id: 'logout', question: 'What happens when I log out?', answer: 'Profile → Log Out opens a confirmation. Cancel keeps your session. Log Out clears your applications and personal details, restores the starting favorites and conversation/notification history, and opens Login. Continue without signing in returns to Home.' },
] as const;
