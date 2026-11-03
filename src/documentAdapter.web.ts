import { DocumentIssue, DOCUMENT_MIME_TYPES, validateDocumentInfo } from './documents';
import type { DocumentAdapter, PickedDocument, PickerResult } from './attachmentSession';

// Use the browser's native input. We own its cancellation/focus listeners and
// remove it on every outcome (including browsers without the input cancel event).
function pickBrowserFile(): Promise<PickerResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = DOCUMENT_MIME_TYPES.join(','); input.multiple = false;
    input.style.display = 'none';
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: PickerResult) => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', focused);
      input.remove();
      resolve(result);
    };
    const selected = () => {
      const file = input.files?.[0];
      finish(file ? { canceled: false, assets: [{ name: file.name, size: file.size, mimeType: file.type, file }] } : { canceled: true });
    };
    const focused = () => { timer = setTimeout(() => { if (input.files?.length) selected(); else finish({ canceled: true }); }, 500); };
    input.addEventListener('change', selected, { once: true });
    input.addEventListener('cancel', () => finish({ canceled: true }), { once: true });
    window.addEventListener('focus', focused);
    document.body.appendChild(input);
    try { input.click(); } catch {
      input.remove(); window.removeEventListener('focus', focused); reject(new DocumentIssue('picker'));
    }
  });
}
export const documentAdapter: DocumentAdapter = {
  pick: pickBrowserFile,
  async prepare(asset: PickedDocument) {
    const file = asset.file;
    if (!file) throw new DocumentIssue('unreadable');
    validateDocumentInfo({ ...asset, size: file.size });
    const prefix = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const uri = URL.createObjectURL(file);
    let released = false;
    return {
      uri, prefix, size: file.size,
      available: () => !released && file.size > 0,
      dispose: () => { if (!released) { released = true; URL.revokeObjectURL(uri); } },
      openPdf: () => {
        if (released) return false;
        const viewer = window.open('', '_blank');
        if (!viewer) return false;
        viewer.opener = null;
        viewer.location.href = uri;
        return true;
      },
    };
  },
  releasePicked: () => {}, // The input never creates an object URL; prepare owns it.
};
