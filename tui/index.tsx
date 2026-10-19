import React from "react";
import { render, Box, Text } from "ink";
import {
  resolvePort,
  baseUrl,
  isServerUp,
  startServer,
  waitForServer,
} from "../bin/lib/config.mjs";
import { ApiClient } from "./api";
import { App } from "./app";

function parseArgs(argv: string[]) {
  const out: { server?: string; port?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--server" || argv[i] === "-s") out.server = argv[++i];
    else if (argv[i] === "--port" || argv[i] === "-p") out.port = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Explicit remote server: just use it.
  if (args.server) {
    const url = args.server.replace(/\/$/, "");
    if (!(await isServerUp(url))) {
      console.error(`No Ticketer server reachable at ${url}`);
      process.exit(1);
    }
    render(<App api={new ApiClient(url)} />);
    return;
  }

  // Local: reuse a running server or start a headless one.
  const port = resolvePort(args.port);
  const url = baseUrl(port);
  let child: import("node:child_process").ChildProcess | null = null;

  if (!(await isServerUp(url))) {
    process.stdout.write(`Starting Ticketer server at ${url} …\n`);
    const started = startServer(port, { inherit: false });
    child = started.child;
    const ok = await waitForServer(url);
    if (!ok) {
      console.error("Server did not start in time.");
      child?.kill("SIGTERM");
      process.exit(1);
    }
  }

  const { waitUntilExit } = render(<App api={new ApiClient(url)} />);
  await waitUntilExit();
  // If we started the server, shut it down when the TUI closes.
  child?.kill("SIGTERM");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
