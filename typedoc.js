// const git = require('git-rev-sync');

module.exports = {
  'external-modulemap': 'packages/([^/]+)/src/.*',
  // 'sourcefile-url-prefix': `https://github.com/sinnerschrader/feature-hub/tree/${git.short()}/packages/`,
  exclude: [
    '**/*+(__tests__|internal|lib|node_modules|demos)/**/*',
    '.history'
  ],
  excludeExternals: false,
  excludeNotExported: true,
  excludePrivate: true,
  // gitRevision: 'master',
  ignoreCompilerErrors: false,
  mode: 'modules',
  name: '@jupyterlab',
  out: 'docs/api',
  readme: 'README.md',
  theme: 'typedoc-theme',
  tsconfig: 'tsconfig.json'
};
