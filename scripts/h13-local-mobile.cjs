// A deliberately gated mobile launcher: no Expo process is spawned in this phase.
// The production application still loads cloud dotenv and persistent sessions.
const { requireMode, validateApi, validateDb, childEnvironment, readWorkspace, ensure, API, PROJECT, LocalSafetyError } = require('./h13-local-safety.cjs');
function plan(env, checkWorkspace = readWorkspace) {
  requireMode(env);
  validateApi(env.H13_LOCAL_URL);
  validateDb(env.H13_LOCAL_DATABASE);
  ensure(env.H13_LOCAL_PROJECT_ID === PROJECT, 'Unexpected mobile staging project');
  checkWorkspace();
  return { endpoint: API, dotenvDisabled: childEnvironment(env).EXPO_NO_DOTENV === '1', launchable: false,
    blockers: ['separate development entry/client and session namespace', 'per-request local transport guard', 'approved emulator/device endpoint bridge', 'verified local runtime credentials'] };
}
function main(args = process.argv.slice(2), env = process.env, checkWorkspace = readWorkspace) {
  const result = plan(env, checkWorkspace);
  ensure(args.length === 1 && args[0] === '--plan', 'Mobile launch blocked until isolated client/session/device transport is prepared and separately approved');
  console.log(JSON.stringify(result, null, 2));
}
module.exports = { main, plan };
if (require.main === module) { try { main(); } catch (e) { console.error(e instanceof LocalSafetyError ? e.message : 'Local mobile plan failed; configuration values withheld.'); process.exitCode = 1; } }
