export type LoginFields = { email: string; password: string };
export type RegistrationFields = {
  fullName: string;
  email: string;
  phone: string;
  universityId: string;
  studentNumber: string;
  password: string;
  confirmPassword: string;
};

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string) {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return undefined;
}

export function validateLogin(fields: LoginFields): FieldErrors<keyof LoginFields> {
  const errors: FieldErrors<keyof LoginFields> = {};
  const emailError = validateEmail(fields.email);
  if (emailError) errors.email = emailError;
  if (!fields.password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegistration(fields: RegistrationFields): FieldErrors<keyof RegistrationFields> {
  const errors: FieldErrors<keyof RegistrationFields> = {};
  if (!fields.fullName.trim()) errors.fullName = 'Enter your full name.';
  const emailError = validateEmail(fields.email);
  if (emailError) errors.email = emailError;
  if (!fields.phone.trim()) errors.phone = 'Enter your phone number.';
  if (!fields.universityId) errors.universityId = 'Select your university.';
  if (!fields.studentNumber.trim()) errors.studentNumber = 'Enter your student number.';
  if (!fields.password) errors.password = 'Create a password.';
  else if (fields.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!fields.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (fields.confirmPassword !== fields.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export function validateForgotPassword(email: string) {
  return validateEmail(email);
}

export function maskEmail(value: string) {
  const [local = '', domain = ''] = value.trim().split('@');
  if (!local || !domain) return 'the entered address';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

export const AUTH_FEEDBACK = {
  login: 'Sign-in services are not connected yet. Details entered here are not sent or stored.',
  registration: 'Your information passed validation. No account was created and your details were not submitted or stored.',
  forgot: 'No reset email was sent and no password was changed.',
  google: 'Google sign-in is not available yet.',
  manager: 'The manager workspace is separate from student navigation. Account security is not connected yet.',
} as const;
