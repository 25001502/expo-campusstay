import 'react-native-url-polyfill/auto';
import './crypto';
import { createClient, processLock } from '@supabase/supabase-js';
import { authStorage } from './secureStorage';
import { readAuthConfig } from './account';
import { reportDiagnostic } from '../errors';

const config = readAuthConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const authSetupError = config.error ?? '';
if (config.reason) reportDiagnostic('configuration', config.reason);
export const supabase = config.url && config.key ? createClient(config.url, config.key, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce', lock: processLock },
  global: { fetch: async (input, init) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (init?.signal?.aborted) abort();
    init?.signal?.addEventListener('abort', abort);
    const timer = setTimeout(abort, 15000);
    try { return await fetch(input, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
  } },
}) : null;
