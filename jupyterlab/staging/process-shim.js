// This file is auto-generated from the corresponding file in /dev_mode
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * The `process` object injected into bundled modules that reference `process`.
 *
 * It is `process/browser` without `title`: xterm.js decides it is running in
 * Node.js when `'title' in process`, and then never looks at
 * `navigator.platform`, leaving `isMac`, `isWindows` and `isLinux` all false.
 */
const shim = { ...require('process/browser.js') };
delete shim.title;

module.exports = shim;
