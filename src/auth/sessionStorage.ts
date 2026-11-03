export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// Small encrypted entries accommodate older iOS Keychain value-size limits.
// All operations are serialized; a manifest commits a complete generation.
export function createSessionStorage(secure: KeyValueStorage, newId: () => string): KeyValueStorage {
  let pending: Promise<unknown> = Promise.resolve();
  const serial = <T,>(work: () => Promise<T>): Promise<T> => {
    const next = pending.then(work, work);
    pending = next.catch(() => {});
    return next;
  };
  const readManifest = async (key: string) => {
    const raw = await secure.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('id' in value) || !('count' in value)
      || typeof value.id !== 'string' || !/^[A-Za-z0-9-]+$/.test(value.id)
      || typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count < 1 || value.count > 128) throw new Error('Secure session storage is damaged.');
    return { id: value.id, count: value.count };
  };
  const chunks = (key: string, manifest: { id: string; count: number }) => Array.from({ length: manifest.count }, (_, index) => `${key}.${manifest.id}.${index}`);
  return {
    getItem: (key) => serial(async () => {
      try {
        const manifest = await readManifest(key);
        if (!manifest) return null;
        const values = await Promise.all(chunks(key, manifest).map((part) => secure.getItem(part)));
        if (values.some((value) => value === null)) throw new Error('Secure session storage is incomplete.');
        return values.join('');
      } catch (error) {
        // Invalidate an unreadable pointer, then fail closed for this attempt.
        // A later sign-out/retry can proceed without trusting truncated tokens.
        await secure.removeItem(key).catch(() => {});
        throw error;
      }
    }),
    setItem: (key, value) => serial(async () => {
      // 400 UTF-16 code units stay below 2KB even for non-ASCII session metadata.
      const count = Math.max(1, Math.ceil(value.length / 400));
      if (count > 128) throw new Error('Secure session exceeds the supported size.');
      const old = await readManifest(key), next = { id: newId(), count };
      const parts = chunks(key, next);
      try {
        for (let index = 0; index < count; index++) await secure.setItem(parts[index], value.slice(index * 400, (index + 1) * 400));
        await secure.setItem(key, JSON.stringify(next));
      } catch (error) {
        await Promise.allSettled(parts.map((part) => secure.removeItem(part)));
        throw error;
      }
      if (old) await Promise.allSettled(chunks(key, old).map((part) => secure.removeItem(part)));
    }),
    removeItem: (key) => serial(async () => {
      // A corrupt pointer must not prevent explicit sign-out from invalidating
      // stored access. Unreferenced encrypted chunks cannot restore a session.
      let old: { id: string; count: number } | null = null;
      try { old = await readManifest(key); } catch { /* Delete the invalid pointer below. */ }
      await secure.removeItem(key);
      if (old) await Promise.allSettled(chunks(key, old).map((part) => secure.removeItem(part)));
    }),
  };
}
