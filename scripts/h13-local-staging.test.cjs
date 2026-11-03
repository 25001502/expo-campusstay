const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const S = require('./h13-local-safety.cjs');
const local = require('./run-manager-verification-local.cjs');
const mobile = require('./h13-local-mobile.cjs');
const prepare = require('./prepare-h13-local.cjs');
const { runVerificationSuite } = require('./run-manager-verification-hosted.cjs');
const env = () => ({ H13_MODE: 'local-staging', H13_LOCAL_URL: S.API, H13_LOCAL_DATABASE: 'postgresql://postgres@127.0.0.1:55322/postgres', H13_LOCAL_PROJECT_ID: S.PROJECT, H13_ALLOW_LOCAL_TESTS: 'I_APPROVE_SYNTHETIC_LOCAL_H13_TESTS' });
function bindings() {
  return S.SERVICES.map((service) => ({ service, ports: service === 'kong' ? { '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: '55321' }] } : service === 'db' ? { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55322' }] } : service === 'inbucket' ? { '8025/tcp': [{ HostIp: '127.0.0.1', HostPort: '55324' }] } : {} }));
}
test('local operations require explicit staging mode', async () => {
  assert.throws(() => S.requireMode({}));
  assert.throws(() => S.requireMode({ H13_MODE: 'production' }));
  await assert.rejects(local.main(['--plan'], {}));
});
test('API accepts only the exact literal loopback endpoint and dedicated port', () => {
  assert.equal(S.validateApi(S.API), S.API);
  for (const value of ['https://example.supabase.co', 'https://other.supabase.co', 'http://127.0.0.1:54321', S.API + '/', S.API + '/auth/v1', 'http://localhost:55321', 'http://10.0.2.2:55321', 'http://2130706433:55321', 'http://127.0.0.1:55321@evil.invalid', 'http://[::1]:55321', S.API + '?remote=1']) assert.throws(() => S.validateApi(value));
});
test('database descriptor rejects remote connections, credentials and query overrides', () => {
  assert.equal(S.validateDb(env().H13_LOCAL_DATABASE), env().H13_LOCAL_DATABASE);
  for (const value of ['postgresql://postgres@db.example.supabase.co:5432/postgres', 'postgresql://postgres@127.0.0.1:54322/postgres', 'postgresql://postgres:password@127.0.0.1:55322/postgres', env().H13_LOCAL_DATABASE + '?host=remote.invalid', 'service=production']) assert.throws(() => S.validateDb(value));
});
test('references and remote control-plane settings are rejected even beside valid local settings', () => {
  for (const key of ['H13_STAGING_REF', 'H13_APPROVED_STAGING_REF', 'H13_STAGING_MANAGEMENT_TOKEN', 'SUPABASE_URL', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN', 'DATABASE_URL', 'PGHOST', 'PGSERVICEFILE']) assert.throws(() => S.requireMode({ ...env(), [key]: 'synthetic-remote-value' }));
});
test('child environment strips cloud, proxy, database, Node and Expo injection settings', () => {
  const dirty = { ...env(), EXPO_PUBLIC_SUPABASE_URL: 'https://remote.invalid', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-key', SUPABASE_AUTH_EXTERNAL_URL: 'https://remote.invalid', SUPABASE_PROJECT_ID: 'remote', AWS_ACCESS_KEY_ID: 'synthetic', DATABASE_URL: 'remote', PGHOST: 'remote', HTTP_PROXY: 'remote', NODE_OPTIONS: '--require=remote', NODE_EXTRA_CA_CERTS: 'remote', DOCKER_HOST: 'tcp://remote:2375', DOCKER_CONTEXT: 'remote', BITBUCKET_CLONE_DIR: 'remote', SUPABASE_EXPERIMENTAL_STACK: '1', PATH: 'retained-path' };
  const clean = S.childEnvironment(dirty);
  for (const key of Object.keys(dirty).filter((k) => !['PATH', 'H13_MODE', 'DOCKER_HOST', 'SUPABASE_EXPERIMENTAL_STACK'].includes(k))) assert.equal(clean[key], undefined, key);
  assert.equal(clean.DOCKER_HOST, S.ENGINE);
  assert.equal(clean.SUPABASE_EXPERIMENTAL_STACK, '0');
  assert.equal(clean.EXPO_NO_DOTENV, '1');
  assert.equal(clean.PATH, 'retained-path');
  assert.ok(clean.USERPROFILE.startsWith(S.STAGE));
  assert.ok(clean.DOCKER_CONFIG.startsWith(S.STAGE));
});
test('HTTP guard rejects hosted, LAN, alternate-loopback and non-API requests before transport', async () => {
  let calls = 0;
  const request = S.localFetch(async () => { calls++; return { status: 200 }; });
  for (const url of ['https://first.supabase.co/rest/v1/table', 'https://second.supabase.co/auth/v1/user', 'http://localhost:55321/auth/v1/user', 'http://2130706433:55321/auth/v1/user', 'http://10.0.2.2:55321/auth/v1/user', S.API + '/admin', S.API + '/auth/v1/user#bad']) await assert.rejects(request(url));
  assert.equal(calls, 0);
});
test('HTTP guard keeps local SDK transport and forces redirect rejection', async () => {
  const options = { method: 'POST', headers: { apikey: 'synthetic-only' }, body: '{}' };
  const request = S.localFetch(async (url, init) => {
    assert.equal(url, S.API + '/rest/v1/rpc/cs_manager_state');
    assert.equal(init.redirect, 'error'); assert.equal(init.headers, options.headers); assert.equal(init.body, '{}');
    assert.ok(init.signal); return { status: 200, url };
  });
  assert.equal((await request(S.API + '/rest/v1/rpc/cs_manager_state', { ...options, redirect: 'follow' })).status, 200);
});
test('HTTP redirects and unexpected returned origins fail closed', async () => {
  for (const response of [{ status: 302 }, { status: 200, redirected: true }, { status: 200, url: 'https://remote.supabase.co/auth/v1/user' }]) await assert.rejects(S.localFetch(async () => response)(S.API + '/auth/v1/user'));
});
test('only the reviewed seven-service loopback binding set is accepted', () => {
  assert.doesNotThrow(() => S.validateBindings(bindings()));
  assert.throws(() => S.validateBindings(bindings().slice(1)));
  const duplicate = bindings(); duplicate[1] = duplicate[0]; assert.throws(() => S.validateBindings(duplicate));
});
test('wildcard, IPv6 and extra port publication are rejected', () => {
  for (const ip of ['0.0.0.0', '::', '', '192.168.1.10']) {
    const rows = bindings(); rows.find((r) => r.service === 'kong').ports['8000/tcp'][0].HostIp = ip;
    assert.throws(() => S.validateBindings(rows));
  }
  const extra = bindings(); extra.find((r) => r.service === 'edge_runtime').ports = { '8083/tcp': [{ HostIp: '127.0.0.1', HostPort: '55328' }] }; assert.throws(() => S.validateBindings(extra));
});
test('local runner rejects missing mutation approval or injected keys before invoking a runner', async () => {
  let calls = 0;
  for (const patch of [{ H13_ALLOW_LOCAL_TESTS: '' }, { H13_LOCAL_PROJECT_ID: 'remote-project' }, { H13_LOCAL_SERVER_KEY: 'synthetic' }, { H13_STAGING_SERVER_KEY: 'synthetic' }, { H13_LOCAL_URL: 'https://remote.supabase.co' }]) await assert.rejects(local.main(['--run'], { ...env(), ...patch }, async () => { calls++; }));
  assert.equal(calls, 0);
});
test('exact run opt-in reaches only the local adapter with the constant local target', async () => {
  let calls = 0;
  await local.main(['--run'], env(), async (config) => { calls++; assert.equal(config.url, S.API); assert.equal(config.project, S.PROJECT); });
  await assert.rejects(local.main(['--run', '--force'], env(), async () => { calls++; }));
  assert.equal(calls, 1);
});
test('shared scenario adapter uses local SQL without a Management API fallback', async () => {
  let sqlCalls = 0, requests = 0;
  await assert.rejects(runVerificationSuite({ url: S.API, publicKey: 'synthetic', serverKey: 'synthetic' }, async () => { requests++; throw Error('Unexpected HTTP'); }, () => {}, { sql: async () => { sqlCalls++; throw Error('LOCAL SQL SENTINEL'); } }), /LOCAL SQL SENTINEL/);
  assert.equal(sqlCalls, 1); assert.equal(requests, 0);
});
test('local deployment and expiry hooks replace hosted metadata and JWKS requests', async () => {
  let deployment = 0, sqlCalls = 0;
  const control = {
    sql: async () => ++sqlCalls === 1 ? [{ version: 170011, ready: false, hardened: true, buckets: 1, users: 0, apps: 0, docs: 0, events: 0, grants: 0, reviewers: 0, objects: 0 }] : [{ n: 0 }],
    verifyDeployment: async () => { deployment++; },
    verifyExpiredToken: async () => { throw Error('LOCAL EXPIRY SENTINEL'); },
  };
  await assert.rejects(runVerificationSuite({ url: S.API, publicKey: 'synthetic', serverKey: 'synthetic' }, async (url) => {
    assert.ok(String(url).startsWith(S.API + '/storage/v1/bucket/'));
    return new Response(JSON.stringify({ id: 'campusstay-manager-verification', name: 'campusstay-manager-verification', public: false, file_size_limit: 5242880, allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png'] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }, () => {}, control), /LOCAL EXPIRY SENTINEL/);
  assert.equal(deployment, 1);
  assert.equal(sqlCalls, 3);
});
test('local SQL safely quotes data and uses read-only transactions where requested', () => {
  const sql = local.compileSql('select $1::text as value,$2::boolean as enabled,$3::int as count', ["x'; drop table auth.users; --\\", false, 2], true);
  assert.ok(sql.includes("'x''; drop table auth.users; --\\'"));
  assert.ok(sql.includes('transaction_read_only=on'));
  assert.ok(sql.includes('standard_conforming_strings=on'));
  assert.ok(sql.includes('statement_timeout'));
  assert.ok(sql.includes('json_agg'));
});
test('local SQL rejects missing/extra parameters and unsafe query forms', () => {
  for (const action of [() => local.compileSql('select $1', []), () => local.compileSql('select 1', ['unused']), () => local.compileSql('delete from auth.users'), () => local.compileSql('select 1; select 2'), () => local.compileSql('update a set n=1', [], true), () => local.sqlLiteral(Infinity), () => local.sqlLiteral({ value: 1 })]) assert.throws(action);
});
test('SQL transport is restricted to named local container psql and stdin', async () => {
  const sql = local.controlSql((args, input) => {
    assert.deepEqual(args, ['exec', '-i', S.DB, 'psql', '-X', '-qAt', '--set=ON_ERROR_STOP=1', '--username=postgres', '--dbname=postgres']);
    assert.ok(input.includes('transaction_read_only=on')); assert.ok(!args.some((a) => a.includes('://')));
    return '[{"n":1}]';
  });
  assert.deepEqual(await sql('select 1 as n', [], true), [{ n: 1 }]);
});
test('Docker transport pins the local named pipe, isolated environment and no shell', () => {
  const value = local.dockerCommand(['inspect', S.DB], undefined, (exe, args, options) => {
    assert.ok(exe.endsWith('docker.exe')); assert.deepEqual(args.slice(0, 2), ['--host', S.ENGINE]);
    assert.equal(options.shell, false); assert.equal(options.cwd, S.STAGE); assert.equal(options.env.EXPO_NO_DOTENV, '1');
    return { status: 0, stdout: 'safe-result' };
  });
  assert.equal(value, 'safe-result');
});
test('Docker failures do not expose raw stderr or credentials', () => {
  assert.throws(() => local.dockerCommand([], undefined, () => ({ status: 1, stderr: 'SYNTHETIC_SECRET' })), (e) => !e.message.includes('SYNTHETIC_SECRET'));
});
test('expired token fixture must be local and actually expired', () => {
  const token = (claims) => `synthetic.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.synthetic`;
  const claims = { iss: S.API + '/auth/v1', exp: 1, sub: '10000000-0000-4000-8000-000000000001' };
  assert.equal(S.decodeExpired(token(claims)).sub, claims.sub);
  assert.throws(() => S.decodeExpired(token({ ...claims, iss: 'https://remote.supabase.co/auth/v1' })));
  assert.throws(() => S.decodeExpired(token({ ...claims, exp: Date.now() / 1000 + 1000 })));
});
test('offline plan performs no integration runner execution', async () => {
  let calls = 0; await local.main(['--plan'], env(), async () => { calls++; }); assert.equal(calls, 0);
});
test('mobile target guard rejects cloud and never launches the production application', () => {
  assert.throws(() => mobile.plan({ ...env(), H13_LOCAL_URL: 'https://remote.supabase.co' }));
  assert.throws(() => mobile.main(['--launch'], env(), () => {}), /Mobile launch blocked/);
  const result = mobile.plan(env(), () => {}); assert.equal(result.launchable, false); assert.equal(result.dotenvDisabled, true);
});
test('workspace guard pins its path and validates the prepared workspace when present', () => {
  assert.throws(() => S.readWorkspace(S.REPO));
  if (fs.existsSync(S.STAGE)) {
    const manifest = S.readWorkspace(); assert.equal(manifest.project, S.PROJECT); assert.equal(manifest.phase, 'configuration-only');
    assert.throws(() => prepare.prepare(env()), /already exists/);
  }
  assert.throws(() => prepare.prepare({}));
  assert.ok(!fs.existsSync(path.join(S.STAGE, 'private/integration-evidence.json')));
});
test('capacity plan requires separate approval and an internal loopback network', () => {
  const plan = prepare.capacityPlan();
  if (fs.existsSync(S.STAGE)) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(S.STAGE, 'capacity-plan.json'))), plan);
  assert.equal(plan.network.internal, true); assert.equal(plan.network.ipv6, false);
  assert.equal(plan.network.options['com.docker.network.bridge.host_binding_ipv4'], '127.0.0.1');
  assert.ok(plan.approvalRequired.includes('image downloads'));
  assert.deepEqual(plan.cliArguments.slice(-2), ['--exclude', S.EXCLUDE.join(',')]);
});
test('runtime guard rejects another project before SQL or evidence loading', () => {
  if (!fs.existsSync(S.STAGE)) { assert.throws(() => S.readWorkspace(S.REPO)); return; }
  let calls = 0;
  assert.throws(() => local.verifyRuntime(() => { calls++; return 'true|other-project|wrong-path|{}|{}'; }), /identity mismatch/);
  assert.equal(calls, 1);
});
test('prepared Auth secrets come from the local file rather than inherited cloud values', () => {
  if (!fs.existsSync(S.STAGE)) { assert.throws(() => S.runtimeEnvironment({})); return; }
  const clean = S.runtimeEnvironment({ H13_MODE: 'local-staging', SUPABASE_AUTH_SECRET_KEY: 'SYNTHETIC_INHERITED' });
  assert.match(clean.SUPABASE_AUTH_SECRET_KEY, /^sb_secret_/);
  assert.match(clean.SUPABASE_AUTH_PUBLISHABLE_KEY, /^sb_publishable_/);
  assert.notEqual(clean.SUPABASE_AUTH_SECRET_KEY, 'SYNTHETIC_INHERITED');
});
