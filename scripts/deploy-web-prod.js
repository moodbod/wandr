#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const vercelCommand = isWindows ? 'npx.cmd' : 'npx';
const vercelScope = 'moodbods';
const vercelProject = 'wandr';

for (const filename of ['vercel.json', 'package.json']) {
  if (!fs.existsSync(path.join(rootDir, filename))) {
    console.error('Expected to run from the Wandr repo root, but project files are missing.');
    process.exit(1);
  }
}

console.log(`Deploying Wandr web from: ${rootDir}`);
console.log(`Target Vercel project: ${vercelScope}/${vercelProject}`);

const steps = [
  ['vercel', 'link', '--yes', '--scope', vercelScope, '--project', vercelProject],
  ['vercel', 'pull', '--yes', '--environment', 'production', '--scope', vercelScope],
  ['vercel', 'build', '--prod', '--yes', '--scope', vercelScope],
  ['vercel', 'deploy', '--prebuilt', '--prod', '--scope', vercelScope],
];

for (const args of steps) {
  console.log(`\n> npx ${args.join(' ')}`);

  const result = spawnSync(vercelCommand, args, {
    cwd: rootDir,
    env: process.env,
    shell: isWindows,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
