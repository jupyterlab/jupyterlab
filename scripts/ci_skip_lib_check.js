/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// The type checks of `.d.ts` files take most of the TypeScript build time,
// so CI jobs that build JupyterLab only to test it skip them.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configs = ['tsconfigbase.json', 'tsconfigbase.test.json'];

for (const name of configs) {
  const file = path.join(root, name);
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  config.compilerOptions.skipLibCheck = true;
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
}

// Integrity and bumpversion need a clean tree, and publish commits any change.
execFileSync('git', ['update-index', '--skip-worktree', ...configs], {
  cwd: root
});
