import {
  DocumentIssue, DOCUMENT_MESSAGES, copyAttachments, detectedDocumentType, newLocalId, validateDocumentInfo,
  type DocumentAttachments, type DocumentCategoryId, type LocalDocument,
} from './documents';

// Handles and URIs stay here, outside serializable application records.
export type BrowserFileHandle = Blob & { readonly name: string };
export type AttachmentSource = 'files' | 'library' | 'camera';
export type PickedDocument = { name?: string; mimeType?: string; size?: number; uri?: string; file?: BrowserFileHandle };
export type PickerResult = { canceled: boolean; assets?: PickedDocument[] | null };
export type LocalResource = {
  uri: string; size: number; prefix: Uint8Array; available(): boolean | Promise<boolean>;
  dispose(): void; openPdf?: () => boolean;
};
export type DocumentAdapter = {
  pick(source?: AttachmentSource): Promise<PickerResult>;
  prepare(asset: PickedDocument, id: string): Promise<LocalResource>;
  releasePicked(asset: PickedDocument): void;
};
export type SelectionResult = { status: 'selected'; document: LocalDocument } | { status: 'cancelled' | 'busy' } | { status: 'error'; message: string };
export type ImagePreview = { uri: string; name: string };
export type PreviewResult = { status: 'image'; preview: ImagePreview } | { status: 'opened' } | { status: 'error'; message: string };
type Entry = { owner: string; document: LocalDocument; resource: LocalResource; available: boolean };

export class AttachmentSession {
  private entries = new Map<string, Entry>();
  private closedOwners = new Set<string>();
  private epoch = 0;
  private pending = false;
  private pendingDisposals = new Map<string, LocalResource>();
  constructor(private adapter: DocumentAdapter) {}
  get busy() { return this.pending; }

  async choose(owner: string, category: DocumentCategoryId, source: AttachmentSource = 'files'): Promise<SelectionResult> {
    if (this.pending) return { status: 'busy' };
    if (this.closedOwners.has(owner)) return { status: 'cancelled' };
    this.pending = true;
    const epoch = this.epoch;
    let assets: PickedDocument[] = [];
    let candidate: LocalResource | undefined;
    let committed = false;
    try {
      this.retryDisposals();
      if (this.pendingDisposals.size) throw new DocumentIssue('cleanup');
      // No await before pick: browser selection must retain user activation.
      const result = await this.adapter.pick(source);
      assets = result.assets ?? [];
      if (result.canceled) return { status: 'cancelled' };
      // A picker may return after Leave/Log Out: do not create a new sensitive copy.
      if (this.epoch !== epoch || this.closedOwners.has(owner)) return { status: 'cancelled' };
      if (assets.length !== 1) throw new DocumentIssue('empty');
      const asset = assets[0];
      const expected = validateDocumentInfo(asset, false);
      const id = newLocalId('file');
      candidate = await this.adapter.prepare(asset, id);
      validateDocumentInfo({ ...asset, size: candidate.size });
      if (detectedDocumentType(candidate.prefix) !== expected) throw new DocumentIssue('content');
      if (!await candidate.available()) throw new DocumentIssue('unreadable');
      if (this.epoch !== epoch || this.closedOwners.has(owner)) return { status: 'cancelled' };
      const document: LocalDocument = { id, category, name: asset.name!.trim(), mimeType: expected, size: candidate.size, state: 'attached-local' };
      const previous = [...this.entries].filter(([, entry]) => entry.owner === owner && entry.document.category === category).map(([id]) => id);
      // Prefix bytes are transient validation data, never retained in state.
      candidate.prefix = new Uint8Array();
      this.entries.set(id, { owner, document, resource: candidate, available: true });
      committed = true;
      for (const previousId of previous) this.release(previousId);
      return { status: 'selected', document: { ...document } };
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && Object.hasOwn(DOCUMENT_MESSAGES, error.code)
        ? error.code as keyof typeof DOCUMENT_MESSAGES : 'unreadable';
      return { status: 'error', message: DOCUMENT_MESSAGES[code] };
    } finally {
      if (candidate && !committed) this.dispose(candidate);
      for (const asset of assets) { try { this.adapter.releasePicked(asset); } catch { /* never delete an unknown original as a fallback */ } }
      this.pending = false;
    }
  }

