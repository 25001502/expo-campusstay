// PREPARED ONLY. --plan is offline; --run requires separately approved local
// integration setup, matching runtime evidence and empty synthetic-only data.
// Never starts Docker, serves functions, migrates, loads app dotenv, or deletes data.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyExpiredSignature, runVerificationSuite, CASES } = require('./run-manager-verification-hosted.cjs');
const S = require('./h13-local-safety.cjs');
function validateTarget(env) {
  S.requireMode(env);
  S.validateApi(env.H13_LOCAL_URL);
  S.validateDb(env.H13_LOCAL_DATABASE);
  S.ensure(env.H13_ALLOW_LOCAL_TESTS === 'I_APPROVE_SYNTHETIC_LOCAL_H13_TESTS', 'Separate local integration approval required');
  S.ensure(env.H13_LOCAL_PROJECT_ID === S.PROJECT, 'Unexpected local project identifier');
  // Credentials are read exclusively from the dedicated workspace after runtime identity checks.
  S.ensure(!Object.keys(env).some((key) => /^H13_(?:STAGING_|LOCAL_.*KEY|LOCAL_.*TOKEN)/.test(key) && env[key]), 'Do not inject cloud or unverified credentials');
  return { url: S.API, project: S.PROJECT };
}
function dockerCommand(args, input, spawn = spawnSync) {
  const docker = path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'Docker/Docker/resources/bin/docker.exe');
  const result = spawn(docker, ['--host', S.ENGINE, ...args], {
    cwd: S.STAGE, env: S.childEnvironment(), encoding: 'utf8', input, timeout: 25000, maxBuffer: 4 * 1024 * 1024, windowsHide: true, shell: false,
  });
  S.ensure(result.status === 0 && !result.error, 'Local Docker inspection/SQL failed; raw output withheld');
  return result.stdout.trim();
}
function verifyRuntime(docker = dockerCommand) {
  const manifest = S.readWorkspace(S.STAGE, { integration: true });
  const rows = [];
  for (const service of S.SERVICES) {
    const name = 'supabase_' + service + '_' + S.PROJECT;
    // Selected fields only: never print container environment, credentials or raw inspect.
    const raw = docker(['inspect', '--format', '{{json .State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}|{{index .Config.Labels "com.supabase.cli.workdir"}}|{{json .NetworkSettings.Ports}}|{{json .NetworkSettings.Networks}}', name]);
    const [running, project, workdir, ports, networks] = raw.split('|');
    S.ensure(running === 'true' && project === S.PROJECT && path.resolve(workdir) === S.STAGE, 'Running container identity mismatch');
    S.ensure(Object.keys(JSON.parse(networks)).join() === S.NETWORK, 'Unexpected container network attachment');
    rows.push({ service, ports: JSON.parse(ports) });
  }
  S.validateBindings(rows);
  const network = JSON.parse(docker(['network', 'inspect', '--format', '{"options":{{json .Options}},"internal":{{json .Internal}},"ipv6":{{json .EnableIPv6}},"driver":{{json .Driver}}}', S.NETWORK]));
  S.ensure(network.options['com.docker.network.bridge.host_binding_ipv4'] === '127.0.0.1' && network.internal === true && network.ipv6 === false && network.driver === 'bridge', 'Isolated loopback network requirements not satisfied');
  // This evidence does not exist during preparation. A separately approved setup
  // must record real post-migration/function hashes and locally issued keys.
  const evidence = JSON.parse(fs.readFileSync(path.join(S.STAGE, 'private/integration-evidence.json'), 'utf8'));
  S.ensure(evidence.workspaceNonce === manifest.nonce && evidence.phase === 'integration-approved', 'Local integration evidence missing/mismatched');
  const sourceHash = S.sha(fs.readFileSync(path.join(S.REPO, 'supabase/migrations/20261021135040_manager_verification.sql')));
  S.ensure(evidence.migrationHash === sourceHash && evidence.verifyJwt === true, 'Migration/function evidence mismatch');
  const localEnv = S.runtimeEnvironment({ H13_MODE: 'local-staging' }, { integration: true });
  S.ensure(evidence.publicKey === localEnv.SUPABASE_AUTH_PUBLISHABLE_KEY && evidence.serverKey === localEnv.SUPABASE_AUTH_SECRET_KEY, 'Runtime keys differ from the workspace-generated local credentials');
  for (const file of ['index.ts', 'handler.ts']) {
    const relative = 'supabase/functions/manager-verification-finalize/' + file;
    S.ensure(evidence.functionHashes?.[file] === S.sha(fs.readFileSync(path.join(S.REPO, relative))) && evidence.functionHashes[file] === S.sha(fs.readFileSync(path.join(S.STAGE, relative))), 'Local finalizer source evidence mismatch');
  }
  const expired = S.decodeExpired(evidence.expiredJwt);
  const keys = JSON.parse(fs.readFileSync(path.join(S.STAGE, 'supabase/signing_keys.json')));
  const jwks = { keys: keys.map(({ d: _private, ...key }) => key) };
  verifyExpiredSignature(evidence.expiredJwt, jwks);
  return { evidence, fixtureUserId: expired.sub, jwks };
}
function sqlLiteral(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') { S.ensure(Number.isFinite(value), 'Invalid SQL number'); return String(value); }
  S.ensure(typeof value === 'string' && !value.includes('\0'), 'Unsupported SQL parameter');
  return "'" + value.replaceAll("'", "''") + "'";
}
function compileSql(query, parameters = [], readOnly = false) {
  S.ensure(typeof query === 'string' && /^(select|update|insert)\s/i.test(query) && !query.includes(';'), 'Unexpected integration SQL shape');
  const used = new Set();
  const bound = query.replace(/\$(\d+)/g, (_, index) => {
    const i = Number(index) - 1; S.ensure(i >= 0 && i < parameters.length, 'SQL parameter missing'); used.add(i); return sqlLiteral(parameters[i]);
  });
  S.ensure(used.size === parameters.length, 'Unused SQL parameter');
  const select = /^select\s/i.test(query);
  S.ensure(!readOnly || select, 'Read-only control query must be SELECT');
  return `begin;\nset local statement_timeout='15s';\nset local standard_conforming_strings=on;\n${readOnly ? 'set local transaction_read_only=on;\n' : ''}${select ? "select coalesce(json_agg(h13_rows), '[]'::json) from (" + bound + ') h13_rows' : bound};\ncommit;\n`;
}
function controlSql(docker = dockerCommand) {
  return async (query, parameters, readOnly) => {
    const result = docker(['exec', '-i', S.DB, 'psql', '-X', '-qAt', '--set=ON_ERROR_STOP=1', '--username=postgres', '--dbname=postgres'], compileSql(query, parameters, readOnly));
    return /^select\s/i.test(query) ? JSON.parse(result) : [];
  };
}
async function runLocal(config) {
  const runtime = verifyRuntime();
  const local = S.localFetch();
  const sql = controlSql();
  return runVerificationSuite({ ...config, publicKey: runtime.evidence.publicKey, serverKey: runtime.evidence.serverKey, expiredJwt: runtime.evidence.expiredJwt, fixtureUserId: runtime.fixtureUserId }, local, console.log, {
    sql,
    verifyDeployment: async () => {
      // Real gateway/handler authorization is exercised by the shared cases;
      // never substitute a hosted Management API metadata lookup.
      S.ensure(runtime.evidence.verifyJwt === true, 'Local JWT verification must remain enabled');
    },
    verifyExpiredToken: async (token) => {
      S.decodeExpired(token);
      verifyExpiredSignature(token, runtime.jwks);
    },
  });
}
async function main(args = process.argv.slice(2), env = process.env, runner = runLocal) {
  S.requireMode(env);
  if (args.length === 1 && args[0] === '--plan') {
    console.log('OFFLINE LOCAL PLAN: no containers, SQL, HTTP, users or files changed; not integration evidence.');
    CASES.forEach((name, i) => console.log(`${i + 1}. ${name}`));
    console.log('Local adapter uses named-container psql and loopback HTTP; hosted metadata is replaced by separately recorded local runtime evidence.');
    return;
  }
  S.ensure(args.length === 1 && args[0] === '--run', 'Use --plan or separately approved --run');
  return runner(validateTarget(env));
}
module.exports = { main, validateTarget, verifyRuntime, sqlLiteral, compileSql, controlSql, dockerCommand };
if (require.main === module) main().catch((e) => { console.error(e instanceof S.LocalSafetyError ? e.message : 'Local integration check failed; raw values withheld. Disable local readiness explicitly if containment failed.'); process.exitCode = 1; });
