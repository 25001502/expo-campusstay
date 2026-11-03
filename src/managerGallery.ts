import { newLocalId } from './documents';
import type { Property } from './data';

export const MAX_PROPERTY_PHOTOS = 8;
export const MAX_PROPERTY_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_WORKSPACE_PHOTO_BYTES = 100 * 1024 * 1024;
export type PropertyPhoto = { id: string; propertyId: string; uri: string; kind: 'seed' | 'local'; name: string; size?: number; fingerprint?: string };
export type PropertyGallery = { photos: PropertyPhoto[]; coverPhotoId?: string };
export type ManagedProperty = Property & PropertyGallery;
export type PhotoAsset = { uri: string; fileName?: string | null; mimeType?: string; fileSize?: number; type?: string | null };
export type PhotoSource = 'library' | 'camera';
export type PhotoResource = { uri: string; size: number; fingerprint: string; available(): boolean; dispose(): void };
export type PhotoAdapter = {
  pick(source: PhotoSource, limit: number): Promise<{ canceled: boolean; assets?: PhotoAsset[] | null }>;
  prepare(asset: PhotoAsset, id: string): Promise<PhotoResource>;
  close(): void;
};
const messages = {
  type: 'Choose JPEG or PNG photos. HEIC, GIF and other formats are not supported.',
  size: 'Each photo must be no larger than 10 MB.',
  limit: 'A property can have up to 8 photos.',
  storage: 'There is not enough free space. Free some device storage and try again.',
  workspace: 'This workspace has reached its 100 MB photo limit. Remove unused photos first.',
  file: 'This photo is unavailable or unreadable. Choose it again.',
  duplicate: 'This photo is already in this gallery. No photos were changed.',
  permission: 'Camera access is needed to take a photo. You can also use Photo Library.',
  picker: 'Photo selection could not finish. Please try again.',
  cleanup: 'Temporary photos could not be removed. Please try again before adding photos.',
};
export class PhotoIssue extends Error {
  constructor(public readonly code: keyof typeof messages) { super(messages[code]); }
}
export const emptyGallery = (): PropertyGallery => ({ photos: [] });
export function propertyGallery(property: Property & Partial<PropertyGallery>): PropertyGallery {
  const photos = property.photos?.map((photo) => ({ ...photo })) ?? property.images.map((uri, index) => ({
    id: `${property.id}-seed-${index}`, propertyId: property.id, uri, kind: 'seed' as const, name: `Property photo ${index + 1}`,
  }));
  return { photos, coverPhotoId: property.coverPhotoId ?? photos[0]?.id };
}
export function withPropertyGallery(property: Property, gallery: PropertyGallery): ManagedProperty {
  if (gallery.photos.length > MAX_PROPERTY_PHOTOS || new Set(gallery.photos.map((photo) => photo.id)).size !== gallery.photos.length
    || gallery.photos.some((photo) => photo.propertyId !== property.id)
    || (gallery.photos.length > 0 && !gallery.photos.some((photo) => photo.id === gallery.coverPhotoId))) throw new PhotoIssue('file');
  const photos = gallery.photos.map((photo) => ({ ...photo }));
  const cover = photos.find((photo) => photo.id === gallery.coverPhotoId);
  return { ...property, photos, coverPhotoId: cover?.id, images: [...(cover ? [cover.uri] : []), ...photos.filter((photo) => photo.id !== cover?.id).map((photo) => photo.uri)] };
}
export function changeGallery(gallery: PropertyGallery, id: string, action: 'cover' | 'remove' | 'earlier' | 'later'): PropertyGallery {
  const index = gallery.photos.findIndex((photo) => photo.id === id);
  if (index < 0) return gallery;
  if (action === 'cover') return { ...gallery, coverPhotoId: id };
  const photos = [...gallery.photos];
  if (action === 'remove') photos.splice(index, 1);
  else {
    const target = index + (action === 'earlier' ? -1 : 1);
    if (target < 0 || target >= photos.length) return gallery;
    [photos[index], photos[target]] = [photos[target], photos[index]];
  }
  return { photos, coverPhotoId: photos.some((photo) => photo.id === gallery.coverPhotoId) ? gallery.coverPhotoId : photos[0]?.id };
}
export function photoMime(asset: PhotoAsset): 'image/jpeg' | 'image/png' {
  if (asset.type && asset.type !== 'image') throw new PhotoIssue('type');
  const name = asset.fileName?.trim() || asset.uri.split(/[?#]/)[0].split('/').pop() || '';
  const mime = asset.mimeType?.toLowerCase().split(';')[0];
  if (name && /\.[^.]+$/.test(name) && !/\.(jpe?g|png)$/i.test(name)) throw new PhotoIssue('type');
  const type = mime ?? (/\.png$/i.test(name) ? 'image/png' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : undefined);
  if (type !== 'image/jpeg' && type !== 'image/png') throw new PhotoIssue('type');
  if (asset.fileSize !== undefined && (!Number.isFinite(asset.fileSize) || asset.fileSize <= 0)) throw new PhotoIssue('file');
  if ((asset.fileSize ?? 0) > MAX_PROPERTY_PHOTO_BYTES) throw new PhotoIssue('size');
  return type;
}

// A workspace owns its copies. Draft removal never removes a saved/shared reference.
// No student attachment API or path enters this registry.
export function createPhotoWorkspace(adapter: PhotoAdapter) {
  const resources = new Map<string, { propertyId: string; resource: PhotoResource }>();
  const pending = new Set<string>();
  let busy = false, closed = false;
  function remove(id: string) {
    const entry = resources.get(id);
    if (!entry) return;
    try { entry.resource.dispose(); resources.delete(id); pending.delete(id); }
    catch { pending.add(id); }
  }
  function reconcile(galleries: readonly PropertyGallery[]) {
    const kept = new Set(galleries.flatMap((gallery) => gallery.photos.map((photo) => photo.id)));
    for (const id of resources.keys()) if (!kept.has(id)) remove(id);
  }
  function validate(propertyId: string, gallery: PropertyGallery) {
    for (const photo of gallery.photos) {
      if (photo.propertyId !== propertyId) throw new PhotoIssue('file');
      if (photo.kind === 'local') {
        const entry = resources.get(photo.id);
        if (!entry || entry.propertyId !== propertyId || entry.resource.uri !== photo.uri || !entry.resource.available()) throw new PhotoIssue('file');
      }
    }
  }
  return {
    reconcile, validate,
    async choose(propertyId: string, gallery: PropertyGallery, source: PhotoSource, stillActive: () => boolean, replaceId?: string): Promise<PropertyGallery> {
      if (busy || closed) return gallery;
      busy = true;
      const added: string[] = [];
      try {
        for (const id of pending) remove(id);
        if (pending.size) throw new PhotoIssue('cleanup');
        if (replaceId && !gallery.photos.some((photo) => photo.id === replaceId)) throw new PhotoIssue('file');
        const limit = replaceId ? 1 : MAX_PROPERTY_PHOTOS - gallery.photos.length;
        if (limit <= 0) throw new PhotoIssue('limit');
        const result = await adapter.pick(source, limit);
        if (result.canceled || !stillActive() || closed) return gallery;
        if (!result.assets?.length) throw new PhotoIssue('file');
        if (result.assets.length > limit) throw new PhotoIssue('limit');
        const photos: PropertyPhoto[] = [];
        for (const asset of result.assets) {
          photoMime(asset);
          const id = newLocalId('property-photo');
          const resource = await adapter.prepare(asset, id);
          resources.set(id, { propertyId, resource }); added.push(id);
          if (!stillActive() || closed) return gallery;
          if (resource.size > MAX_PROPERTY_PHOTO_BYTES) throw new PhotoIssue('size');
          if ([...resources.values()].reduce((sum, entry) => sum + entry.resource.size, 0) > MAX_WORKSPACE_PHOTO_BYTES) throw new PhotoIssue('workspace');
          if ([...gallery.photos, ...photos].some((photo) => photo.fingerprint && photo.fingerprint === resource.fingerprint)) throw new PhotoIssue('duplicate');
          photos.push({ id, propertyId, uri: resource.uri, kind: 'local', name: asset.fileName?.trim() || `Property photo.${photoMime(asset) === 'image/png' ? 'png' : 'jpg'}`, size: resource.size, fingerprint: resource.fingerprint });
        }
        const next = replaceId ? gallery.photos.map((photo) => photo.id === replaceId ? photos[0] : photo) : [...gallery.photos, ...photos];
        const coverPhotoId = gallery.coverPhotoId === replaceId ? photos[0].id : gallery.coverPhotoId ?? next[0]?.id;
        added.length = 0; // Ownership has transferred to the returned draft.
        return { photos: next, coverPhotoId };
      } finally {
        for (const id of added) remove(id);
        busy = false;
        if (closed) { reconcile([]); try { adapter.close(); } catch { /* next-start cleanup */ } }
      }
    },
    close() { closed = true; reconcile([]); try { adapter.close(); } catch { /* stale files retried on next workspace */ } },
  };
}
