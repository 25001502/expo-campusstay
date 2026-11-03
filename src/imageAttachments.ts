import { DocumentIssue, documentExtensionType, newLocalId, validateDocumentInfo } from './documents';
import type { PickedDocument } from './attachmentSession';

type ImageAsset = { uri: string; fileName?: string | null; mimeType?: string; fileSize?: number; type?: string | null };
export function normalizeImageAttachment(asset: ImageAsset): PickedDocument {
  if (asset.type && asset.type !== 'image') throw new DocumentIssue('imageType');
  const mime = asset.mimeType?.toLowerCase().split(';')[0];
  const providedName = asset.fileName?.trim();
  const uriName = asset.uri.split(/[?#]/)[0].split('/').pop() ?? '';
  const inferred = documentExtensionType(providedName || uriName);
  if (mime && mime !== 'image/jpeg' && mime !== 'image/png') throw new DocumentIssue('imageType');
  if (providedName && !/\.(jpe?g|png)$/i.test(providedName)) throw new DocumentIssue('imageType');
  const type = mime ?? inferred;
  if (type !== 'image/jpeg' && type !== 'image/png') throw new DocumentIssue('imageType');
  const name = providedName || `document-photo-${newLocalId('image')}.${type === 'image/png' ? 'png' : 'jpg'}`;
  const document: PickedDocument = { uri: asset.uri, name, mimeType: type, size: asset.fileSize };
  validateDocumentInfo(document, false);
  return document;
}
