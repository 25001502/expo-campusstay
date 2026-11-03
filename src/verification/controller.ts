import { editable, emptyFields, validEvidence, validateVerification, VerificationIssue, verificationMessage, type Evidence, type VerificationApplication, type VerificationFields, type VerificationState } from './domain';
export type Reservation = { id: string; object_name: string; mime_type: string };
export interface VerificationApi {
  state(): Promise<VerificationState>;
  save(fields: VerificationFields, revision: number | null): Promise<VerificationApplication>;
  reserve(application: VerificationApplication, evidence: Evidence): Promise<Reservation>;
  upload(reservation: Reservation, evidence: Evidence): Promise<void>;
  finalize(reservation: Reservation, application: VerificationApplication): Promise<void>;
  submit(application: VerificationApplication): Promise<void>;
}
export type VerificationSnapshot = {
  phase: 'loading' | 'ready' | 'unavailable' | 'error'; data: VerificationState | null;
  fields: VerificationFields; step: number; busy: '' | 'saving' | 'choosing' | 'uploading' | 'submitting' | 'refreshing';
  errors: ReturnType<typeof validateVerification>; error: string; notice: string; selectedName: string;
  dirty: boolean; conflict: boolean;
};
export class VerificationController {
  private snapshot: VerificationSnapshot = { phase: 'loading', data: null, fields: emptyFields(), step: 0, busy: '', errors: {}, error: '', notice: '', selectedName: '', dirty: false, conflict: false };
  private listeners = new Set<() => void>();
  private alive = true;
  private mounts = 0;
  private evidence?: Evidence;
  constructor(private api: VerificationApi) {}
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  retain = () => {
    this.mounts++;
    return () => { this.mounts--; queueMicrotask(() => { if (!this.mounts) this.dispose(); }); };
  };
  private set(patch: Partial<VerificationSnapshot>) { if (this.alive) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach((fn) => fn()); } }
  private check() { if (!this.alive) throw new VerificationIssue('expired'); }
  dispose = () => {
    this.alive = false;
    try { this.evidence?.dispose(); }
    finally {
      this.evidence = undefined; this.listeners.clear();
      this.snapshot = { ...this.snapshot, data: null, fields: emptyFields(), selectedName: '', error: '', notice: '', errors: {}, busy: '', dirty: false, conflict: false };
    }
  };
  private async run(busy: VerificationSnapshot['busy'], work: () => Promise<void>) {
    if (!this.alive || this.snapshot.busy) return false;
    this.set({ busy, error: '', notice: '' });
    try { await work(); this.check(); return true; }
    catch (error) { this.set({ error: verificationMessage(error), ...(error instanceof VerificationIssue && error.code === 'setup' ? { phase: 'unavailable' as const, data: null } : {}) }); return false; }
    finally { this.set({ busy: '', selectedName: '' }); }
  }
  refresh = () => this.run('refreshing', async () => {
    // A failed revalidation must remove previously granted UI access.
    try {
      const data = await this.api.state(); this.check();
      const conflict = this.snapshot.dirty && data.application?.revision !== this.snapshot.data?.application?.revision;
      this.set({ data, phase: data.ready ? 'ready' : 'unavailable', conflict: this.snapshot.conflict || conflict,
        ...(conflict ? { error: 'Your saved application changed. Reload it to discard unsaved edits and continue.' } : {}),
        ...(!this.snapshot.dirty && data.application ? { fields: this.fieldsOf(data.application) } : {}) });
    } catch (error) { this.set({ data: null, phase: error instanceof VerificationIssue && error.code === 'setup' ? 'unavailable' : 'error' }); throw error; }
  });
  reload = () => { if (this.snapshot.busy) return; this.set({ dirty: false, conflict: false }); return this.refresh(); };
  private fieldsOf(a: VerificationApplication): VerificationFields { return { phone: a.phone, business_name: a.business_name, property_location: a.property_location, relationship: a.relationship }; }
  update = (key: keyof VerificationFields, value: string) => {
    if (this.snapshot.busy || this.snapshot.phase !== 'ready' || !editable(this.snapshot.data?.application ?? null)) return;
    this.set({ fields: { ...this.snapshot.fields, [key]: value }, dirty: true, errors: { ...this.snapshot.errors, [key]: undefined }, error: '', notice: '' });
  };
  move = (step: number) => {
    if (this.snapshot.busy) return;
    const errors = validateVerification(this.snapshot.fields);
    const relevant = step === 1 ? { ...(errors.phone ? { phone: errors.phone } : {}) } : step === 2 ? errors : {};
    this.set({ errors: relevant }); if (!Object.keys(relevant).length) this.set({ step: Math.max(0, Math.min(2, step)) });
  };
  private requireEditable() {
    this.check();
    if (this.snapshot.phase !== 'ready' || !this.snapshot.data?.ready) throw new VerificationIssue('setup');
    if (this.snapshot.conflict) throw new VerificationIssue('changed');
    if (!editable(this.snapshot.data.application)) throw new VerificationIssue('permission');
  }
  private acceptApplication(application: VerificationApplication) {
    this.check(); const data = this.snapshot.data;
    if (!data) throw new VerificationIssue('setup');
    this.set({ data: { ...data, application }, fields: this.fieldsOf(application), dirty: false, conflict: false });
  }
  private async saveDraft() {
    this.requireEditable();
    const application = await this.api.save(this.snapshot.fields, this.snapshot.data?.application?.revision ?? null);
    this.acceptApplication(application); return application;
  }
  save = () => this.run('saving', async () => { await this.saveDraft(); this.set({ notice: 'Draft saved to your account.' }); });
  choose = (pick: () => Promise<Evidence | null>) => this.run('choosing', async () => {
    this.requireEditable();
    // Invoke native/browser selection synchronously from the original tap.
    const evidence = await pick(); this.evidence = evidence ?? undefined;
    try {
      this.check(); if (!evidence) return;
      if (!validEvidence(evidence)) throw new VerificationIssue('file');
      this.set({ selectedName: evidence.name });
      const application = await this.saveDraft(); this.check();
      this.set({ busy: 'uploading', selectedName: evidence.name });
      const reservation = await this.api.reserve(application, evidence); this.check();
      await this.api.upload(reservation, evidence); this.check();
      await this.api.finalize(reservation, application); this.check();
      const data = await this.api.state(); this.check();
      if (!data.application?.proof || data.application.proof.id !== reservation.id) throw new VerificationIssue('request');
      this.set({ data, notice: 'Supporting proof uploaded securely.' });
    } finally { evidence?.dispose(); this.evidence = undefined; }
  });
  submit = () => this.run('submitting', async () => {
    this.requireEditable(); const errors = validateVerification(this.snapshot.fields); this.set({ errors });
    if (Object.keys(errors).length) { this.set({ step: errors.phone ? 0 : 1 }); return; }
    if (!this.snapshot.data?.application?.proof) { this.set({ error: 'Upload supporting proof before submitting.', step: 2 }); return; }
    const application = await this.saveDraft(); this.check();
    await this.api.submit(application); this.check();
    const data = await this.api.state(); this.check();
    if (data.application?.status !== 'pending') throw new VerificationIssue('request');
    this.set({ data, notice: 'Application submitted' });
  });
}
