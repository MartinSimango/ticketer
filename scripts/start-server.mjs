#!/usr/bin/env node
// Resolves the configured port (settings.json / env) and starts Next.js on it.
// Used by both `pnpm start:app` and the Tauri sidecar so the Mac app and the
// CLI share one source of truth for the port.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";

// Lazily load the compiled settings resolver via tsx-free runtime: we re-implement
// the small resolution here to avoid a TS build step for the launcher.
import fs from "node:fs";
import os from "node:os";

const DEFAULT_PORT = 5164;

function dataDir() {
  if (process.env.TICKETER_DATA_DIR) return path.resolve(process.env.TICKETER_DATA_DIR);
  const base =
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support")
      : process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(base, "Ticketer");
}

function normalizePort(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) return undefined;
  return n;
}

function resolvePort() {
  const env = normalizePort(process.env.TICKETER_PORT ?? process.env.PORT);
  if (env) return env;
  try {
    const raw = fs.readFileSync(path.join(dataDir(), "settings.json"), "utf8");
    const parsed = JSON.parse(raw);
    return normalizePort(parsed.port) ?? DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

const port = resolvePort();
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
