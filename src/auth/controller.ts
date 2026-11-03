import { classifyError, problem, reportDiagnostic, UserFacingError, type AppProblem } from '../errors';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { AUTH_REDIRECT, RECOVERY_REDIRECT, parseAuthCallback, type AccountRegistration } from './account';

export type Account = { id: string; email: string; name: string };
export type AuthSnapshot = {
  phase: 'loading' | 'signed-out' | 'verification' | 'authenticated' | 'recovery' | 'error';
  user: Account | null; email: string; busy: boolean; error: string; problem: AppProblem | null;
  // A session-only navigation preference, never an authorisation decision.
  intent: 'student' | 'manager';
};
type AuthApi = Pick<SupabaseClient['auth'], 'getSession' | 'getUser' | 'signUp' | 'signInWithPassword' | 'signOut' | 'resend' | 'resetPasswordForEmail' | 'exchangeCodeForSession' | 'updateUser' | 'onAuthStateChange'>;
const initial = (): AuthSnapshot => ({ phase: 'loading', user: null, email: '', busy: false, error: '', problem: null, intent: 'student' });
export class AccountController {
  private snapshot = initial();
  private listeners = new Set<() => void>();
  private epoch = 0;
  private unsubscribe?: () => void;
  private usedCodes = new Set<string>();
  private passwordChanged = false;
  private queuedUrl: string | null = null;
  constructor(private api: AuthApi | null, _setupError = '') {}
  clearError = () => { if (!this.snapshot.busy) this.set({ error: '', problem: null }); };
  private unavailable() { const issue = problem('configuration'); this.set({ ...initial(), phase: 'signed-out', error: issue.message, problem: issue }); }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<AuthSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach((listener) => listener()); }
  private signedOut(intent: AuthSnapshot['intent'] = 'student') { this.passwordChanged = false; this.set({ ...initial(), phase: 'signed-out', intent }); }

  async start(initialUrl: string | null = null) {
    this.unsubscribe?.();
    if (!this.api) { this.unavailable(); return; }
    const { data } = this.api.onAuthStateChange((event, session) => {
      if (this.snapshot.busy || event === 'INITIAL_SESSION') return;
      const epoch = this.epoch;
      // Never await another Auth call inside GoTrue's locked event callback.
      setTimeout(() => {
        if (epoch !== this.epoch) return;
        if (event === 'SIGNED_OUT') { this.epoch++; this.signedOut(); }
        else if (session && ['authenticated', 'recovery'].includes(this.snapshot.phase) && ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) {
          void this.run(async (version) => this.accept(session, version, event === 'PASSWORD_RECOVERY' || this.snapshot.phase === 'recovery'), true);
        }
      }, 0);
    });
    this.unsubscribe = () => data.subscription.unsubscribe();
    await this.run(async (version) => {
      if (initialUrl && await this.exchange(initialUrl, version)) return;
      const { data: restored, error } = await this.api!.getSession();
      if (error) throw error;
      await this.accept(restored.session, version);
    }, true);
  }
  dispose() { this.epoch++; this.unsubscribe?.(); this.unsubscribe = undefined; this.queuedUrl = null; this.snapshot = { ...this.snapshot, busy: false }; }

  private async run(work: (epoch: number) => Promise<void>, restoring = false) {
    if (this.snapshot.busy) return false;
    if (!this.api) { this.unavailable(); return false; }
    const version = ++this.epoch;
    this.set({ busy: true, error: '', problem: null });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([work(version), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new UserFacingError('timeout')), 25000);
      })]);
      return version === this.epoch;
    } catch (error) {
      if (version === this.epoch) {
        this.epoch++; // Late network/storage completions cannot reopen protected UI.
        const issue = classifyError(error);
        reportDiagnostic('account', issue.code);
        this.set({ busy: false, error: issue.message, problem: issue, ...(restoring || issue.code === 'expired' ? { phase: 'error' as const, user: null } : {}) });
      }
      return false;
    } finally {
      clearTimeout(timer);
      if (version === this.epoch) this.set({ busy: false });
      if (!this.snapshot.busy && this.queuedUrl) {
        const url = this.queuedUrl; this.queuedUrl = null;
        void this.handleUrl(url);
      }
    }
  }
  private async accept(session: Session | null, version: number, recovery = false) {
    if (!session) { if (version === this.epoch) this.signedOut(); return; }
    // getSession is only a cache. Validate identity/confirmation against Auth.
    const { data, error } = await this.api!.getUser(session.access_token);
    if (error || !data.user || data.user.id !== session.user.id) throw error ?? new UserFacingError('expired');
    if (version !== this.epoch) return;
    if (!data.user.email || !data.user.email_confirmed_at) {
      this.set({ phase: 'verification', user: null, email: data.user.email ?? '' });
      return;
    }
    const user = { id: data.user.id, email: data.user.email, name: typeof data.user.user_metadata?.full_name === 'string' ? data.user.user_metadata.full_name : '' };
    this.set({ user, email: user.email, phase: recovery ? 'recovery' : 'authenticated' });
  }
  signIn = (email: string, password: string, intent: AuthSnapshot['intent'] = 'student') => {
    if (this.snapshot.user) return Promise.resolve(false);
    return this.run(async (version) => {
      this.set({ intent });
      const { data, error } = await this.api!.signInWithPassword({ email: email.trim(), password });
      if (error?.code === 'email_not_confirmed') { if (version === this.epoch) this.set({ phase: 'verification', user: null, email: email.trim() }); return; }
      if (error || !data.session) throw error ?? new UserFacingError('service');
      await this.accept(data.session, version);
    });
  };
  register = (fields: AccountRegistration, intent: AuthSnapshot['intent'] = 'student') => {
    if (this.snapshot.user) return Promise.resolve(false);
    return this.run(async (version) => {
      this.set({ intent });
      const { data, error } = await this.api!.signUp({ email: fields.email.trim(), password: fields.password,
        options: { emailRedirectTo: AUTH_REDIRECT, data: { full_name: fields.fullName.trim() } } });
      if (error) throw error;
      // Never treat validation, a user object or auto-confirm configuration as a
      // completed verification journey. Confirm email must be enabled server-side.
      if (data.session) {
        const result = await this.api!.signOut({ scope: 'local' });
        if (result.error) throw result.error;
      }
      if (version === this.epoch) this.set({ phase: 'verification', user: null, email: fields.email.trim(),
        error: data.session ? problem('configuration').message : '', problem: data.session ? problem('configuration') : null });
    });
  };
  resend = () => this.run(async () => {
    const { error } = await this.api!.resend({ type: 'signup', email: this.snapshot.email, options: { emailRedirectTo: AUTH_REDIRECT } });
    if (error) throw error;
  });
  requestReset = (email: string, intent: AuthSnapshot['intent'] = 'student') => this.run(async () => {
    if (!this.snapshot.user) this.set({ intent });
    const { error } = await this.api!.resetPasswordForEmail(email.trim(), { redirectTo: RECOVERY_REDIRECT });
    if (error) throw error;
  });
  private async exchange(url: string, version: number) {
    const callback = parseAuthCallback(url);
    if (!callback) return false;
    if (this.usedCodes.has(callback.code)) return true;
    this.usedCodes.add(callback.code);
    const { data, error } = await this.api!.exchangeCodeForSession(callback.code, callback.flowId ? { flowId: callback.flowId } : undefined);
    if (error) throw error;
    if (!data.session) throw new UserFacingError('service');
    // The SDK derives redirectType from its locally stored PKCE verifier.
    await this.accept(data.session, version, 'redirectType' in data && data.redirectType === 'recovery');
    return true;
  }
  handleUrl = (url: string) => {
    if (this.snapshot.busy) { this.queuedUrl = url; return Promise.resolve(false); }
    return this.run(async (version) => { await this.exchange(url, version); }, true);
  };
  updatePassword = (password: string) => this.run(async (version) => {
    if (this.snapshot.phase !== 'recovery') throw new UserFacingError('expired');
    if (password.length < 8) throw new UserFacingError('password');
    if (this.passwordChanged) throw new UserFacingError('passwordUpdated');
    const { error } = await this.api!.updateUser({ password });
    if (error) throw error;
    // Require a normal sign-in after recovery; no route can bypass this state.
    this.passwordChanged = true;
    try {
      const signedOut = await this.api!.signOut({ scope: 'local' });
      if (signedOut.error) throw signedOut.error;
    } catch { throw new UserFacingError('passwordUpdated'); }
    if (version === this.epoch) this.signedOut(this.snapshot.intent);
  });
  signOut = () => this.run(async (version) => {
    const { error } = await this.api!.signOut({ scope: 'local' });
    if (error) throw error;
    if (version === this.epoch) this.signedOut();
  });
  backToSignIn = async () => {
    const intent = this.snapshot.intent;
    if (!this.api) { this.signedOut(); this.unavailable(); return; }
    if (await this.signOut()) this.set({ intent });
  };
}
