import { spawnSync } from "node:child_process";
import { access, cp, mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const stageRoot = path.join(os.tmpdir(), `chessmentor-build-${process.pid}`);
const viteBin = path.join(root, "node_modules/vite/bin/vite.js");

await rm(distDir, { recursive: true, force: true });
await rm(stageRoot, { recursive: true, force: true });
await mkdir(stageRoot, { recursive: true });

await cp(path.join(root, "src"), path.join(stageRoot, "src"), { recursive: true });
await cp(path.join(root, "public"), path.join(stageRoot, "public"), { recursive: true });
await cp(path.join(root, "index.html"), path.join(stageRoot, "index.html"));
await cp(path.join(root, "package.json"), path.join(stageRoot, "package.json"));
await cp(path.join(root, "vite.config.js"), path.join(stageRoot, "vite.config.js"));
await symlink(path.join(root, "node_modules"), path.join(stageRoot, "node_modules"), "dir");

for (const envFile of [".env", ".env.local"]) {
  try {
    await access(path.join(root, envFile));
    await cp(path.join(root, envFile), path.join(stageRoot, envFile));
  } catch {
    // Optional local env files are intentionally ignored when absent.
  }
}

const build = spawnSync(process.execPath, [viteBin, "build"], {
  cwd: stageRoot,
  env: process.env,
  stdio: "inherit",
});

if (build.status !== 0) {
  await rm(stageRoot, { recursive: true, force: true });
  process.exit(build.status ?? 1);
}

await cp(path.join(stageRoot, "dist"), distDir, { recursive: true });
await rm(stageRoot, { recursive: true, force: true });

console.log(`Built ChessMentor AI to ${distDir}`);
