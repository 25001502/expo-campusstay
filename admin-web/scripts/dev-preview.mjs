import { spawn } from "node:child_process";
// Explicit local opt-in. Next reads only this application's .env files.
const env = { ...process.env, NODE_ENV: "development", ADMIN_MOCK_MODE: "1" };
for (const name of Object.keys(env)) {
  if (/SUPABASE|^EXPO_PUBLIC_|^DATABASE_URL$|^PGPASSWORD$/.test(name))
    delete env[name];
}
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  { stdio: "inherit", env, windowsHide: true },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
