import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import jestPlugin from 'eslint-plugin-jest';
import reactPlugin from 'eslint-plugin-react';
import prettierPlugin from 'eslint-plugin-prettier';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores([
    '**/node_modules',
    '**/build',
    '**/lib',
    '**/node_modules',
    '**/mock_packages',
    '**/static',
    '**/typings',
    '**/schemas',
    '**/themes',
    '**/coverage',
    '**/*.map.js',
    '**/*.bundle.js',
    'dev_mode/index.js',
    '!dev_mode/static/index.out.js',
    'dev_mode/workspaces',
    'docs/_build',
    'docs/api',
    'docs/build',
    'docs/source/api',
    'examples/example.spec.ts',
    'examples/federated/core_package/index.template.js',
    'examples/federated/core_package/index.js',
    'examples/federated/labextensions',
    'galata/playwright-report',
    'jupyterlab/chrome-test.js',
    'jupyterlab/geckodriver',
    'jupyterlab/staging/yarn.js',
    'jupyterlab/staging/index.js',
    'jupyterlab/staging/webpack.config.js',
    'packages/codemirror/test/foo*.js',
    'packages/extensionmanager-extension/examples/listings',
    'packages/nbconvert-css/raw.js',
    'packages/services/dist',
    'packages/ui-components/src/icon/iconimports.ts',
    '**/.idea/',
    '**/.history/',
    '**/.vscode/',
    'packages/lsp/src/_*',
    'packages/lsp/schema.js',
    '**/.pixi'
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx'],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.node,
        ...globals.jest,
        BigInt: 'readonly',
        HTMLCollectionOf: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
        RequestInit: 'readonly',
        RequestInfo: 'readonly',
        ScrollLogicalPosition: 'readonly'
      },

      ecmaVersion: 2018,
      sourceType: 'module'
    },

    rules: {
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

      'id-match': ['error', '^[a-zA-Z_]+[a-zA-Z0-9_]*$'],
      'no-inner-declarations': 'off',
      'no-prototype-builtins': 'off',
      'no-control-regex': 'warn',
      'no-undef': 'warn',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'off',
      'prefer-const': 'off'
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettierPlugin,
      jest: jestPlugin,
      react: reactPlugin
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.node,
        ...globals.jest,
        BigInt: 'readonly',
        HTMLCollectionOf: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
        RequestInit: 'readonly',
        RequestInfo: 'readonly',
        ScrollLogicalPosition: 'readonly'
      },

      parser: tseslint.parser,
      ecmaVersion: 2018,

      parserOptions: {
        project: ['./tsconfig.eslint.json']
      }
    },

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

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'none'
        }
      ],

      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',

      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-ignore': true
        }
      ],

      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/triple-slash-reference': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

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

      'id-match': ['error', '^[a-zA-Z_]+[a-zA-Z0-9_]*$'],
      'no-inner-declarations': 'off',
      'no-prototype-builtins': 'off',
      'no-control-regex': 'warn',
      'no-undef': 'warn',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'off',
      'prefer-const': 'off',
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'prefer-arrow-callback': 'error',
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
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.object.name="PageConfig"][callee.property.name="getBaseUrl"]',
          message:
            'PageConfig.getBaseUrl() should only be called in makeSettings() function and in tests/examples'
        }
      ]
    },

    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['packages/**/*.spec.ts', 'testutils/**/*.spec.ts'],

    plugins: {
      jest: jestPlugin
    },

    rules: {
      ...jestPlugin.configs.recommended.rules,
      'jest/no-conditional-expect': 'warn',
      'jest/valid-title': 'warn',
      'jest/no-standalone-expect': [
        'error',
        {
          additionalTestBlockFunctions: ['it']
        }
      ]
    }
  },
  {
    files: [
      '**/*.spec.ts',
      '**/test/**/*.ts',
      '**/tests/**/*.ts',
      'examples/**/*.ts',
      'packages/*/examples/**/*.ts',
      'packages/services/src/serverconnection.ts'
    ],

    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  prettierConfig
]);
