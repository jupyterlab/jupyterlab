module.exports = {
  env: {
    browser: true,
    es6: true,
    commonjs: true,
    node: true,
    'jest/globals': true
  },
  globals: {
    BigInt: 'readonly',
    HTMLCollectionOf: 'readonly',
    JSX: 'readonly',
    NodeJS: 'readonly',
    RequestInit: 'readonly',
    RequestInfo: 'readonly',
    ScrollLogicalPosition: 'readonly'
  },
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:react/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'ES2018',
    project: ['./tsconfig.eslint.json']
  },
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['packages/**/*.spec.ts', 'testutils/**/*.spec.ts'],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      rules: {
        'jest/no-conditional-expect': 'warn',
        'jest/valid-title': 'warn',
        'jest/no-standalone-expect': [
          'error',
          {
            additionalTestBlockFunctions: ['it']
          }
        ]
      }
    }
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: true
        }
      }
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
    '@typescript-eslint/ban-types': 'error',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/triple-slash-reference': 'warn',
    '@typescript-eslint/no-inferrable-types': 'off',
    camelcase: [
      'error',
      {
        allow: [
          '__webpack_public_path__',
          '__webpack_share_scopes__',
          '__webpack_init_sharing__',
          '_jupyter_types_experimental',
          'allow_stdin',
          'allowed_extensions',
          'allowed_extensions_uris',
          'blocked_extensions',
          'blocked_extensions_uris',
          'bundles_extension',
          'cell_type',
          'check_update',
          'clear_output',
          'codemirror_mode',
          'comm_close',
          'comm_id',
          'comm_msg',
          'comm_open',
          'copy_from',
          'creation_date',
          'cursor_end',
          'cursor_pos',
          'cursor_start',
          'detail_level',
          'display_data',
          'display_id',
          'display_name',
          'embed_options',
          'en_US',
          'execute_input',
          'execute_result',
          'execution_count',
          'execution_state',
          'extension_data',
          'extension_name',
          'file_extension',
          'file_size',
          'hash_algorithm',
          'help_links',
          'hist_access_type',
          'ids_only',
          'implementation_version',
          'installed_version',
          'is_allowed',
          'is_selected',
          'jlab_core',
          'jupyterlab_extensions',
          'jupyterlab_mime_extensions',
          'kernel_spec',
          'language_info',
          'last_modified',
          'last_update_date',
          'latest_version',
          'lineWrap_type',
          'msg_type',
          'msg_id',
          'msgid_plural',
          'nbconverter_exporter',
          'nbformat_minor',
          'needs_restart',
          'orig_nbformat',
          'output_mimetype',
          'output_type',
          'outputs_hidden',
          'parent_header',
          'per_page',
          'plugin_name',
          'plural_forms',
          'pf_re',
          'pkg_type',
          'protocol_version',
          'pygments_lexer',
          'request_seq',
          'slide_type',
          'source_hidden',
          'shutdown_reply',
          'stop_on_error',
          'store_history',
          'subshell_id',
          'target_name',
          'target_module',
          'UNSAFE_componentWillUpdate',
          'UNSAFE_componentWillReceiveProps',
          'user_expressions',
          'zh_CN'
        ]
      }
    ],
    'id-match': ['error', '^[a-zA-Z_]+[a-zA-Z0-9_]*$'], // https://certitude.consulting/blog/en/invisible-backdoor/
    'no-inner-declarations': 'off',
    'no-prototype-builtins': 'off',
    'no-control-regex': 'warn',
    'no-undef': 'warn',
    'no-case-declarations': 'warn',
    'no-useless-escape': 'off',
    'prefer-const': 'off',
    'react/prop-types': 'warn',
    'sort-imports': [
      'error',
      {
        ignoreCase: true,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: false
      }
    ]
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
