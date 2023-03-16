/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const fs = require('fs');

const packages = [
  // 'application-extension',
  'application',
  'apputils-extension',
  'apputils',
  'attachments',
  'cells',
  'celltags-extension',
  'codeeditor',
  'codemirror-extension',
  'codemirror',
  'completer-extension',
  'completer',
  'console-extension',
  'console',
  'coreutils',
  'csvviewer-extension',
  'csvviewer',
  'debugger-extension',
  'debugger',
  'docmanager-extension',
  'docmanager',
  'docregistry',
  'documentsearch-extension',
  'documentsearch',
  'extensionmanager-extension',
  'extensionmanager',
  'filebrowser-extension',
  'filebrowser',
  'fileeditor-extension',
  'fileeditor',
  'help-extension',
  'htmlviewer-extension',
  'htmlviewer',
  'hub-extension',
  'imageviewer-extension',
  'imageviewer',
  'inspector-extension',
  'inspector',
  'javascript-extension',
  'json-extension',
  'launcher-extension',
  'launcher',
  'logconsole-extension',
  'logconsole',
  'lsp-extension',
  'mainmenu-extension',
  'mainmenu',
  'markdownviewer-extension',
  'markdownviewer',
  'mathjax-extension',
  // 'metapackage',
  // 'nbconvert-css',
  'nbformat',
  'notebook-extension',
  'notebook',
  'observables',
  'outputarea',
  'pdf-extension',
  'property-inspector',
  'rendermime-extension',
  'rendermime-interfaces',
  'rendermime',
  'running-extension',
  'running',
  'services',
  'settingeditor-extension',
  'settingeditor',
  'settingregistry',
  'shortcuts-extension',
  'statedb',
  'statusbar-extension',
  'statusbar',
  'terminal-extension',
  'terminal',
  'theme-dark-extension',
  'theme-light-extension',
  'toc',
  'toc-extension',
  'tooltip-extension',
  'tooltip',
  'translation-extension',
  'translation',
  'ui-components-extension',
  'ui-components',
  'vega5-extension'
];

const entryPoints = packages
  .flatMap(p => [`packages/${p}/src/index.ts`, `packages/${p}/src/index.tsx`])
  .filter(function (path) {
    return fs.existsSync(path);
  });

const exclude =
  packages.flatMap(p => [`packages/${p}/test`]) +
  ['packages/application-extension/src/index.tsx', 'examples/example.spec.ts'];

module.exports = {
  entryPoints,
  exclude,
  name: '@jupyterlab',
  out: 'docs/api',
  readme: 'README.md',
  theme: 'default',
  tsconfig: 'tsconfigdoc.json'
};
