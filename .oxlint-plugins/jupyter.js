'use strict';
// TODO: Remove this wrapper once @jupyter/eslint-plugin exposes
// `meta: { name: 'jupyter' }` directly. When that lands, replace every
// occurrence of "./.oxlint-plugins/jupyter.js" in .oxlintrc.json with
// "@jupyter/eslint-plugin" and delete this file.
// Tracked in: https://github.com/jupyterlab/jupyterlab/issues (file wrapper ticket)
const plugin = require('@jupyter/eslint-plugin');
module.exports = { ...plugin, meta: { name: 'jupyter' } };
