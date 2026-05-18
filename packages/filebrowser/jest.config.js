/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const func = require('@jupyterlab/testing/lib/jest-config');
const config = func(__dirname);
config['testEnvironment'] = './lib/jest-env.js';
module.exports = config;
