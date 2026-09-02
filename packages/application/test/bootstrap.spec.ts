// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { PromiseDelegate } from '@lumino/coreutils';

interface ITestPlugin {
  id: string;
  description?: string;
  autoStart?: boolean | 'defer';
  requires?: ITestToken[];
  optional?: ITestToken[];
  provides?: ITestToken | null;
}

interface ITestToken {
  name: string;
}

interface ITestModule {
  __esModule: boolean;
  __scope__?: string;
  default: ITestPlugin | ITestPlugin[];
}

interface IPluginInfo {
  id: string;
  description?: string;
  autoStart?: boolean | 'defer';
  requires: ITestToken[];
  optional: ITestToken[];
  provides: ITestToken | null;
  enabled: boolean;
  extension: string;
}

interface ITestElement {
  id: string;
  textContent: string;
  className: string;
  style: { display: string };
}

interface IJupyterLabOptions {
  availablePlugins: IPluginInfo[];
  pendingAvailablePlugins: Promise<IPluginInfo[]>;
  disabled: { matches: string[]; patterns: unknown[] };
  deferred: { matches: string[]; patterns: unknown[] };
  mimeExtensions: ITestPlugin[];
  pluginRegistry: IPluginRegistry;
}

interface IPluginRegistry {
  registeredPlugins: ITestPlugin[];
}

interface IExports {
  main: () => Promise<void>;
}

interface ITestContext {
  exports: unknown;
  PageConfig: {
    getOption: (name: string) => string;
    Extension: {
      disabled: string[];
      deferred: string[];
    };
  };
  JupyterPluginRegistry: new () => IPluginRegistry;
  PromiseDelegate: typeof PromiseDelegate;
  require: (id: string) => unknown;
  window: {
    _JUPYTERLAB: Record<
      string,
      { get: (module: string) => Promise<() => ITestModule> }
    >;
    jupyterapp?: unknown;
    setTimeout?: (handler: () => void, timeout?: number) => unknown;
  };
  document: {
    createElement: (tag: string) => ITestElement;
    body: {
      appendChild: (element: unknown) => void;
    };
  };
  console: Pick<Console, 'error' | 'warn'>;
  requestIdleCallback: (
    callback: () => void,
    options?: { timeout: number }
  ) => unknown;
  setTimeout: (handler: () => void, timeout?: number) => unknown;
}

/**
 * The idle callback and timer the bootstrap uses to wait for an idle browser.
 */
const timers: Pick<ITestContext, 'requestIdleCallback' | 'setTimeout'> = {
  requestIdleCallback: (callback: () => void) => setTimeout(callback, 0),
  setTimeout: (handler: () => void, timeout?: number) =>
    setTimeout(handler, timeout)
};

function isExports(value: unknown): value is IExports {
  return (
    typeof value === 'object' &&
    value !== null &&
    'main' in value &&
    typeof value.main === 'function'
  );
}

async function flushPromises(): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });
}

/**
 * Render one of the handlebars blocks of the template for the given packages,
 * the way the application build does.
 */
