import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo';
import { DocumentIssue, DOCUMENT_MIME_TYPES } from './documents';
import type { DocumentAdapter, PickedDocument } from './attachmentSession';
import { pickNativeImage } from './nativeImagePicker';
import { createNativeDocumentStorage, type NativeStorageBridge } from './nativeDocumentStorage';

const storage = createNativeDocumentStorage(requireOptionalNativeModule<NativeStorageBridge>('CampusStayDocumentStorage'), () => Paths.availableDiskSpace);
// Sweep stale native session files at startup, even if no application is opened.
// Missing module or cleanup failure never blocks Home; attachment selection explains it.
try { storage.ready(); } catch { /* retried before selection */ }

function deleteOwnedFile(file: File) {
  try { if (file.exists) file.delete(); } catch { /* OS cleanup may have already removed or locked a cache copy. */ }
}
function releasePickerCopy(asset: PickedDocument) {
  if (!asset.uri?.startsWith('file://') || /(?:\.\.|%2e|%2f|%5c)/i.test(asset.uri)) return;
  // Only SDK-created copies directly inside this app's private picker caches.
  // External content:// references and original user documents are never deleted.
  const directories = ['DocumentPicker', 'ImagePicker'].map((name) => new Directory(Paths.cache, name).uri);
  const file = new File(asset.uri);
  if (directories.includes(file.parentDirectory.uri)) deleteOwnedFile(file);
}
export const documentAdapter: DocumentAdapter = {
  pick: async (source = 'files') => {
    storage.ready();
    if (source !== 'files') return pickNativeImage(source, releasePickerCopy);
    try {
      // Android SAF is read directly by the native staging module. iOS uses
      // the SDK's private picker copy as a source, never as the retained copy.
      return await DocumentPicker.getDocumentAsync({ type: [...DOCUMENT_MIME_TYPES], copyToCacheDirectory: Platform.OS !== 'android', multiple: false, base64: false });
    } catch { throw new DocumentIssue('picker'); }
  },
  prepare: storage.prepare,
  releasePicked: releasePickerCopy,
};