  private dispose(resource: LocalResource) {
    resource.prefix = new Uint8Array();
    // Aliased resources must remain alive while any owner/category still uses them.
    if ([...this.entries.values()].some((entry) => entry.resource.uri === resource.uri)) return;
    this.pendingDisposals.set(resource.uri, resource);
    try { resource.dispose(); this.pendingDisposals.delete(resource.uri); } catch { /* Retry without logging sensitive paths. */ }
  }
  private retryDisposals() {
    for (const resource of this.pendingDisposals.values()) this.dispose(resource);
  }
  private release(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    this.dispose(entry.resource);
  }
  remove(owner: string, id: string) {
    if (this.entries.get(id)?.owner === owner) this.release(id);
  }
  releaseOwner(owner: string) {
    this.closedOwners.add(owner);
    for (const [id, entry] of this.entries) if (entry.owner === owner) this.release(id);
    this.retryDisposals();
  }
  promote(draftId: string, applicationId: string, attachments: DocumentAttachments) {
    for (const document of Object.values(copyAttachments(attachments))) {
      const entry = this.entries.get(document.id);
      if (entry?.owner === draftId) entry.owner = applicationId;
    }
    this.releaseOwner(draftId);
  }
  commitFunding(editor: string, applicationId: string, document: LocalDocument | undefined, previousId?: string) {
    if (this.closedOwners.has(editor)) throw new Error('Funding editor closed. Reopen it to save changes.');
    if (this.closedOwners.has(applicationId)) throw new Error('Application is no longer available in this session.');
    // Validate before releasing anything. The saved original survives Cancel and failed replacements.
    if (document && !this.matches(document.id === previousId ? applicationId : editor, document)) throw new Error('Funding file unavailable. Replace or remove it.');
    if (previousId && previousId !== document?.id) this.remove(applicationId, previousId);
    if (document && document.id !== previousId) this.promote(editor, applicationId, { funding: document });
    else this.releaseOwner(editor);
  }
  status(owner: string, id: string) {
    const entry = this.entries.get(id);
    return entry?.owner === owner && entry.available ? 'attached-local' as const : 'unavailable' as const;
  }
  private owns(owner: string, document: LocalDocument) {
    const entry = this.entries.get(document.id);
    return entry?.owner === owner && entry.document.category === document.category
      && entry.document.name === document.name && entry.document.mimeType === document.mimeType && entry.document.size === document.size;
  }
  matches(owner: string, document: LocalDocument) {
    return this.owns(owner, document) && this.entries.get(document.id)?.available === true;
  }
  async inspect(owner: string, attachments: DocumentAttachments): Promise<DocumentAttachments> {
    const checked: DocumentAttachments = {};
    for (const document of Object.values(copyAttachments(attachments))) {
      const entry = this.entries.get(document.id);
      let available = false;
      try { available = this.owns(owner, document) && !!entry && await entry.resource.available(); } catch { /* unavailable local reference */ }
      if (entry?.owner === owner) entry.available = available;
      checked[document.category] = { ...document, state: available ? 'attached-local' : 'unavailable' };
    }
    return checked;
  }
  canPreview(owner: string, document: LocalDocument) {
    const entry = this.entries.get(document.id);
    return entry?.owner === owner && entry.available && (document.mimeType.startsWith('image/') || !!entry.resource.openPdf);
  }
  preview(owner: string, document: LocalDocument): PreviewResult {
    const entry = this.entries.get(document.id);
    if (entry?.owner !== owner || !entry.available) return { status: 'error', message: 'This temporary file is no longer available. Choose it again.' };
    try {
      if (entry.resource.available() !== true) { entry.available = false; return { status: 'error', message: 'This temporary file is no longer available. Choose it again.' }; }
    } catch { entry.available = false; return { status: 'error', message: 'This temporary file could not be opened. Choose it again.' }; }
    if (document.mimeType.startsWith('image/')) return { status: 'image', preview: { uri: entry.resource.uri, name: document.name } };
    try { if (entry.resource.openPdf?.()) return { status: 'opened' }; } catch { /* Preview may be blocked by the platform. */ }
    return { status: 'error', message: 'PDF preview is unavailable here. The file information remains available.' };
  }
  clear() {
    this.epoch += 1;
    for (const entry of this.entries.values()) this.closedOwners.add(entry.owner);
    for (const id of this.entries.keys()) this.release(id);
    this.retryDisposals();
  }
}
