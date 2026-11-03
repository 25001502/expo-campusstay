// Shared by runtime configuration and release validation. Never include values in errors.
function readAuthConfig(url, key) {
  const unavailable = 'Account services are temporarily unavailable. Please try again later.';
  if (!url || !key) return { error: unavailable, reason: 'missing_public_config' };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error();
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error();
    return { url: parsed.origin, key };
  } catch {
    return { error: unavailable, reason: 'invalid_public_config' };
  }
}
function assertProductionConfig(env = process.env) {
  const config = readAuthConfig(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (config.error) throw new Error(`Release validation failed (${config.reason}). Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY with the public project settings. See docs/error-quality-refinement.md. Configuration values were not logged.`);
}
function requiresProductionConfig(env = process.env, args = process.argv) {
  return env.NODE_ENV === 'production'
    || (env.EAS_BUILD === 'true' && env.EAS_BUILD_PROFILE !== 'development')
    || (args.includes('export') && !args.includes('--dev'))
    || (args.includes('run:android') && args.some((arg) => /^(release|.*Release)$/.test(arg)))
    || (args.includes('run:ios') && args.includes('Release'));
}
module.exports = { readAuthConfig, assertProductionConfig, requiresProductionConfig };
