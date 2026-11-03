import type { Property, Room } from './data';
import { getCurrentRooms, getHistoricalRoom, getRoomLabel, isRetiredRoom } from './rooms';
import { DOCUMENT_CATEGORIES, copyAttachments, newLocalId, validLocalDocument, type DocumentAttachments, type DocumentCategoryId, type LocalDocument } from './documents';
import { emptyFunding, validateFunding, type FundingDeclaration } from './funding';
export { DOCUMENT_CATEGORIES, type DocumentCategoryId } from './documents';

export const APPLICATION_STEPS = ['Room', 'Personal', 'Documents', 'Emergency', 'Review'] as const;
export type ApplicationStep = 0 | 1 | 2 | 3 | 4;

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
  draftId: string;
  propertyId: string;
  selectedRoomId: string | null;
  personal: PersonalInformation;
  selectedDocuments: DocumentCategoryId[];
  attachments: DocumentAttachments;
  funding: FundingDeclaration;
  emergency: EmergencyContact;
  currentStep: ApplicationStep;
};

export type ApplicationErrors = Partial<Record<
  | 'selectedRoomId'
  | keyof PersonalInformation
  | 'documents'
  | 'funding'
  | `document.${DocumentCategoryId}`
  | `emergency.${keyof EmergencyContact}`,
  string
>>;

export type SubmittedApplication = Omit<ApplicationDraft, 'currentStep' | 'draftId' | 'attachments' | 'funding'> & {
  attachments?: DocumentAttachments;
  funding?: FundingDeclaration;
  id: string;
  submittedAt: string;
  status: 'saved-locally';
};

export type ApplicationReview = {
  propertyName: string;
  roomType: string;
  roomPrice: number;
  personal: PersonalInformation;
  documents: { id: DocumentCategoryId; label: string; required: boolean; selected: boolean; attachment?: LocalDocument; legacySelection: boolean }[];
  funding: FundingDeclaration;
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
  funding: FundingDeclaration;
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
    draftId: newLocalId('draft'),
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
    attachments: {},
    funding: emptyFunding(),
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
    const fundingError = validateFunding(draft.funding);
    if (fundingError) errors.funding = fundingError;
    const missing = DOCUMENT_CATEGORIES.filter(
      (category) => category.required && !validLocalDocument(draft.attachments?.[category.id], category.id),
    );
    if (missing.length) {
      errors.documents = `Attach all required documents (${missing.length} remaining).`;
      missing.forEach((category) => {
        errors[`document.${category.id}`] = `Choose a valid file for ${category.label}.`;
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
  if (errors.funding || errors.documents || Object.keys(errors).some((key) => key.startsWith('document.'))) return 2;
  if (Object.keys(errors).some((key) => key.startsWith('emergency.'))) return 3;
  return undefined;
}

export function normalizeApplicationDraft(draft: ApplicationDraft): ApplicationDraft {
  return {
    ...draft,
    attachments: copyAttachments(draft.attachments),
    funding: { ...(draft.funding ?? emptyFunding()) },
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
      selected: validLocalDocument(draft.attachments?.[category.id], category.id),
      attachment: copyAttachments(draft.attachments)[category.id],
      legacySelection: draft.selectedDocuments?.includes(category.id) ?? false,
    })),
    funding: { ...(draft.funding ?? emptyFunding()) },
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
    selectedDocuments: [...(normalized.selectedDocuments ?? [])],
    attachments: copyAttachments(normalized.attachments),
    funding: { ...normalized.funding },
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
    funding: { ...(application.funding ?? emptyFunding()) },
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
