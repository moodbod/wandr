const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const rootDir = resolve(__dirname, "..");
const vercelScope = "moodbods";
const vercelProject = "wandr";
const bunx = process.platform === "win32" ? "bunx.cmd" : "bunx";

if (!existsSync(resolve(rootDir, "vercel.json")) || !existsSync(resolve(rootDir, "package.json"))) {
  console.error("Expected to run from the Wandr repo root, but project files are missing.");
  process.exit(1);
}

const steps = [
  ["vercel", "link", "--yes", "--scope", vercelScope, "--project", vercelProject],
  ["vercel", "pull", "--yes", "--environment", "production", "--scope", vercelScope],
  ["vercel", "build", "--prod", "--yes", "--scope", vercelScope],
  ["vercel", "deploy", "--prebuilt", "--prod", "--scope", vercelScope],
];

console.log(`Deploying Wandr web from: ${rootDir}`);
console.log(`Target Vercel project: ${vercelScope}/${vercelProject}`);

for (const args of steps) {
  console.log(`\n> bunx ${args.join(" ")}`);

  const result = spawnSync(bunx, args, {
    cwd: rootDir,
    env: process.env,
    shell: false,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
