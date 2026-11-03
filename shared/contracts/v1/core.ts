/** Dependency-free DTO validation. Parsing proves shape, never identity or authority. */
export const CONTRACT_VERSION = 1 as const;
export const errorCodes = ['invalid_input', 'unsupported_version', 'conflict', 'forbidden', 'unavailable', 'not_confirmed'] as const;
export type ContractErrorCode = typeof errorCodes[number];
export class ContractError extends Error {
  constructor(readonly code: ContractErrorCode = 'invalid_input') {
    // Never echo an untrusted value, server message, token or document path.
    super(`Contract boundary: ${code}`);
    this.name = 'ContractError';
  }
}
export function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContractError();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(record, key))) throw new ContractError();
  return record;
}
export function text(value: unknown, max: number, min = 0): string {
  if (typeof value !== 'string' || Array.from(value).length < min || Array.from(value).length > max) throw new ContractError();
  return value;
}
export function uuid(value: unknown): string {
  const id = text(value, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new ContractError();
  return id;
}
export function integer(value: unknown, max = 2147483647, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new ContractError();
  return value;
}
/** H1.3 revisions are PostgreSQL int4, start at zero and use optimistic equality. */
export type Revision = number;
export const revision = (value: unknown): Revision => integer(value);
export function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new ContractError();
  return value;
}
export function member<const T extends readonly string[]>(value: unknown, values: T): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) throw new ContractError();
  return value as T[number];
}
export function version(value: unknown, expected: number): void {
  if (value !== expected) throw new ContractError('unsupported_version');
}
export function nullable<T>(value: unknown, parse: (input: unknown) => T): T | null {
  return value === null ? null : parse(value);
}
export type IdentityReferenceV1 = { version: 1; user_id: string };
/** Reference only: confirmation/session verification belongs to Auth, not this DTO. */
export function parseIdentityReference(value: unknown): IdentityReferenceV1 {
  const r = object(value, ['version', 'user_id']); version(r.version, 1);
  return { version: 1, user_id: uuid(r.user_id) };
}
/** Proposed adapter result, NOT an existing PostgREST/Edge response format. */
export type ContractResultV1<T> = { version: 1; ok: true; data: T } | { version: 1; ok: false; error: { code: ContractErrorCode } };
export function parseContractResult<T>(value: unknown, parseData: (input: unknown) => T): ContractResultV1<T> {
  if (!value || typeof value !== 'object' || !('ok' in value)) throw new ContractError();
  if (value.ok === true) {
    const r = object(value, ['version', 'ok', 'data']); version(r.version, 1);
    return { version: 1, ok: true, data: parseData(r.data) };
  }
  const r = object(value, ['version', 'ok', 'error']); version(r.version, 1);
  if (r.ok !== false) throw new ContractError();
  const error = object(r.error, ['code']);
  return { version: 1, ok: false, error: { code: member(error.code, errorCodes) } };
}