function renderEach(source: string, name: string, packages: string[]): string {
  const block = new RegExp(
    `\\s*\\{\\{#each ${name}\\}\\}([\\s\\S]*?)\\{\\{\\/each\\}\\}`
  );
  return source.replace(block, (_match, body: string) =>
    packages
      .map(packageName =>
        body
          .replace(/\{\{#if this\}\}[\s\S]*?\{\{\/if\}\}/g, '')
          .replace(/\{\{@key\}\}/g, packageName)
      )
      .join('\n')
  );
}

function loadBootstrap(
  context: ITestContext,
  extensions: string[]
): () => Promise<void> {
  const sourcePath = path.resolve(__dirname, '../../../dev_mode/index.js');
  let source = fs
    .readFileSync(sourcePath, 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace(/export async function main\(\)/, 'async function main()');
  source = renderEach(source, 'jupyterlab_mime_extensions', []);
  source = renderEach(source, 'jupyterlab_extensions', extensions).concat(
    '\nexports.main = main;\n'
  );

  vm.runInNewContext(source, context, { filename: sourcePath });

  if (!isExports(context.exports)) {
    throw new Error('Failed to load bootstrap main function.');
  }

  return context.exports.main;
}

interface IHarnessOptions {
  /**
   * Entries of the `federated_extensions` page config option.
   */
  federated?: {
    name: string;
    extension?: string;
    mimeExtension?: string;
    style?: string;
  }[];
  /**
   * Modules the federated containers expose, by package and then module name.
   *
   * A module given as a promise is returned as is, so that a test can settle it
   * on its own.
   */
  modules?: Record<
    string,
    Record<string, ITestModule | Promise<() => ITestModule>>
  >;
  /**
   * Statically linked extension packages, by package name.
   */
  staticExtensions?: Record<string, ITestModule>;
  /**
   * The `disabledExtensions` page config option.
   */
  disabled?: string[];
  /**
   * The `deferredExtensions` page config option.
   */
  deferred?: string[];
  /**
   * Whether the page runs a browser test.
   */
  browserTest?: boolean;
}

interface IHarness {
  /**
   * Run the bootstrap.
   */
  main: () => Promise<void>;
  /**
   * The modules requested from the federated containers, as `package:module`.
   */
  moduleRequests: string[];
  /**
   * The plugins passed to `registerPlugins`.
   */
  registeredPlugins: ITestPlugin[];
  /**
   * The console the bootstrap writes to.
   */
  console: ITestContext['console'];
  /**
   * The options the application was constructed with.
   */
  labOptions: () => IJupyterLabOptions;
  /**
   * The element a browser test reports through.
   */
  browserTestElement: () => ITestElement;
  /**
   * Resolve `lab.restored`.
   */
  resolveRestored: () => void;
  /**
   * Resolve `lab.allPluginsActivated`.
   */
  resolveAllPluginsActivated: () => void;
}

/**
 * Run the bootstrap against mock extensions in a mock browser context.
 */
function createHarness(options: IHarnessOptions = {}): IHarness {
  const moduleRequests: string[] = [];
  const registeredPlugins: ITestPlugin[] = [];
  const modules = options.modules ?? {};
  const staticExtensions = options.staticExtensions ?? {};
  let labOptions: IJupyterLabOptions | null = null;
  let browserTestElement: ITestElement | null = null;
  let resolveRestored: () => void = () => undefined;
  let resolveAllPluginsActivated: () => void = () => undefined;

  function captured<T>(value: T | null, what: string): T {
    if (value === null) {
      throw new Error(`${what} was not captured.`);
    }
    return value;
  }

  class MockJupyterPluginRegistry implements IPluginRegistry {
    registeredPlugins = registeredPlugins;

    registerPlugins(plugins: ITestPlugin[]): void {
      this.registeredPlugins.push(...plugins);
    }

    resolveOptionalService(): Promise<null> {
      return Promise.resolve(null);
    }

    resolveRequiredService(): Promise<Record<string, never>> {
      return Promise.resolve({});
    }
  }

  class MockJupyterLab {
    restored: Promise<void>;
    allPluginsActivated: Promise<void>;

    constructor(appOptions: IJupyterLabOptions) {
      labOptions = appOptions;
      this.restored = new Promise<void>(resolve => {
        resolveRestored = resolve;
      });
      this.allPluginsActivated = new Promise<void>(resolve => {
        resolveAllPluginsActivated = resolve;
      });
    }

    start(): void {
      return;
    }
  }

  const context: ITestContext = {
    exports: {},
    PageConfig: {
      getOption: (name: string) => {
        switch (name) {
          case 'browserTest':
            return options.browserTest ? 'true' : 'false';
          case 'exposeAppInBrowser':
          case 'devMode':
            return 'false';
          case 'federated_extensions':
            return JSON.stringify(options.federated ?? []);
          default:
            return '';
        }
      },
      Extension: {
        disabled: options.disabled ?? [],
        deferred: options.deferred ?? []
      }
    },
    JupyterPluginRegistry: MockJupyterPluginRegistry,
    PromiseDelegate,
    require: (id: string) => {
      if (id === '@jupyterlab/application') {
        return { JupyterLab: MockJupyterLab };
      }
      if (id === '@jupyterlab/services') {
        return { IConnectionStatus: {}, IServiceManager: {} };
      }
      if (id in staticExtensions) {
        return staticExtensions[id];
      }
      throw new Error(`Unexpected require: ${id}`);
    },
    window: {
      _JUPYTERLAB: Object.fromEntries(
        Object.entries(modules).map(([scope, extensionModules]) => [
          scope,
          {
            get: async (module: string) => {
              moduleRequests.push(`${scope}:${module}`);
              const value = extensionModules[module];
              return value instanceof Promise ? value : () => value;
            }
          }
        ])
      ),
      setTimeout: jest.fn()
    },
    document: {
      createElement: () => {
        browserTestElement = {
          id: '',
          textContent: '',
          className: '',
          style: { display: '' }
        };
        return browserTestElement;
      },
      body: {
        appendChild: () => undefined
      }
    },
    console: {
      error: jest.fn(),
      warn: jest.fn()
    },
    ...timers
  };

  return {
    main: loadBootstrap(context, Object.keys(staticExtensions)),
    moduleRequests,
    registeredPlugins,
    console: context.console,
    labOptions: () => captured(labOptions, 'JupyterLab options'),
    browserTestElement: () =>
      captured(browserTestElement, 'Browser test element'),
    resolveRestored: () => resolveRestored(),
    resolveAllPluginsActivated: () => resolveAllPluginsActivated()
  };
}

describe('bootstrap federated extensions', () => {
  it('defers package-level disabled extension modules until the application started', async () => {
    const harness = createHarness({
      federated: [
        {
          name: '@jupyterlab/enabled-extension',
          extension: './extension',
          mimeExtension: './mimeExtension',
          style: './style'
        },
        {
          name: '@jupyterlab/disabled-extension',
          extension: './extension',
          mimeExtension: './mimeExtension',
          style: './style'
        },
        {
          name: '@jupyterlab/plugin-disabled-extension',
          extension: './extension'
        }
      ],
      disabled: [
        '@jupyterlab/disabled-extension',
        '@jupyterlab/plugin-disabled-extension:disabled'
      ],
      modules: {
        '@jupyterlab/enabled-extension': {
          './extension': {
            __esModule: true,
            default: {
              id: '@jupyterlab/enabled-extension:plugin',
              description: 'Enabled plugin',
              autoStart: true
            }
          },
          './mimeExtension': {
            __esModule: true,
            default: {
              id: '@jupyterlab/enabled-extension:mime',
              description: 'Enabled mime plugin',
              autoStart: true
            }
          },
          './style': {
            __esModule: true,
            default: []
          }
        },
        '@jupyterlab/disabled-extension': {
          './extension': {
            __esModule: true,
            default: {
              id: '@jupyterlab/disabled-extension:plugin',
              description: 'Disabled plugin',
              autoStart: true
            }
          },
          './mimeExtension': {
            __esModule: true,
            default: {
              id: '@jupyterlab/disabled-extension:mime',
              description: 'Disabled mime plugin',
              autoStart: true
            }
          },
          './style': {
            __esModule: true,
            default: []
          }
        },
        '@jupyterlab/plugin-disabled-extension': {
          './extension': {
            __esModule: true,
            default: [
              {
                id: '@jupyterlab/plugin-disabled-extension:disabled',
                description: 'Plugin disabled by id',
                autoStart: true
              },
              {
                id: '@jupyterlab/plugin-disabled-extension:enabled',
                description: 'Sibling plugin',
                autoStart: true
              }
            ]
          }
        }
      }
    });

    await harness.main();

    const options = harness.labOptions();

    expect(harness.moduleRequests).toEqual([
      '@jupyterlab/enabled-extension:./extension',
      '@jupyterlab/enabled-extension:./mimeExtension',
      '@jupyterlab/enabled-extension:./style',
      '@jupyterlab/plugin-disabled-extension:./extension'
    ]);
    expect(harness.registeredPlugins.map(plugin => plugin.id)).toEqual([
      '@jupyterlab/enabled-extension:plugin',
      '@jupyterlab/plugin-disabled-extension:enabled'
    ]);
    expect(options.availablePlugins.map(plugin => plugin.id)).toEqual([
      '@jupyterlab/enabled-extension:mime',
      '@jupyterlab/enabled-extension:plugin',
      '@jupyterlab/plugin-disabled-extension:disabled',
      '@jupyterlab/plugin-disabled-extension:enabled'
    ]);
    expect(
      options.availablePlugins.find(
        plugin => plugin.id === '@jupyterlab/plugin-disabled-extension:disabled'
      )?.enabled
    ).toBe(false);
    expect(options.disabled.matches).toEqual([
      '@jupyterlab/plugin-disabled-extension:disabled'
    ]);

    // Restoring the application is not enough: the disabled extensions are only
    // loaded once every plugin, including the deferred ones, was activated.
    harness.resolveRestored();
    await flushPromises();
    await flushPromises();

    expect(harness.moduleRequests).toEqual([
      '@jupyterlab/enabled-extension:./extension',
      '@jupyterlab/enabled-extension:./mimeExtension',
      '@jupyterlab/enabled-extension:./style',
      '@jupyterlab/plugin-disabled-extension:./extension'
    ]);

    harness.resolveAllPluginsActivated();
    await flushPromises();
    await flushPromises();

    expect(harness.moduleRequests).toEqual([
      '@jupyterlab/enabled-extension:./extension',
      '@jupyterlab/enabled-extension:./mimeExtension',
      '@jupyterlab/enabled-extension:./style',
      '@jupyterlab/plugin-disabled-extension:./extension',
      '@jupyterlab/disabled-extension:./extension',
      '@jupyterlab/disabled-extension:./mimeExtension'
    ]);
    expect(harness.moduleRequests).not.toContain(
      '@jupyterlab/disabled-extension:./style'
    );
    expect(harness.registeredPlugins.map(plugin => plugin.id)).toEqual([
      '@jupyterlab/enabled-extension:plugin',
      '@jupyterlab/plugin-disabled-extension:enabled'
    ]);
    // The plugins of the disabled extensions reach the application through
    // the promise it was constructed with, as disabled plugins.
    expect(await options.pendingAvailablePlugins).toEqual([
      {
        id: '@jupyterlab/disabled-extension:plugin',
        description: 'Disabled plugin',
        requires: [],
        optional: [],
        provides: null,
        autoStart: true,
        enabled: false,
        extension: '@jupyterlab/disabled-extension'
      },
      {
        id: '@jupyterlab/disabled-extension:mime',
        description: 'Disabled mime plugin',
        requires: [],
        optional: [],
        provides: null,
        autoStart: true,
        enabled: false,
        extension: '@jupyterlab/disabled-extension'
      }
    ]);
    // The lists the application was constructed with are left to it.
    expect(options.availablePlugins.map(plugin => plugin.id)).toEqual([
      '@jupyterlab/enabled-extension:mime',
      '@jupyterlab/enabled-extension:plugin',
      '@jupyterlab/plugin-disabled-extension:disabled',
      '@jupyterlab/plugin-disabled-extension:enabled'
    ]);
    expect(options.disabled.matches).toEqual([
      '@jupyterlab/plugin-disabled-extension:disabled'
    ]);
  });

  it('waits for deferred disabled extension load failures in browser test mode', async () => {
    let rejectDeferredModule: (reason: Error) => void = () => undefined;
    const deferredModule = new Promise<() => ITestModule>((_, reject) => {
      rejectDeferredModule = reject;
    });

    const harness = createHarness({
      browserTest: true,
      federated: [
        {
          name: '@jupyterlab/failing-disabled-extension',
          extension: './extension'
        }
      ],
      disabled: ['@jupyterlab/failing-disabled-extension'],
      modules: {
        '@jupyterlab/failing-disabled-extension': {
          './extension': deferredModule
        }
      }
    });

    await harness.main();

    harness.resolveRestored();
    harness.resolveAllPluginsActivated();
    await flushPromises();
    await flushPromises();

    expect(harness.browserTestElement().className).toBe('');

    rejectDeferredModule(new Error('deferred disabled extension failed'));
    await flushPromises();
    await flushPromises();

    expect(harness.moduleRequests).toEqual([
      '@jupyterlab/failing-disabled-extension:./extension'
    ]);
    expect(harness.browserTestElement().className).toBe('completed');
    expect(harness.browserTestElement().textContent).toContain(
      'deferred disabled extension failed'
    );
  });

  it('disables every plugin of a package disabled by name', async () => {
    // Both packages provide a plugin whose id does not start with the package
    // name, which the plugin id convention discourages but does not prevent.
    const harness = createHarness({
      federated: [
        {
          name: '@jupyterlab/federated-disabled-extension',
          extension: './extension'
        }
      ],
      disabled: [
        '@jupyterlab/federated-disabled-extension',
        '@jupyterlab/static-disabled-extension'
      ],
      staticExtensions: {
        '@jupyterlab/static-disabled-extension': {
          __esModule: true,
          default: [
            {
              id: 'static-other-prefix:plugin',
              description: 'Static plugin with a mismatched id',
              autoStart: true
            },
            {
              id: '@jupyterlab/static-disabled-extension:plugin',
              description: 'Static plugin',
              autoStart: true
            }
          ]
        }
      },
      modules: {
        '@jupyterlab/federated-disabled-extension': {
          './extension': {
            __esModule: true,
            default: [
              {
                id: 'federated-other-prefix:plugin',
                description: 'Federated plugin with a mismatched id',
                autoStart: true
              },
              {
                id: '@jupyterlab/federated-disabled-extension:plugin',
                description: 'Federated plugin',
                autoStart: true
              }
            ]
          }
        }
      }
    });

    await harness.main();

    // No plugin of the statically linked package is registered, including the
    // one whose id does not start with the package name.
    expect(harness.registeredPlugins).toEqual([]);
    expect(
      harness
        .labOptions()
        .availablePlugins.map(plugin => [plugin.id, plugin.enabled])
    ).toEqual([
      ['static-other-prefix:plugin', false],
      ['@jupyterlab/static-disabled-extension:plugin', false]
    ]);
    expect(harness.labOptions().disabled.matches).toEqual([
      'static-other-prefix:plugin',
      '@jupyterlab/static-disabled-extension:plugin'
    ]);
    // Only the plugin which does not follow the id convention is reported, as
    // the user cannot tell from the config that it was disabled too.
    expect(harness.console.warn).toHaveBeenCalledTimes(1);
    expect(harness.console.warn).toHaveBeenCalledWith(
      expect.stringContaining('static-other-prefix:plugin')
    );

    harness.resolveRestored();
    harness.resolveAllPluginsActivated();
    await flushPromises();
    await flushPromises();

    // The federated package is treated the same way once it is loaded.
    expect(harness.moduleRequests).toEqual([
      '@jupyterlab/federated-disabled-extension:./extension'
    ]);
    expect(harness.registeredPlugins).toEqual([]);
    expect(
      (await harness.labOptions().pendingAvailablePlugins).map(plugin => [
        plugin.id,
        plugin.enabled
      ])
    ).toEqual([
      ['federated-other-prefix:plugin', false],
      ['@jupyterlab/federated-disabled-extension:plugin', false]
    ]);
    expect(harness.console.warn).toHaveBeenCalledTimes(2);
    expect(harness.console.warn).toHaveBeenLastCalledWith(
      expect.stringContaining('federated-other-prefix:plugin')
    );
  });
});
