// Offline only: no Docker invocation, fetch, dotenv loading or database execution.
const fs = require('node:fs');
const path = require('node:path');
const { generateKeyPairSync, randomUUID, randomBytes } = require('node:crypto');
const { STAGE, REPO, PROJECT, NETWORK, API, EXCLUDE, SERVICES, requireMode, readWorkspace, ensure, sha, LocalSafetyError } = require('./h13-local-safety.cjs');
function prepare(env) {
  requireMode(env);
  ensure(!fs.existsSync(STAGE), 'Staging already exists; use --check, never overwrite or reset it');
  fs.mkdirSync(STAGE);
  fs.mkdirSync(path.join(STAGE, 'supabase'));
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const key = { ...privateKey.export({ format: 'jwk' }), alg: 'ES256', use: 'sig', kid: randomUUID(), key_ops: ['sign', 'verify'], ext: true };
  fs.writeFileSync(path.join(STAGE, 'supabase/signing_keys.json'), JSON.stringify([key]), { flag: 'wx', mode: 0o600 });
  finish();
}
function capacityPlan() {
  return {
    network: { name: NETWORK, driver: 'bridge', internal: true, options: { 'com.docker.network.bridge.host_binding_ipv4': '127.0.0.1' }, ipv6: false },
    cliArguments: ['--workdir', STAGE, '--network-id', NETWORK, 'start', '--exclude', EXCLUDE.join(',')],
    approvalRequired: ['image downloads', 'dedicated network and container creation', 'one monitored startup', 'CLI rollback of first-start disposable resources'],
    stopBefore: ['H1.3 application migrations', 'function serving', 'synthetic accounts/reviewer setup', 'integration execution', 'mobile startup'],
  };
}
function finish() {
  // Internal completion helper used after this task's inspected CLI init; never a CLI overwrite flag.
  ensure(!fs.existsSync(path.join(STAGE, 'workspace.json')), 'Refuse an existing workspace manifest');
  const config = fs.readFileSync(path.join(REPO, 'config/h13-local/config.toml'));
  const target = path.join(STAGE, 'supabase/config.toml');
  ensure(!fs.existsSync(target), 'Refuse an existing configuration');
  fs.writeFileSync(target, config, { flag: 'wx' });
  const key = JSON.parse(fs.readFileSync(path.join(STAGE, 'supabase/signing_keys.json')))[0];
  const manifest = { version: 1, nonce: randomUUID(), project: PROJECT, network: NETWORK, api: API, cli: '2.121.0', configHash: sha(config), signingKid: key.kid, services: SERVICES, exclude: EXCLUDE, phase: 'configuration-only' };
  fs.writeFileSync(path.join(STAGE, 'workspace.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  fs.writeFileSync(path.join(STAGE, 'capacity-plan.json'), JSON.stringify(capacityPlan(), null, 2), { flag: 'wx' });
  for (const dir of ['profile', 'docker-config', 'private', 'supabase/migrations', 'supabase/functions']) fs.mkdirSync(path.join(STAGE, dir), { recursive: true });
  // No inherited Docker registry credentials or cloud CLI profile.
  fs.writeFileSync(path.join(STAGE, 'docker-config/config.json'), '{"auths":{},"currentContext":"desktop-linux"}\n', { flag: 'wx', mode: 0o600 });
  generateRuntimeSecrets();
  readWorkspace();
}
function generateRuntimeSecrets() {
  const secrets = {
    SUPABASE_AUTH_PUBLISHABLE_KEY: 'sb_publishable_' + randomBytes(32).toString('base64url'),
    SUPABASE_AUTH_SECRET_KEY: 'sb_secret_' + randomBytes(32).toString('base64url'),
    SUPABASE_AUTH_JWT_SECRET: randomBytes(48).toString('base64url'),
  };
  fs.writeFileSync(path.join(STAGE, 'private/runtime-secrets.json'), JSON.stringify(secrets), { flag: 'wx', mode: 0o600 });
}
function main(args = process.argv.slice(2), env = process.env) {
  requireMode(env);
  ensure(args.length === 1 && ['--prepare', '--check'].includes(args[0]), 'Use --prepare or --check');
  if (args[0] === '--prepare') prepare(env); else readWorkspace();
  console.log('PASS: offline local staging configuration; no Docker or network operation performed.');
}
module.exports = { prepare, finish, main, capacityPlan, generateRuntimeSecrets };
if (require.main === module) { try { main(); } catch (e) { console.error(e instanceof LocalSafetyError ? e.message : 'Offline staging validation failed; values withheld.'); process.exitCode = 1; } }
