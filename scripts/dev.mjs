import { spawn } from "node:child_process";
import { access, cp, mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const stageRoot = path.join(os.tmpdir(), "chessmentor-dev");
const viteBin = path.join(root, "node_modules/vite/bin/vite.js");

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

console.log("Starting ChessMentor AI dev server from a clean staging folder.");
console.log("If you edit source files, restart npm run dev to refresh the staged copy.");

const child = spawn(process.execPath, [viteBin, "--host", "0.0.0.0", "--port", "5173"], {
  cwd: stageRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", async (code) => {
  await rm(stageRoot, { recursive: true, force: true });
  process.exit(code ?? 0);
});
