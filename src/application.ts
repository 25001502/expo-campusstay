import type { Property, Room } from './data';
import { getCurrentRooms, getHistoricalRoom, getRoomLabel, isRetiredRoom } from './rooms';

export const APPLICATION_STEPS = ['Room', 'Personal', 'Documents', 'Emergency', 'Review'] as const;
export type ApplicationStep = 0 | 1 | 2 | 3 | 4;

export const DOCUMENT_CATEGORIES = [
  { id: 'student-id', label: 'Student ID', required: true },
  { id: 'registration', label: 'Proof of Registration', required: true },
  { id: 'identity', label: 'ID / Passport', required: true },
  { id: 'funding', label: 'Proof of Funding', required: false },
] as const;

export type DocumentCategoryId = typeof DOCUMENT_CATEGORIES[number]['id'];

export type PersonalInformation = {
  fullName: string;
  studentNumber: string;
  universityId: string;
  phone: string;
  email: string;
};

export type EmergencyContact = {
  fullName: string;
  relationship: string;
  phone: string;
};

export type ApplicationDraft = {
  propertyId: string;
  selectedRoomId: string | null;
  personal: PersonalInformation;
  selectedDocuments: DocumentCategoryId[];
  emergency: EmergencyContact;
  currentStep: ApplicationStep;
};

export type ApplicationErrors = Partial<Record<
  | 'selectedRoomId'
  | keyof PersonalInformation
  | 'documents'
  | `document.${DocumentCategoryId}`
  | `emergency.${keyof EmergencyContact}`,
  string
>>;

export type SubmittedApplication = Omit<ApplicationDraft, 'currentStep'> & {
  id: string;
  submittedAt: string;
  status: 'saved-locally';
};

export type ApplicationReview = {
  propertyName: string;
  roomType: string;
  roomPrice: number;
  personal: PersonalInformation;
  documents: { id: DocumentCategoryId; label: string; required: boolean; selected: boolean }[];
  emergency: EmergencyContact;
};

