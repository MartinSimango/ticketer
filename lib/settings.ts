import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface Settings {
  /** Port the Next.js server listens on. */
  port: number;
  /** Absolute path to the SQLite database file. */
  dbPath: string;
}

export const DEFAULT_PORT = 5164;

/** Directory where Ticketer keeps its settings + database. */
export function dataDir(): string {
  if (process.env.TICKETER_DATA_DIR) {
    return path.resolve(process.env.TICKETER_DATA_DIR);
  }
  // ~/Library/Application Support/Ticketer on macOS, sensible fallback elsewhere.
  const base =
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support")
      : process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(base, "Ticketer");
}

function settingsPath(): string {
  return path.join(dataDir(), "settings.json");
}

function defaultSettings(): Settings {
  return {
    port: DEFAULT_PORT,
    dbPath: path.join(dataDir(), "tickets.db"),
  };
}

export function loadSettings(): Settings {
  const defaults = defaultSettings();
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      port: normalizePort(parsed.port) ?? defaults.port,
      dbPath: parsed.dbPath?.trim() ? path.resolve(parsed.dbPath) : defaults.dbPath,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(input: Partial<Settings>): Settings {
  const current = loadSettings();
  const next: Settings = {
    port: normalizePort(input.port) ?? current.port,
    dbPath: input.dbPath?.trim()
      ? path.resolve(input.dbPath)
      : current.dbPath,
  };
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
  return next;
}

function normalizePort(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) return undefined;
  return n;
}

/**
 * Resolve the active DB path. Precedence:
 *   1. TICKETER_DB env (explicit override)
 *   2. settings.json dbPath
 */
export function resolveDbPath(): string {
  if (process.env.TICKETER_DB) return path.resolve(process.env.TICKETER_DB);
  return loadSettings().dbPath;
}

/**
 * Resolve the active port. Precedence:
 *   1. PORT / TICKETER_PORT env
 *   2. settings.json port
 *   3. DEFAULT_PORT
 */
export function resolvePort(): number {
  const env = normalizePort(process.env.TICKETER_PORT ?? process.env.PORT);
  if (env) return env;
  return loadSettings().port;
}
