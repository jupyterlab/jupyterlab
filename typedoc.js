// const git = require('git-rev-sync');

module.exports = {
  'external-modulemap': 'packages/([^/]+)/src/.*',
  exclude: [
    '**/*+(__tests__|internal|lib|node_modules|demos)/**/*',
    '.history',
    '**/.storybook',
    '**/babel.config.js',
    '**/*.spec.ts*',
    '**/*.stories.ts*',
    '**/buildutils/**',
    '**/docs/source/**',
    '**/examples/**',
    '**/test/**',
    '**/tests/**',
    '**/testutils/**',

    '**/packages/celltags/**',
    '**/packages/logconsole/**'

    // '**/packages/celltags*/**',
    // '**/packages/logconsole*/**',
    // '**/packages/settingregistry*/**',
  ],
  excludeNotExported: true,
  ignoreCompilerErrors: false,
  mode: 'modules',
  name: '@jupyterlab',
  out: 'docs/api',
  readme: 'README.md',
  theme: 'typedoc-theme',
  tsconfig: 'tsconfigdoc.json'

  // gitRevision: 'master',
  // 'sourcefile-url-prefix': `https://github.com/sinnerschrader/feature-hub/tree/${git.short()}/packages/`,
};
