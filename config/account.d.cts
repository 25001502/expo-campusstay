export function readAuthConfig(url: string | undefined, key: string | undefined):
  | { error: string; reason: 'missing_public_config' | 'invalid_public_config'; url?: never; key?: never }
  | { url: string; key: string; error?: never; reason?: never };
export function assertProductionConfig(env?: Record<string, string | undefined>): void;
export function requiresProductionConfig(env?: Record<string, string | undefined>, args?: string[]): boolean;
