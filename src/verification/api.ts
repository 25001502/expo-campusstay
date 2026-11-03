import type { SupabaseClient } from '@supabase/supabase-js';
import { VerificationIssue, type VerificationApplication, type VerificationState } from './domain';
import type { VerificationApi } from './controller';
import { parseFinalizeResponse, parseOwnApplication, parseOwnState } from '../../shared/contracts/v1/manager-verification';
export const VERIFICATION_BUCKET = 'campusstay-manager-verification';
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new VerificationIssue('request');
  return value as Record<string, unknown>;
}
function string(value: unknown) { if (typeof value !== 'string') throw new VerificationIssue('request'); return value; }
export function parseApplication(value: unknown, owner: string): VerificationApplication {
  try { return parseOwnApplication(value, owner); }
  catch { throw new VerificationIssue('request'); }
}
export function parseState(value: unknown, owner: string): VerificationState {
  const state = record(value), access = record(state.access), status = string(access.state);
  if (state.version !== 1 || typeof state.ready !== 'boolean' || typeof access.authorized !== 'boolean' || !['none', 'active', 'suspended', 'revoked'].includes(status)) throw new VerificationIssue('setup');
  try { return parseOwnState(value, owner); }
  catch { throw new VerificationIssue('request'); }
}
function fail(error: unknown): never {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  if (['PGRST202', 'PGRST205', '42P01', '42883', '55000'].includes(String(code))) throw new VerificationIssue('setup');
  if (code === '40001') throw new VerificationIssue('changed');
  if (code === '42501') throw new VerificationIssue('permission');
  if (code === '54000') throw new VerificationIssue('limit');
  throw new VerificationIssue('request');
}
export function createVerificationApi(client: SupabaseClient | null, owner: string): VerificationApi {
  async function rpc(name: string, args = {}): Promise<unknown> {
    if (!client) throw new VerificationIssue('setup');
    const result = await client.rpc(name, args); if (result.error) fail(result.error); return result.data;
  }
  return {
    state: async () => parseState(await rpc('cs_manager_state'), owner),
    save: async (fields, revision) => parseApplication(await rpc('cs_manager_save_draft', { p_fields: fields, p_revision: revision }), owner),
    reserve: async (application, evidence) => {
      const r = record(await rpc('cs_manager_reserve_proof', { p_application: application.id, p_revision: application.revision, p_name: evidence.name, p_mime: evidence.mime, p_size: evidence.bytes.byteLength }));
      const object_name = string(r.object_name), id = string(r.id);
      if (!object_name.startsWith(`${owner}/${application.id}/${id}.`) || /\.\.|\\/.test(object_name)) throw new VerificationIssue('request');
      return { id, object_name, mime_type: evidence.mime };
    },
    upload: async (reservation, evidence) => {
      if (!client) throw new VerificationIssue('setup');
      // ArrayBuffer is supported by the RN storage client; no public/signed URL.
      const { error } = await client.storage.from(VERIFICATION_BUCKET).upload(reservation.object_name, evidence.bytes, { contentType: evidence.mime, cacheControl: '0', upsert: false });
      if (error) throw new VerificationIssue('upload');
    },
    finalize: async (reservation, application) => {
      if (!client) throw new VerificationIssue('setup');
      const { data, error } = await client.functions.invoke('manager-verification-finalize', { body: { document_id: reservation.id, revision: application.revision } });
      if (error) throw new VerificationIssue('upload');
      try { if (!parseFinalizeResponse(data).ok) throw new VerificationIssue('upload'); }
      catch { throw new VerificationIssue('upload'); }
    },
    submit: async (application) => { await rpc('cs_manager_submit', { p_application: application.id, p_revision: application.revision }); },
  };
}
