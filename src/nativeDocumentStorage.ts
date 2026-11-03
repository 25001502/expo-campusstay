import { DocumentIssue, DOCUMENT_MESSAGES, validateDocumentInfo } from './documents';
import type { LocalResource, PickedDocument } from './attachmentSession';

export type NativeStorageBridge = {
  initialize(): boolean;
  stage(uri: string, id: string, mime: string): Promise<{ code: string; uri?: string; size?: number; prefix?: number[] }>;
  available(id: string, size: number): boolean;
  remove(id: string): boolean;
  retryCleanup(): boolean;
};

// The native module owns paths, backup policy, stale-session cleanup and bounded copying.
// Only transient handles enter this adapter; application records receive metadata alone.
export function createNativeDocumentStorage(native: NativeStorageBridge | null, availableSpace?: () => number) {
  const pending = new Set<string>();
  function ready() {
    if (!native) throw new DocumentIssue('nativeStorage');
    let clean = false;
    try {
      clean = native.initialize();
      for (const id of pending) if (native.remove(id)) pending.delete(id);
      clean = native.retryCleanup() && clean && pending.size === 0;
    } catch { /* Fail closed without exposing native paths/errors. */ }
    if (!clean) {
      // Directory creation can fail before stage() has a candidate to classify.
      // Use the installed SDK's independent volume reading when it is available.
      let free: number | undefined;
      try { free = availableSpace?.(); } catch { /* unknown is not zero */ }
      if (free !== undefined && Number.isFinite(free) && free >= 0 && free < 1024 * 1024) throw new DocumentIssue('storage');
      throw new DocumentIssue('cleanup');
    }
  }
  function remove(id: string) {
    pending.add(id);
    try { if (native?.remove(id)) pending.delete(id); } catch { /* retained for retry */ }
    if (pending.has(id)) throw new DocumentIssue('cleanup');
  }
  return {
    ready,
    async prepare(asset: PickedDocument, id: string): Promise<LocalResource> {
      ready();
      if (!asset.uri || !/^(file|content):\/\//.test(asset.uri)) throw new DocumentIssue('unreadable');
      const mime = validateDocumentInfo(asset, false);
      let result: Awaited<ReturnType<NativeStorageBridge['stage']>>;
      try { result = await native!.stage(asset.uri, id, mime); }
      catch {
        // A bridge rejection may arrive after a successful native copy.
        // IDs are generated internally per attempt, so only this candidate is released.
        try { remove(id); } catch { /* retained for cleanup retry */ }
        throw new DocumentIssue('staging');
      }
      if (result.code !== 'ok') {
        const code = Object.hasOwn(DOCUMENT_MESSAGES, result.code) ? result.code as keyof typeof DOCUMENT_MESSAGES : 'staging';
        throw new DocumentIssue(code);
      }
      try {
        validateDocumentInfo({ ...asset, size: result.size });
        if (!result.uri?.startsWith('file://') || !result.prefix || !native!.available(id, result.size!)) throw new DocumentIssue('staging');
        const size = result.size!;
        return { uri: result.uri, size, prefix: new Uint8Array(result.prefix),
          available: () => native!.available(id, size), dispose: () => remove(id) };
      } catch (error) {
        try { remove(id); } catch { /* tracked; next selection is blocked until cleanup succeeds */ }
        throw error;
      }
    },
  };
}
