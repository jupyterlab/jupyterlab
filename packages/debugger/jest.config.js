/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const func = require('@jupyterlab/testing/lib/jest-config');
const config = func(__dirname);
config['setupFiles'].push('jest-canvas-mock');
module.exports = config;
