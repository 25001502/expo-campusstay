export type AccountRegistration = { fullName: string; email: string; password: string; confirmPassword: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateAccount(fields: { email: string; password: string }) {
  const errors: { email?: string; password?: string } = {};
  if (!emailPattern.test(fields.email.trim())) errors.email = 'Enter a valid email address.';
  if (!fields.password) errors.password = 'Enter your password.';
  return errors;
}
export function validateAccountRegistration(fields: AccountRegistration) {
  const errors: ReturnType<typeof validateAccount> & { fullName?: string; confirmPassword?: string } = validateAccount(fields);
  if (!fields.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!fields.email.trim()) errors.email = 'Enter your email address.';
  if (fields.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!fields.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (fields.password !== fields.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}
export const AUTH_REDIRECT = 'campusstay://auth/confirm';
export const RECOVERY_REDIRECT = 'campusstay://auth/recovery';
class AccountLinkError extends Error { readonly code = 'invalid_auth_link'; }

export { readAuthConfig } from '../../config/account.cjs';

export function parseAuthCallback(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'campusstay:' || url.hostname !== 'auth' || !['/confirm', '/recovery'].includes(url.pathname) || url.port || url.username || url.password) return null;
  if (url.hash || url.searchParams.has('error') || url.searchParams.has('error_code')) throw new AccountLinkError('This account link is invalid or expired.');
  const codes = url.searchParams.getAll('code');
  const flowIds = url.searchParams.getAll('sb_flow_id');
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048 || flowIds.length > 1 || (flowIds[0] && !/^[A-Za-z0-9_-]{8,64}$/.test(flowIds[0]))) throw new AccountLinkError('This account link is incomplete.');
  return { code: codes[0], flowId: flowIds[0] || undefined, recovery: url.pathname === '/recovery' };
}

// No trusted server role model is deployed in H1.1. Intent and user metadata
// cannot grant manager/admin permissions. Preview is an explicit development tool.
export function canPreviewManager(development: boolean, flag: string | undefined, verified: boolean) {
  return development && flag === 'true' && verified;
}
