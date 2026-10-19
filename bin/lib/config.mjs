// Shared helpers for the Ticketer CLI: resolving the port/URL (same source of
// truth as the web server and Mac app) and starting / waiting for the server.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

export const DEFAULT_PORT = 5164;

export function dataDir() {
  if (process.env.TICKETER_DATA_DIR) {
    return path.resolve(process.env.TICKETER_DATA_DIR);
  }
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

export function resolvePort(override) {
  const fromArg = normalizePort(override);
  if (fromArg) return fromArg;
  const env = normalizePort(process.env.TICKETER_PORT ?? process.env.PORT);
  if (env) return env;
  try {
    const raw = fs.readFileSync(
      path.join(dataDir(), "settings.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw);
    return normalizePort(parsed.port) ?? DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

export function baseUrl(port) {
  return `http://localhost:${port}`;
}

// Is a Ticketer server already answering on this URL?
export async function isServerUp(url, timeoutMs = 1500) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${url}/api/projects`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

// Spawn the Next.js server. Uses the production build when one exists
// (fast, quiet), otherwise falls back to `next dev` so the CLI works
// straight after `pnpm install` with no build step.
export function startServer(port, { inherit = true } = {}) {
  const nextBin = require.resolve("next/dist/bin/next");
  const hasBuild = fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"));
  const mode = hasBuild ? "start" : "dev";

  const child = spawn(
    process.execPath,
    [nextBin, mode, "-p", String(port)],
    {
      cwd: ROOT,
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(port) },
    }
  );
  return { child, mode };
}

export async function waitForServer(url, { tries = 60, intervalMs = 500 } = {}) {
  for (let i = 0; i < tries; i++) {
    if (await isServerUp(url)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// Open a URL (or app) in the OS default handler.
export function openInOS(target) {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["/c", "start", "", target] : [target];
  spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
}
