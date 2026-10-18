#!/usr/bin/env node
// Assembles a fully self-contained app payload into src-tauri/resources/app:
//   server/        Next.js standalone build + static assets + public/
//   mcp-server.cjs  single-file MCP server (bundled)
//   node            a copy of the Node runtime
// The Tauri shell points at this directory at runtime, so the .app needs no
// external project folder, node_modules, or system Node.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resources = path.join(root, "src-tauri", "resources");
const appDir = path.join(resources, "app");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}
function cp(src, dest, opts = {}) {
  fs.cpSync(src, dest, { recursive: true, ...opts });
}

// 1. Clean + recreate payload dir.
rmrf(appDir);
fs.mkdirSync(appDir, { recursive: true });

// 2. Next.js standalone server. pnpm's standalone node_modules is a web of
//    symlinks into the store, and Tauri's resource bundler drops symlinks — so
//    instead of copying the tree we tar it up (preserving symlinks) and let the
//    app extract it on first launch, which recreates the links intact.
const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(standalone)) {
  console.error('Missing .next/standalone — run "pnpm build" first.');
  process.exit(1);
}

// Stage the full server tree (standalone + static + public) then tar it.
const stage = path.join(resources, ".server-stage");
rmrf(stage);
fs.mkdirSync(stage, { recursive: true });
execFileSync("rsync", ["-a", `${standalone}/`, `${stage}/`], { stdio: "inherit" });
cp(path.join(root, ".next", "static"), path.join(stage, ".next", "static"));
if (fs.existsSync(path.join(root, "public"))) {
  cp(path.join(root, "public"), path.join(stage, "public"));
}
// Record the build id so the app knows when to re-extract.
const buildId = fs.readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();
fs.writeFileSync(path.join(stage, "BUILD_ID"), buildId);

execFileSync(
  "tar",
  ["-czf", path.join(appDir, "server.tar.gz"), "-C", stage, "."],
  { stdio: "inherit" }
);
rmrf(stage);
fs.writeFileSync(path.join(appDir, "BUILD_ID"), buildId);

// 4. Bundle the MCP server as a single file.
execFileSync(
  process.execPath,
  [path.join(root, "scripts", "bundle-mcp.mjs"), path.join(appDir, "mcp-server.cjs")],
  { stdio: "inherit" }
);

// 5. Fetch a self-contained Node runtime (official nodejs.org build) so the app
//    does not require system Node. The Homebrew node is dynamically linked
//    against libnode.dylib and is not portable, so we never copy it.
const NODE_VERSION = process.env.TICKETER_NODE_VERSION || "v22.20.0";
await bundleNode(appDir, NODE_VERSION);

async function bundleNode(destDir, version) {
  const platform = process.platform === "darwin" ? "darwin" : process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const name = `node-${version}-${platform}-${arch}`;
  const url = `https://nodejs.org/dist/${version}/${name}.tar.gz`;

  const cacheRoot = path.join(root, ".node-cache");
  fs.mkdirSync(cacheRoot, { recursive: true });
  const extracted = path.join(cacheRoot, name);
  const nodeBinSrc = path.join(extracted, "bin", "node");

  if (!fs.existsSync(nodeBinSrc)) {
    const tarball = path.join(cacheRoot, `${name}.tar.gz`);
    console.log(`Downloading Node ${version} (${platform}-${arch})…`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download Node: ${url} (${res.status})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(tarball, buf);
    execFileSync("tar", ["-xzf", tarball, "-C", cacheRoot], { stdio: "inherit" });
  }

  const nodeDest = path.join(destDir, "node");
  fs.copyFileSync(nodeBinSrc, nodeDest);
  fs.chmodSync(nodeDest, 0o755);
  return version;
}

// 6. Record build metadata (handy for debugging).
fs.writeFileSync(
  path.join(appDir, "BUILD_INFO.json"),
  JSON.stringify(
    {
      bundledNode: NODE_VERSION,
      builtWithNode: process.version,
      builtAt: new Date().toISOString(),
    },
    null,
    2
  )
);

console.log("Assembled self-contained payload at", appDir);
