// Local staging only. No dotenv loading, Docker lifecycle commands or network at import.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Buffer } = require('node:buffer');
const REPO = path.resolve(__dirname, '..');
const STAGE = path.join(REPO, '.expo/phase-h1-3/local-staging');
const PROJECT = 'campusstay-h13-local-staging';
const NETWORK = 'campusstay-h13-local-loopback';
const API = 'http://127.0.0.1:55321';
const DB = 'supabase_db_' + PROJECT;
const ENGINE = 'npipe:////./pipe/dockerDesktopLinuxEngine';
const EXCLUDE = ['realtime', 'imgproxy', 'postgres-meta', 'studio', 'logflare', 'vector', 'supavisor'];
const SERVICES = ['db', 'auth', 'rest', 'kong', 'storage', 'edge_runtime', 'inbucket'];
class LocalSafetyError extends Error {}
function ensure(ok, label) { if (!ok) throw new LocalSafetyError(label); }
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function requireMode(env) {
  ensure(env.H13_MODE === 'local-staging', 'Explicit H13_MODE=local-staging required');
  // No remote target or connection-string knobs, even when another local value is valid.
  for (const key of Object.keys(env)) {
    if (/^(H13_.*(?:REF|DATABASE_URL|DB_URL|MANAGEMENT_TOKEN)|SUPABASE_(?:URL|PROJECT_REF|ACCESS_TOKEN)|DATABASE_URL|PGHOST|PGSERVICE|PGSERVICEFILE)$/i.test(key)) {
      ensure(!env[key], 'Remote/project-reference/connection overrides are forbidden');
    }
  }
}
function validateApi(value) {
  ensure(typeof value === 'string' && value === API, 'Only the exact local staging API endpoint is permitted');
  return value;
}
function validateDb(value) {
  // Passwords stay outside the URL. Integration control uses named-container psql, not a DSN.
  ensure(value === 'postgresql://postgres@127.0.0.1:55322/postgres', 'Only the exact local database descriptor is permitted');
  return value;
}
function childEnvironment(source = process.env) {
  const env = {};
  // Allowlist, rather than attempting to enumerate every cloud/proxy/CLI override.
  for (const key of ['SystemRoot', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'TEMP', 'TMP']) {
    if (source[key]) env[key] = source[key];
  }
  Object.assign(env, {
    H13_MODE: 'local-staging', SUPABASE_TELEMETRY_DISABLED: 'true',
    DO_NOT_TRACK: '1', SUPABASE_NO_UPDATE_NOTIFIER: 'true', SUPABASE_NO_KEYRING: '1',
    SUPABASE_EXPERIMENTAL_STACK: '0', EXPO_NO_DOTENV: '1',
    NO_PROXY: '127.0.0.1,localhost,::1',
    // Isolate profile-based CLI credentials as well as process variables.
    HOME: path.join(STAGE, 'profile'), USERPROFILE: path.join(STAGE, 'profile'),
    APPDATA: path.join(STAGE, 'profile/AppData/Roaming'),
    LOCALAPPDATA: path.join(STAGE, 'profile/AppData/Local'),
    DOCKER_CONFIG: path.join(STAGE, 'docker-config'),
    DOCKER_HOST: ENGINE,
  });
  return env;
}
function runtimeEnvironment(source = process.env, { integration = false } = {}) {
  requireMode(source);
  readWorkspace(STAGE, { integration });
  const secrets = JSON.parse(fs.readFileSync(path.join(STAGE, 'private/runtime-secrets.json'), 'utf8'));
  const env = childEnvironment(source);
  for (const key of ['SUPABASE_AUTH_PUBLISHABLE_KEY', 'SUPABASE_AUTH_SECRET_KEY', 'SUPABASE_AUTH_JWT_SECRET']) {
    ensure(typeof secrets[key] === 'string' && secrets[key].length >= 32, 'Generated local runtime credentials missing');
    env[key] = secrets[key];
  }
  return env;
}
function readWorkspace(stage = STAGE, { integration = false } = {}) {
  ensure(path.resolve(stage) === STAGE, 'Unexpected staging workspace');
  // A junction/symlink must not redirect our target outside the approved workspace.
  for (let p = STAGE; p !== path.dirname(REPO); p = path.dirname(p)) {
    ensure(!fs.lstatSync(p).isSymbolicLink(), 'Staging path must not contain symlinks or junctions');
  }
  for (const name of ['.env', '.env.local', 'supabase/.env', 'supabase/.env.local', 'supabase/config.json', 'supabase/.branches']) {
    ensure(!fs.existsSync(path.join(stage, name)), 'Unexpected dotenv, branch or alternative configuration in staging');
  }
  for (const name of ['supabase', 'supabase/config.toml', 'supabase/signing_keys.json', 'workspace.json']) {
    ensure(!fs.lstatSync(path.join(stage, name)).isSymbolicLink(), 'Staging files must not be symlinks or junctions');
  }
  const temp = path.join(stage, 'supabase/.temp');
  ensure(!fs.existsSync(temp) || fs.readdirSync(temp).every((f) => f === 'cli-latest'), 'Linked project or image override found in staging');
  const config = fs.readFileSync(path.join(stage, 'supabase/config.toml'));
  const template = fs.readFileSync(path.join(REPO, 'config/h13-local/config.toml'));
  ensure(config.equals(template), 'Staging configuration differs from the reviewed offline template');
  for (const dir of ['supabase/migrations', ...(integration ? [] : ['supabase/functions']), 'supabase/schemas']) {
    const p = path.join(stage, dir);
    ensure(!fs.existsSync(p) || fs.readdirSync(p).length === 0, 'Capacity workspace must contain no application migrations, schemas or functions');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(stage, 'workspace.json'), 'utf8'));
  ensure(manifest.project === PROJECT && manifest.api === API && manifest.network === NETWORK && manifest.cli === '2.121.0', 'Workspace identity mismatch');
  ensure(manifest.configHash === sha(config), 'Workspace config fingerprint mismatch');
  const keys = JSON.parse(fs.readFileSync(path.join(stage, 'supabase/signing_keys.json'), 'utf8'));
  ensure(keys.length === 1 && keys[0].alg === 'ES256' && keys[0].d && keys[0].kid === manifest.signingKid, 'Local signing-key identity mismatch');
  return manifest;
}
function localFetch(fetcher = fetch) {
  return async (input, options = {}) => {
    const value = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    ensure(typeof value === 'string' && value.startsWith(API + '/'), 'Request refused: noncanonical local staging target');
    const url = new URL(value);
    ensure(url.origin === API && !url.username && !url.password && !url.hash, 'Request refused: nonlocal staging target');
    ensure(['/auth/v1/', '/rest/v1/', '/storage/v1/', '/functions/v1/'].some((p) => url.pathname.startsWith(p)), 'Request refused: unexpected local API path');
    const response = await fetcher(input, { ...options, redirect: 'error', signal: options.signal ?? AbortSignal.timeout(20000) });
    ensure(response.status < 300 || response.status >= 400, 'Redirect refused');
    ensure(!response.redirected, 'Redirected response refused');
    if (response.url) ensure(new URL(response.url).origin === API, 'Response from nonlocal origin refused');
    return response;
  };
}
function validateBindings(rows) {
  ensure(Array.isArray(rows) && rows.length === SERVICES.length, 'Expected exactly seven staging service bindings');
  const allowed = new Map([['kong', ['8000/tcp', '55321']], ['db', ['5432/tcp', '55322']], ['inbucket', ['8025/tcp', '55324']]]);
  const seen = new Set();
  for (const row of rows) {
    ensure(SERVICES.includes(row.service) && !seen.has(row.service), 'Unexpected or duplicate staging service'); seen.add(row.service);
    const expected = allowed.get(row.service), bindings = Object.entries(row.ports ?? {}).flatMap(([port, entries]) => (entries ?? []).map((entry) => ({ port, ...entry })));
    ensure(bindings.length === (expected ? 1 : 0), 'Unexpected number of published ports');
    for (const b of bindings) ensure(b.HostIp === '127.0.0.1' && b.port === expected[0] && b.HostPort === expected[1], 'Nonloopback or unexpected published port');
  }
}
function decodeExpired(token) {
  let claims;
  try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); } catch { throw new LocalSafetyError('Invalid local expired JWT fixture'); }
  ensure(claims.iss === API + '/auth/v1' && Number.isFinite(claims.exp) && claims.exp < Date.now() / 1000 && /^[0-9a-f-]{36}$/i.test(claims.sub ?? ''), 'Expired JWT fixture must identify local staging');
  return claims;
}
module.exports = { REPO, STAGE, PROJECT, NETWORK, API, DB, ENGINE, EXCLUDE, SERVICES, LocalSafetyError, ensure, sha, requireMode, validateApi, validateDb, childEnvironment, runtimeEnvironment, readWorkspace, localFetch, validateBindings, decodeExpired };
