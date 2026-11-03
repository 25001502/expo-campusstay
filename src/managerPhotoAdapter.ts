import * as ImagePicker from 'expo-image-picker';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { Image, Platform } from 'react-native';
import { newLocalId } from './documents';
import { MAX_PROPERTY_PHOTO_BYTES, PhotoIssue, photoMime, type PhotoAdapter } from './managerGallery';

const live = new Set<string>();
// Separate from both native student staging and picker caches. These SDK-private
// Documents copies are session-only, but remain OS-backup eligible (see report).
export function createManagerPhotoAdapter(): PhotoAdapter {
  let directory: Directory | undefined;
  const pending = new Set<File>();
  function ready() {
    for (const file of pending) {
      try { if (file.exists) file.delete(); pending.delete(file); } catch { throw new PhotoIssue('cleanup'); }
    }
    if (directory) return directory;
    if (Paths.availableDiskSpace < 10 * 1024 * 1024) throw new PhotoIssue('storage');
    const root = new Directory(Paths.document, 'campusstay-manager-photos-v1');
    root.create({ intermediates: true, idempotent: true });
    for (const child of root.list()) {
      if (!(child instanceof Directory) || !/^property-photos-[a-z0-9-]+$/.test(child.name)) throw new PhotoIssue('cleanup');
      if (!live.has(child.uri)) child.delete();
    }
    const next = new Directory(root, newLocalId('property-photos'));
    next.create(); live.add(next.uri); directory = next;
    return next;
  }
  return {
    async pick(source, limit) {
      try {
        ready();
        if (Platform.OS === 'web') throw new PhotoIssue('picker');
        // Results recovered after activity destruction have no trustworthy editor
        // association. Never attach them to whichever property happens to be open.
        if (Platform.OS === 'android') await ImagePicker.getPendingResultAsync();
        const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false,
          allowsMultipleSelection: source === 'library' && limit > 1, selectionLimit: limit, orderedSelection: true,
          quality: 1, base64: false, exif: false,
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current };
        if (source === 'camera') {
          let permission = await ImagePicker.getCameraPermissionsAsync();
          if (!permission.granted && permission.canAskAgain) permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) throw new PhotoIssue('permission');
          return await ImagePicker.launchCameraAsync(options);
        }
        return await ImagePicker.launchImageLibraryAsync(options);
      } catch (error) { throw error instanceof PhotoIssue ? error : new PhotoIssue('picker'); }
    },
    async prepare(asset, id) {
      const mime = photoMime(asset);
      if (!asset.uri.startsWith('file://')) throw new PhotoIssue('file');
      let target: File | undefined;
      let candidateOwned = false;
      try {
        const source = new File(asset.uri);
        // Only the SDK's picker copies are admitted. In particular, student
        // private staging and arbitrary Documents paths cannot become photos.
        if (/(?:\.\.|%2e|%2f|%5c)/i.test(asset.uri) || ![Paths.cache.uri, new Directory(Paths.cache, 'ImagePicker').uri].includes(source.parentDirectory.uri)) throw new PhotoIssue('file');
        if (!source.exists || !Number.isFinite(source.size) || source.size <= 0) throw new PhotoIssue('file');
        if (source.size > MAX_PROPERTY_PHOTO_BYTES) throw new PhotoIssue('size');
        if (Paths.availableDiskSpace < source.size + 10 * 1024 * 1024) throw new PhotoIssue('storage');
        target = new File(ready(), `${id}.${mime === 'image/png' ? 'png' : 'jpg'}`);
        if (target.exists) throw new PhotoIssue('file');
        candidateOwned = true;
        await source.copy(target);
        if (!target.exists || target.size !== source.size || target.size > MAX_PROPERTY_PHOTO_BYTES) throw new PhotoIssue('file');
        const handle = target.open(FileMode.ReadOnly);
        let prefix: Uint8Array;
        try { prefix = handle.readBytes(8); } finally { handle.close(); }
        const signature = mime === 'image/png' ? [137,80,78,71,13,10,26,10] : [255,216,255];
        if (!signature.every((byte, index) => prefix[index] === byte)) throw new PhotoIssue('type');
        const dimensions = await Image.getSize(target.uri);
        if (!(dimensions.width > 0 && dimensions.height > 0)) throw new PhotoIssue('file');
        const size = target.size, fingerprint = target.md5;
        if (!fingerprint) throw new PhotoIssue('file');
        const owned = target;
        return { uri: owned.uri, size, fingerprint, available: () => owned.exists && owned.size === size,
          dispose: () => { if (owned.exists) owned.delete(); } };
      } catch (error) {
        try { if (candidateOwned && target?.exists) target.delete(); } catch { if (target) pending.add(target); }
        if (error instanceof PhotoIssue) throw error;
        if (Paths.availableDiskSpace < 10 * 1024 * 1024) throw new PhotoIssue('storage');
        throw new PhotoIssue('file');
      }
    },
    close() {
      if (!directory) return;
      const owned = directory;
      live.delete(owned.uri);
      if (owned.exists) owned.delete();
      directory = undefined;
    },
  };
}
