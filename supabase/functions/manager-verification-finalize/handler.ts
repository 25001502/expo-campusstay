export type ProofRecord = { id: string; applicant_id: string; object_name: string; mime_type: string; byte_size: number };
export type FinalizerDependencies = {
  authenticate(token: string): Promise<{ id: string } | null>;
  ready(token: string): Promise<boolean>;
  document(id: string, owner: string, token: string): Promise<ProofRecord | null>;
  download(path: string, token: string): Promise<Blob>;
  finalize(owner: string, document: string, revision: number, hash: string): Promise<void>;
  hash(bytes: ArrayBuffer): Promise<string>;
};
export const finalizerHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage' };
const headers = finalizerHeaders;
const reply = (status: number, code: string) => new Response(JSON.stringify({ ok: status === 200, code }), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createFinalizer(deps: FinalizerDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'method');
    const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return reply(401, 'authentication');
    try {
      const user = await deps.authenticate(token);
      if (!user) return reply(401, 'authentication');
      // Avoid downloading private bytes while paused. The SQL gate also checks
      // atomically at finalization in case readiness changes during this request.
      if (!await deps.ready(token)) return reply(503, 'unavailable');
      const reader = request.body?.getReader();
      if (!reader) return reply(400, 'input');
      const body = new Uint8Array(512); let size = 0;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        if (size + value.length > body.length) { await reader.cancel(); return reply(400, 'input'); }
        body.set(value, size); size += value.length;
      }
      const text = new TextDecoder().decode(body.subarray(0, size));
      let input: unknown;
      try { input = JSON.parse(text); } catch { return reply(400, 'input'); }
      if (!input || typeof input !== 'object' || !('document_id' in input) || !('revision' in input) ||
        typeof input.document_id !== 'string' || !uuid.test(input.document_id) || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0 ||
        Object.keys(input).some((key) => !['document_id', 'revision'].includes(key))) return reply(400, 'input');
      const document = await deps.document(input.document_id, user.id, token);
      if (!document || document.applicant_id !== user.id) return reply(403, 'permission');
      // The path comes only from an owner-scoped database row, never request input.
      const blob = await deps.download(document.object_name, token);
      if (blob.size < 1 || blob.size > 5242880 || blob.size !== document.byte_size) return reply(422, 'file');
      const buffer = await blob.arrayBuffer(), bytes = new Uint8Array(buffer);
      const signature = document.mime_type === 'application/pdf' ? [37, 80, 68, 70, 45] : document.mime_type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10] : document.mime_type === 'image/jpeg' ? [255, 216, 255] : null;
      if (!signature || !signature.every((byte, i) => bytes[i] === byte)) return reply(422, 'file');
      await deps.finalize(user.id, document.id, Number(input.revision), await deps.hash(buffer));
      return reply(200, 'verified');
    } catch { return reply(409, 'not_confirmed'); }
  };
}
