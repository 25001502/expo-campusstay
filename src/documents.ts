export const DOCUMENT_CATEGORIES = [
  { id: 'student-id', label: 'Student ID', required: true },
  { id: 'registration', label: 'Proof of Registration', required: true },
  { id: 'identity', label: 'ID / Passport', required: true },
  { id: 'funding', label: 'Proof of Funding', required: false },
] as const;
export type DocumentCategoryId = typeof DOCUMENT_CATEGORIES[number]['id'];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type DocumentMimeType = typeof DOCUMENT_MIME_TYPES[number];
export type LocalDocument = {
  id: string; category: DocumentCategoryId; name: string; mimeType: DocumentMimeType;
  size: number; state: 'attached-local' | 'unavailable';
};
export type DocumentAttachments = Partial<Record<DocumentCategoryId, LocalDocument>>;
export function copyAttachments(attachments: DocumentAttachments | undefined): DocumentAttachments {
  const copy: DocumentAttachments = {};
  for (const { id: category } of DOCUMENT_CATEGORIES) {
    const item = attachments?.[category];
    if (item) copy[category] = { id: item.id, category: item.category, name: item.name, mimeType: item.mimeType, size: item.size, state: item.state };
  }
  return copy;
}

export const DOCUMENT_MESSAGES = {
  type: 'Choose a PDF, JPG, JPEG or PNG file.', size: 'Choose a file no larger than 10 MB.',
  metadata: 'File information is missing or invalid. Choose another file.',
  content: 'The file content does not match its PDF or image format. Choose another file.',
  unreadable: 'This file could not be read. Check access and choose it again.',
  storage: 'Not enough device storage to attach this file. Free some space and try again. Your previous file is unchanged.',
  staging: 'This file could not be saved on this device. Your previous file is unchanged. Please try again.',
  cleanup: 'Files could not be prepared. Close and reopen CampusStay, then try again. Your previous file is unchanged.',
  nativeStorage: 'Attachments are unavailable in this version. Open the installed CampusStay app to choose files.',
  empty: 'No file was selected. Please choose a file.',
  picker: 'The file picker could not open. Please try again.',
  imageType: 'Choose a JPG, JPEG or PNG image. HEIC, HEIF and other image formats are not supported.',
  cameraPermission: 'Camera access is off. Allow it in device settings, or use Photo Library or Choose Files.',
  camera: 'The camera could not open. Try Photo Library or Choose Files instead.',
  library: 'Photo Library could not open. Try Choose Files instead.',
} as const;
export class DocumentIssue extends Error {
  constructor(public readonly code: keyof typeof DOCUMENT_MESSAGES) { super(DOCUMENT_MESSAGES[code]); }
}
let localSequence = 0;
export function newLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${(++localSequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function detectedDocumentType(prefix: Uint8Array): DocumentMimeType | undefined {
  if ([37, 80, 68, 70, 45].every((byte, index) => prefix[index] === byte)) return 'application/pdf';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => prefix[index] === byte)) return 'image/png';
  if (prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255) return 'image/jpeg';
  return undefined;
}
export function documentExtensionType(name: string): DocumentMimeType | undefined {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension === 'pdf' ? 'application/pdf' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : undefined;
}
export function validateDocumentInfo(info: { name?: string; mimeType?: string; size?: number }, requireSize = true) {
  if (!info.name?.trim() || info.name.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(info.name)) throw new DocumentIssue('metadata');
  const expected = documentExtensionType(info.name);
  if (!expected) throw new DocumentIssue('type');
  const supplied = info.mimeType?.trim().toLowerCase().split(';')[0];
  if (supplied && supplied !== expected) throw new DocumentIssue('type');
  if (info.size !== undefined) {
    if (!Number.isSafeInteger(info.size) || info.size <= 0) throw new DocumentIssue('metadata');
    if (info.size > MAX_DOCUMENT_BYTES) throw new DocumentIssue('size');
  } else if (requireSize) throw new DocumentIssue('metadata');
  return expected;
}
export function validLocalDocument(document: LocalDocument | undefined, category: DocumentCategoryId) {
  if (!document || document.category !== category || !document.id || document.state !== 'attached-local') return false;
  try { return validateDocumentInfo(document) === document.mimeType; } catch { return false; }
}
export function formatDocumentSize(size: number) {
  if (!Number.isFinite(size) || size < 0) return 'Size unavailable';
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : size >= 1024 ? `${Math.ceil(size / 1024)} KB` : `${size} bytes`;
}
export function formatDocumentType(mimeType: DocumentMimeType) {
  return mimeType === 'application/pdf' ? 'PDF' : mimeType === 'image/png' ? 'PNG' : 'JPEG';
}

// Availability is owner-scoped. Metadata or a legacy category selection alone is not a usable file.
export function getDocumentSummary(owner: string, attachments: DocumentAttachments | undefined,
  status: (owner: string, id: string) => 'attached-local' | 'unavailable') {
  const counts = { required: 0, optional: 0, missingRequired: 0, unavailable: 0 };
  for (const category of DOCUMENT_CATEGORIES) {
    const document = attachments?.[category.id];
    const available = validLocalDocument(document, category.id) && !!document && status(owner, document.id) === 'attached-local';
    if (available) counts[category.required ? 'required' : 'optional']++;
    else {
      if (category.required) counts.missingRequired++;
      if (document) counts.unavailable++;
    }
  }
  return counts;
}
