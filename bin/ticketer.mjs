#!/usr/bin/env node
// Ticketer unified CLI. One entry point, several front ends — like how a modern
// agent harness ships one binary that can run headless, in a browser, or in a
// terminal UI.
//
//   ticketer serve [--port N]   headless server only (no UI opened)
//   ticketer web   [--port N]   start the server and open the browser UI
//   ticketer tui   [--server U] terminal UI (auto-starts a local server)
//   ticketer mcp                MCP server over stdio (for AI clients)
//   ticketer app                open the native macOS app (or show download)
//   ticketer help               this message
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import {
  ROOT,
  resolvePort,
  baseUrl,
  isServerUp,
  startServer,
  waitForServer,
  openInOS,
} from "./lib/config.mjs";

const require = createRequire(import.meta.url);

// Placeholder — replace with the real repo once it's public.
const RELEASES_URL = "https://github.com/your-org/ticketer/releases/latest";

function parseFlags(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" || a === "-p") flags.port = argv[++i];
    else if (a === "--server" || a === "-s") flags.server = argv[++i];
    else if (a === "--no-open") flags.noOpen = true;
    else if (a === "--help" || a === "-h") flags.help = true;
    else rest.push(a);
  }
  return { flags, rest };
}

function help() {
  console.log(`Ticketer — kanban tickets with a web UI, a TUI, and an MCP server.

Usage: ticketer <command> [options]

Commands:
  serve            Run the server headless (no UI). Prints the URL.
  web              Start the server and open the board in your browser.
  tui              Launch the terminal UI (starts a local server if needed).
  mcp              Run the MCP server over stdio (for AI clients).
  app              Open the native macOS app, or show where to download it.
  help             Show this help.

Options:
  -p, --port <n>   Port to use (default: settings.json or 5164).
  -s, --server <url>   (tui) Connect to an existing server instead of starting one.
  --no-open        (web) Start the server but don't open the browser.

Examples:
  ticketer serve --port 7000
  ticketer web
  ticketer tui
  ticketer tui --server http://localhost:5164
`);
}

async function cmdServe(flags) {
  const port = resolvePort(flags.port);
  const url = baseUrl(port);
  if (await isServerUp(url)) {
    console.log(`Ticketer is already running at ${url}`);
    return;
  }
  console.log(`Starting Ticketer (headless) at ${url} …`);
  const { child, mode } = startServer(port);
  if (mode === "dev") {
    console.log("(no production build found — running in dev mode)");
  }
  child.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

async function cmdWeb(flags) {
  const port = resolvePort(flags.port);
  const url = baseUrl(port);

  if (await isServerUp(url)) {
    console.log(`Ticketer already running — opening ${url}`);
    if (!flags.noOpen) openInOS(url);
    return;
  }

  console.log(`Starting Ticketer at ${url} …`);
  const { child } = startServer(port);
  child.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));

  const ready = await waitForServer(url);
  if (ready && !flags.noOpen) {
    console.log(`Opening ${url}`);
    openInOS(url);
  } else if (!ready) {
    console.error("Server did not come up in time.");
  }
}

function cmdTui(flags) {
  const tsxBin = require.resolve("tsx/cli");
  const entry = path.join(ROOT, "tui", "index.tsx");
  const args = [entry];
  if (flags.server) args.push("--server", flags.server);
  if (flags.port) args.push("--port", String(flags.port));

  const child = spawn(process.execPath, [tsxBin, ...args], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

function cmdMcp() {
  const tsxBin = require.resolve("tsx/cli");
  const entry = path.join(ROOT, "mcp", "server.ts");
  const child = spawn(process.execPath, [tsxBin, entry], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

function cmdApp() {
  if (process.platform === "darwin") {
    // Try to open the installed app; fall back to the download page.
    const probe = spawn("open", ["-a", "Ticketer"], { stdio: "ignore" });
    probe.on("exit", (code) => {
      if (code === 0) {
        console.log("Opened the Ticketer macOS app.");
      } else {
        console.log(
          `Ticketer.app not found. Download the latest DMG from:\n  ${RELEASES_URL}`
        );
      }
    });
  } else {
    console.log(
      `The native app is macOS-only. On this platform use "ticketer web" or "ticketer tui".\nReleases: ${RELEASES_URL}`
    );
  }
}

async function main() {
  const [, , cmd, ...argv] = process.argv;
  const { flags, rest } = parseFlags(argv);

  if (!cmd || cmd === "help" || flags.help) return help();

  switch (cmd) {
    case "serve":
      return cmdServe(flags);
    case "web":
      return cmdWeb(flags);
    case "tui":
      return cmdTui(flags);
    case "mcp":
      return cmdMcp();
    case "app":
      return cmdApp();
    default:
      console.error(`Unknown command: ${cmd}\n`);
      help();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
