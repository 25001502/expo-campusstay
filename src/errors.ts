// Messages are closed, reviewed copy. Never render an arbitrary exception message.
const problems = {
  configuration: { kind: 'service', message: 'Account services are temporarily unavailable. Please try again later.', retryable: false },
  credentials: { kind: 'authentication', message: 'Email or password is incorrect.', retryable: false },
  unverified: { kind: 'authentication', message: 'Confirm your email before signing in.', retryable: false },
  expired: { kind: 'authentication', message: 'Your session has expired. Sign in again to continue.', retryable: false },
  link: { kind: 'authentication', message: 'This account link is invalid or expired. Request a new email and open the latest link on the device where you made the request.', retryable: false },
  rateLimit: { kind: 'service', message: 'Please wait a little before trying again. If you requested an email, check your inbox first.', retryable: false },
  password: { kind: 'validation', message: 'Choose a stronger password and try again.', retryable: false },
  input: { kind: 'validation', message: 'Check the information you entered and try again.', retryable: false },
  permission: { kind: 'permission', message: 'This action is not available for your account.', retryable: false },
  network: { kind: 'network', message: "We couldn't connect right now. Check your connection and try again.", retryable: true },
  timeout: { kind: 'network', message: 'This is taking longer than expected. Please try again. If you requested an email, check your inbox first.', retryable: true },
  service: { kind: 'service', message: 'Account services are temporarily unavailable. Please try again later.', retryable: true },
  unexpected: { kind: 'unexpected', message: "We couldn't complete that request. Please try again. If you requested an email, check your inbox first.", retryable: true },
  passwordUpdated: { kind: 'authentication', message: 'Your password was updated, but sign-out could not finish. Finish signing out before signing in again.', retryable: true },
  application: { kind: 'save', message: 'This application is no longer available in this session.', retryable: false },
  pickerBusy: { kind: 'save', message: 'Finish choosing a file before saving.', retryable: true },
  fundingEditor: { kind: 'save', message: 'Reopen funding information to edit this application.', retryable: false },
  fundingSource: { kind: 'validation', message: 'Choose an available funding source.', retryable: false },
  fundingStatus: { kind: 'validation', message: 'Choose your current NSFAS funding status.', retryable: false },
  fundingFile: { kind: 'save', message: 'Funding file unavailable. Replace or remove it before saving.', retryable: true },
  changed: { kind: 'save', message: 'Application changed. Reopen funding information and try again.', retryable: false },
  save: { kind: 'save', message: "We couldn't save your changes. Please try again.", retryable: true },
  attachments: { kind: 'save', message: "We couldn't check your files. Your entries are still here. Please try again.", retryable: true },
} as const;
export type ProblemCode = keyof typeof problems;
export type AppProblem = { code: ProblemCode; kind: string; message: string; retryable: boolean };
export class UserFacingError extends Error {
  constructor(readonly problemCode: ProblemCode) { super(problems[problemCode].message); }
}
export function problem(code: ProblemCode): AppProblem { return { code, ...problems[code] }; }
export function classifyError(error: unknown, fallback: ProblemCode = 'unexpected'): AppProblem {
  if (error instanceof UserFacingError) return problem(error.problemCode);
  const info = error && typeof error === 'object' ? error : {};
  const code = 'code' in info ? info.code : undefined;
  const status = 'status' in info ? info.status : undefined;
  const name = 'name' in info ? info.name : undefined;
  if (code === 'invalid_credentials') return problem('credentials');
  if (code === 'email_not_confirmed') return problem('unverified');
  if (['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt', 'user_not_found'].includes(String(code)) || status === 401) return problem('expired');
  if (['invalid_auth_link', 'flow_state_not_found', 'flow_state_expired', 'bad_code_verifier', 'otp_expired'].includes(String(code))) return problem('link');
  if (code === 'password_updated_signout_failed') return problem('passwordUpdated');
  if (code === 'weak_password' || code === 'same_password') return problem('password');
  if (code === 'validation_failed' || code === 'email_address_invalid') return problem('input');
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) return problem('rateLimit');
  if (code === 'not_admin' || status === 403) return problem('permission');
  if (name === 'AbortError') return problem('timeout');
  if (name === 'AuthRetryableFetchError' && (!status || status === 0)) return problem('network');
  if (typeof status === 'number' && status >= 500) return problem('service');
  return problem(fallback);
}

// Only fixed categories/contexts may be logged: no exception, stack, URL, ID or payload.
export function reportDiagnostic(context: 'account' | 'configuration' | 'render' | 'fonts' | 'funding' | 'attachments', code: ProblemCode | 'font_timeout' | 'font_load_failed' | 'missing_public_config' | 'invalid_public_config') {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[CampusStay:${context}] ${code}`);
}
