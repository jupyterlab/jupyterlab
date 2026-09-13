'use strict';
// TODO: Remove this wrapper once @jupyter/eslint-plugin exposes
// `meta: { name: 'jupyter' }` directly.
const plugin = require('@jupyter/eslint-plugin');
module.exports = { ...plugin, meta: { name: 'jupyter' } };
