#!/usr/bin/env node
/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * This file is a temporary workaround to ensure that we can set
 * max_old_space by default but allow others to override it.
 *
 * When node 10 support is dropped, we can remove this file as node 12
 * should just grow as required.
 *
 * See: https://github.com/jupyterlab/jupyterlab/issues/7175
 *
 * @example
 * node ensure-max-old-space.js real-cli.js arg1 arg2
 */
import { execFileSync } from 'child_process';
import * as which from 'which';

const MAX_OLD_SPACE = '--max_old_space_size=4096';

if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = MAX_OLD_SPACE;
} else if (!/--max[_\-]old[_\-]space[_\-]size/.test(process.env.NODE_OPTIONS)) {
  process.env.NODE_OPTIONS += ` ${MAX_OLD_SPACE}`;
}

const program = which.sync(process.argv[2]);
const args = process.argv.slice(3);
execFileSync(program, args, { env: process.env, stdio: 'inherit' });
