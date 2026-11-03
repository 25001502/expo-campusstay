import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { randomUUID } from 'expo-crypto';
import { createNativeDocumentStorage, type NativeStorageBridge } from '../nativeDocumentStorage';
import { PROOF_LIMIT, PROOF_TYPES, VerificationIssue, type Evidence } from './domain';

// Distinct handles and lifecycle: never borrow a student AttachmentSession or owner.
export async function pickVerificationEvidence(): Promise<Evidence | null> {
  const storage = createNativeDocumentStorage(requireOptionalNativeModule<NativeStorageBridge>('CampusStayDocumentStorage'), () => Paths.availableDiskSpace);
  storage.ready();
  const result = await DocumentPicker.getDocumentAsync({ type: [...PROOF_TYPES], multiple: false, copyToCacheDirectory: Platform.OS !== 'android', base64: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  let resource: Awaited<ReturnType<typeof storage.prepare>> | undefined;
  try {
    if (!asset || (asset.size !== undefined && asset.size > PROOF_LIMIT)) throw new VerificationIssue('file');
    resource = await storage.prepare(asset, `manager-proof-${randomUUID()}`);
    if (resource.size > PROOF_LIMIT) throw new VerificationIssue('file');
    const bytes = await new File(resource.uri).bytes();
    const mime = asset.mimeType;
    if (!PROOF_TYPES.includes(mime as Evidence['mime'])) throw new VerificationIssue('file');
    // Release private native staging before network requests; keep a bounded RAM copy.
    const buffer = Uint8Array.from(bytes).buffer;
    return { name: asset.name, mime: mime as Evidence['mime'], bytes: buffer, dispose() { new Uint8Array(buffer).fill(0); } };
  } finally {
    resource?.dispose();
    if (asset?.uri?.startsWith('file://') && !/(?:\.\.|%2e|%2f|%5c)/i.test(asset.uri)) {
      const file = new File(asset.uri);
      if (file.parentDirectory.uri === new Directory(Paths.cache, 'DocumentPicker').uri) {
        try { if (file.exists) file.delete(); } catch { /* Only our disposable SDK picker copy. */ }
      }
    }
  }
}