export type SubmittedApplicationSummary = {
  id: string;
  propertyName: string;
  city: string;
  roomType: string;
  roomPrice: number;
  submittedAt: string;
  statusLabel: 'Saved locally';
  isBooking: false;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPhone(value: string) {
  const trimmed = value.trim();
  if (!/^[+\d][\d\s().-]*$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function createApplicationDraft(property: Property, selectedRoomId?: string): ApplicationDraft {
  const selectedRoom = selectedRoomId
    ? getCurrentRooms(property).find((room) => room.id === selectedRoomId && room.available > 0)
    : undefined;

  return {
    propertyId: property.id,
    selectedRoomId: selectedRoom?.id ?? null,
    personal: {
      fullName: '',
      studentNumber: '',
      universityId: property.university,
      phone: '',
      email: '',
    },
    selectedDocuments: [],
    emergency: { fullName: '', relationship: 'Parent', phone: '' },
    currentStep: 0,
  };
}

export function getAvailableSelectedRoom(property: Property, draft: ApplicationDraft): Room | undefined {
  if (draft.propertyId !== property.id || !draft.selectedRoomId) return undefined;
  return getCurrentRooms(property).find((room) => room.id === draft.selectedRoomId && room.available > 0);
}

export function validateApplicationStep(
  step: ApplicationStep,
  draft: ApplicationDraft,
  property: Property,
): ApplicationErrors {
  const errors: ApplicationErrors = {};

  if (step === 0 && !getAvailableSelectedRoom(property, draft)) {
    errors.selectedRoomId = getCurrentRooms(property).some((room) => room.available > 0)
      ? 'Select an available room to continue.'
      : 'This property has no rooms available for an application.';
  }

  if (step === 1) {
    if (!draft.personal.fullName.trim()) errors.fullName = 'Enter your full name.';
    if (!draft.personal.studentNumber.trim()) errors.studentNumber = 'Enter your student number.';
    if (!draft.personal.universityId.trim()) errors.universityId = 'Select your university.';
    if (!draft.personal.phone.trim()) errors.phone = 'Enter your phone number.';
    else if (!isValidPhone(draft.personal.phone)) errors.phone = 'Enter a valid phone number with 7 to 15 digits.';
    if (!draft.personal.email.trim()) errors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(draft.personal.email.trim())) errors.email = 'Enter a valid email address.';
  }

  if (step === 2) {
    const missing = DOCUMENT_CATEGORIES.filter(
      (category) => category.required && !draft.selectedDocuments.includes(category.id),
    );
    if (missing.length) {
      errors.documents = `Select all required document categories (${missing.length} remaining).`;
      missing.forEach((category) => {
        errors[`document.${category.id}`] = `${category.label} is required.`;
      });
    }
  }

  if (step === 3) {
    if (!draft.emergency.fullName.trim()) errors['emergency.fullName'] = 'Enter the contact name.';
    if (!draft.emergency.relationship.trim()) errors['emergency.relationship'] = 'Select a relationship.';
    if (!draft.emergency.phone.trim()) errors['emergency.phone'] = 'Enter the contact phone number.';
    else if (!isValidPhone(draft.emergency.phone)) {
      errors['emergency.phone'] = 'Enter a valid phone number with 7 to 15 digits.';
    }
  }

  return errors;
}

export function validateApplication(draft: ApplicationDraft, property: Property) {
  return ([0, 1, 2, 3] as ApplicationStep[]).reduce<ApplicationErrors>(
    (allErrors, step) => ({ ...allErrors, ...validateApplicationStep(step, draft, property) }),
    {},
  );
}

export function firstInvalidApplicationStep(errors: ApplicationErrors): ApplicationStep | undefined {
  if (errors.selectedRoomId) return 0;
  if (errors.fullName || errors.studentNumber || errors.universityId || errors.phone || errors.email) return 1;
  if (errors.documents || Object.keys(errors).some((key) => key.startsWith('document.'))) return 2;
  if (Object.keys(errors).some((key) => key.startsWith('emergency.'))) return 3;
  return undefined;
}

export function normalizeApplicationDraft(draft: ApplicationDraft): ApplicationDraft {
  return {
    ...draft,
    personal: {
      ...draft.personal,
      fullName: draft.personal.fullName.trim(),
      studentNumber: draft.personal.studentNumber.trim(),
      phone: draft.personal.phone.trim(),
      email: draft.personal.email.trim(),
    },
    emergency: {
      ...draft.emergency,
      fullName: draft.emergency.fullName.trim(),
      relationship: draft.emergency.relationship.trim(),
      phone: draft.emergency.phone.trim(),
    },
  };
}

export function buildApplicationReview(draft: ApplicationDraft, property: Property): ApplicationReview | undefined {
  const room = getAvailableSelectedRoom(property, draft);
  if (!room) return undefined;
  return {
    propertyName: property.name,
    roomType: getRoomLabel(room),
    roomPrice: room.price,
    personal: { ...draft.personal },
    documents: DOCUMENT_CATEGORIES.map((category) => ({
      ...category,
      selected: draft.selectedDocuments.includes(category.id),
    })),
    emergency: { ...draft.emergency },
  };
}

export function generateDemoApplicationId(submittedAt: string, sequence: number) {
  const timestamp = new Date(submittedAt).getTime();
  const safeTimestamp = Number.isFinite(timestamp) ? timestamp : 0;
  return `CS-LOCAL-${safeTimestamp.toString(36).toUpperCase()}-${String(sequence).padStart(2, '0')}`;
}

export function createSubmittedApplication(
  draft: ApplicationDraft,
  submittedAt: string,
  sequence: number,
): SubmittedApplication {
  if (draft.selectedRoomId && isRetiredRoom(draft.propertyId, draft.selectedRoomId)) {
    throw new Error('This room is no longer listed for new applications.');
  }
  const normalized = normalizeApplicationDraft(draft);
  return {
    id: generateDemoApplicationId(submittedAt, sequence),
    propertyId: normalized.propertyId,
    selectedRoomId: normalized.selectedRoomId,
    personal: normalized.personal,
    selectedDocuments: [...normalized.selectedDocuments],
    emergency: normalized.emergency,
    submittedAt,
    status: 'saved-locally',
  };
}

export function addSubmittedApplication(
  applications: readonly SubmittedApplication[],
  application: SubmittedApplication,
) {
  return applications.some((item) => item.id === application.id)
    ? [...applications]
    : [application, ...applications];
}

export function getSubmittedApplicationSummary(
  application: SubmittedApplication,
  property: Property,
): SubmittedApplicationSummary | undefined {
  if (application.status !== 'saved-locally' || application.propertyId !== property.id || !application.selectedRoomId) return undefined;
  const room = getHistoricalRoom(property, application.selectedRoomId);
  if (!room) return undefined;
  return {
    id: application.id,
    propertyName: property.name,
    city: property.city,
    roomType: `${getRoomLabel(room)}${isRetiredRoom(property.id, room.id) ? ' · No longer listed' : ''}`,
    roomPrice: room.price,
    submittedAt: application.submittedAt,
    statusLabel: 'Saved locally',
    isBooking: false,
  };
}

export function isSubmittedApplicationABooking() {
  return false;
}

export function formatApplicationDate(value: string) {
  const date = new Date(value);
  return value.trim() && Number.isFinite(date.getTime())
    ? date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Date unavailable';
}
