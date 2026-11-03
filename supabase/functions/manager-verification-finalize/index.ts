import { createClient } from '@supabase/supabase-js';
import { createFinalizer, finalizerHeaders, type ProofRecord } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
// Injected by the Edge runtime only. Never copied into Expo configuration.
const serverKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const userClient = (token: string) => createClient(url!, publicKey!, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } });
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: finalizerHeaders });
  if (!url || !publicKey || !serverKey) return new Response(JSON.stringify({ ok: false, code: 'setup' }), { status: 503, headers: finalizerHeaders });
  const handler = createFinalizer({
    authenticate: async (token) => {
      const { data, error } = await userClient(token).auth.getUser(token);
      return error || !data.user?.email_confirmed_at ? null : { id: data.user.id };
    },
    ready: async (token) => {
      const { data, error } = await userClient(token).rpc('cs_manager_state');
      if (error) throw new Error('readiness');
      return data?.ready === true;
    },
    document: async (id, owner, token) => {
      const { data, error } = await userClient(token).from('manager_verification_documents').select('id,applicant_id,object_name,mime_type,byte_size').eq('id', id).eq('applicant_id', owner).single();
      if (error || !data) return null;
      return data as ProofRecord;
    },
    download: async (path, token) => {
      const { data, error } = await userClient(token).storage.from('campusstay-manager-verification').download(path);
      if (error || !data) throw new Error('download'); return data;
    },
    finalize: async (owner, document, revision, hash) => {
      const server = createClient(url, serverKey, options);
      const { error } = await server.rpc('cs_manager_finalize_proof', { p_actor: owner, p_document: document, p_revision: revision, p_sha256: hash });
      if (error) throw new Error('finalize');
    },
    hash: async (bytes) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((v) => v.toString(16).padStart(2, '0')).join(''),
  });
  return handler(request);
});
