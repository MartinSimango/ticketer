#!/usr/bin/env node
// Bundles mcp/server.ts into a single self-contained CJS file so the packaged
// app can run the MCP server with just `node mcp-server.cjs` — no tsx, no
// node_modules. Node built-ins (node:sqlite, etc.) stay external.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "dist", "mcp-server.cjs");

await build({
  entryPoints: [path.join(root, "mcp", "server.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  // Keep Node built-ins external; everything else (SDK, zod, lib/*) is inlined.
  external: ["node:*"],
  logLevel: "info",
});

console.log(`Bundled MCP server -> ${outfile}`);
