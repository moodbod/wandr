const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const rootDir = resolve(__dirname, "..");

if (!existsSync(resolve(rootDir, "vercel.json")) || !existsSync(resolve(rootDir, "package.json"))) {
  console.error("Expected to run from the Wandr repo root, but project files are missing.");
  process.exit(1);
}

const bunx = process.platform === "win32" ? "bunx.cmd" : "bunx";
const steps = [
  ["vercel", "link", "--yes", "--scope", "moodbods", "--project", "wandr"],
  ["vercel", "pull", "--yes", "--environment", "production", "--scope", "moodbods"],
  ["vercel", "build", "--prod", "--yes", "--scope", "moodbods"],
  ["vercel", "deploy", "--prebuilt", "--prod", "--scope", "moodbods"],
];

console.log(`Deploying Wandr web from: ${rootDir}`);
console.log("Target Vercel project: moodbods/wandr");

for (const args of steps) {
  const result = spawnSync(bunx, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
