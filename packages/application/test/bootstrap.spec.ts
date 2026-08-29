// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import fs from 'fs';
import path from 'path';
import vm from 'vm';

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
  disabled: { matches: string[]; patterns: unknown[] };
  deferred: { matches: string[]; patterns: unknown[] };
  mimeExtensions: ITestPlugin[];
  pluginRegistry: IPluginRegistry;
}

interface IPluginRegistry {
  registeredPlugins: ITestPlugin[];
}

interface ITestInfo {
  availablePlugins: IPluginInfo[];
  disabled: { matches: string[]; patterns: unknown[] };
  addAvailablePlugins: (plugins: IPluginInfo[]) => void;
  addDisabledPluginIds: (pluginIds: string[]) => void;
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
}

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

function loadBootstrap(context: ITestContext): () => Promise<void> {
  const sourcePath = path.resolve(__dirname, '../../../dev_mode/index.js');
  const source = fs
    .readFileSync(sourcePath, 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace(/export async function main\(\)/, 'async function main()')
    .replace(
      /\s*\{\{#each jupyterlab_mime_extensions\}\}[\s\S]*?\{\{\/each\}\}/,
      ''
    )
    .replace(/\s*\{\{#each jupyterlab_extensions\}\}[\s\S]*?\{\{\/each\}\}/, '')
    .concat('\nexports.main = main;\n');

  vm.runInNewContext(source, context, { filename: sourcePath });

  if (!isExports(context.exports)) {
    throw new Error('Failed to load bootstrap main function.');
  }

  return context.exports.main;
}

describe('bootstrap federated extensions', () => {
  it('defers package-level disabled extension modules until after restoration', async () => {
    const moduleRequests: string[] = [];
    const registeredPlugins: ITestPlugin[] = [];
    let labOptions: IJupyterLabOptions | null = null;
    let labInfo: ITestInfo | null = null;
    let resolveRestored: () => void;

    function getLabOptions(): IJupyterLabOptions {
      if (!labOptions) {
        throw new Error('JupyterLab options were not captured.');
      }
      return labOptions;
    }

    function getLabInfo(): ITestInfo {
      if (!labInfo) {
        throw new Error('JupyterLab info was not captured.');
      }
      return labInfo;
    }

    const modules: Record<string, Record<string, ITestModule>> = {
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
    };

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
      info: ITestInfo;
      restored: Promise<void>;

      constructor(options: IJupyterLabOptions) {
        labOptions = options;
        const info: ITestInfo = {
          availablePlugins: options.availablePlugins,
          disabled: {
            matches: [...options.disabled.matches],
            patterns: [...options.disabled.patterns]
          },
          addAvailablePlugins: (plugins: IPluginInfo[]) => {
            info.availablePlugins.push(...plugins);
          },
          addDisabledPluginIds: (pluginIds: string[]) => {
            info.disabled.matches.push(...pluginIds);
          }
        };
        this.info = info;
        labInfo = info;
        this.restored = new Promise<void>(resolve => {
          resolveRestored = resolve;
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
            case 'exposeAppInBrowser':
            case 'devMode':
              return 'false';
            case 'federated_extensions':
              return JSON.stringify([
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
              ]);
            default:
              return '';
          }
        },
        Extension: {
          disabled: [
            '@jupyterlab/disabled-extension',
            '@jupyterlab/plugin-disabled-extension:disabled'
          ],
          deferred: []
        }
      },
      JupyterPluginRegistry: MockJupyterPluginRegistry,
      require: (id: string) => {
        if (id === '@jupyterlab/application') {
          return { JupyterLab: MockJupyterLab };
        }
        if (id === '@jupyterlab/services') {
          return { IConnectionStatus: {}, IServiceManager: {} };
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
                return () => extensionModules[module];
              }
            }
          ])
        )
      },
      document: {
        createElement: () => ({
          id: '',
          textContent: '',
          className: '',
          style: { display: '' }
        }),
        body: {
          appendChild: () => undefined
        }
      },
      console: {
        error: jest.fn(),
        warn: jest.fn()
      }
    };

    const main = loadBootstrap(context);

    await main();

    const options = getLabOptions();

    expect(moduleRequests).toEqual([
      '@jupyterlab/enabled-extension:./extension',
      '@jupyterlab/enabled-extension:./mimeExtension',
      '@jupyterlab/enabled-extension:./style',
      '@jupyterlab/plugin-disabled-extension:./extension'
    ]);
    expect(registeredPlugins.map(plugin => plugin.id)).toEqual([
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
    expect(getLabInfo().disabled.matches).toEqual([
      '@jupyterlab/plugin-disabled-extension:disabled'
    ]);

    resolveRestored!();
    await flushPromises();
    await flushPromises();

    expect(moduleRequests).toEqual([
      '@jupyterlab/enabled-extension:./extension',
      '@jupyterlab/enabled-extension:./mimeExtension',
      '@jupyterlab/enabled-extension:./style',
      '@jupyterlab/plugin-disabled-extension:./extension',
      '@jupyterlab/disabled-extension:./extension',
      '@jupyterlab/disabled-extension:./mimeExtension'
    ]);
    expect(moduleRequests).not.toContain(
      '@jupyterlab/disabled-extension:./style'
    );
    expect(registeredPlugins.map(plugin => plugin.id)).toEqual([
      '@jupyterlab/enabled-extension:plugin',
      '@jupyterlab/plugin-disabled-extension:enabled'
    ]);
    expect(
      options.availablePlugins
        .filter(plugin => plugin.extension === '@jupyterlab/disabled-extension')
        .map(plugin => ({ id: plugin.id, enabled: plugin.enabled }))
    ).toEqual([
      { id: '@jupyterlab/disabled-extension:plugin', enabled: false },
      { id: '@jupyterlab/disabled-extension:mime', enabled: false }
    ]);
    expect(getLabInfo().disabled.matches).toEqual([
      '@jupyterlab/plugin-disabled-extension:disabled',
      '@jupyterlab/disabled-extension:plugin',
      '@jupyterlab/disabled-extension:mime'
    ]);
  });

  it('waits for deferred disabled extension load failures in browser test mode', async () => {
    const moduleRequests: string[] = [];
    const registeredPlugins: ITestPlugin[] = [];
    let resolveRestored: () => void;
    let rejectDeferredModule: (reason: Error) => void;
    let browserTestElement: ITestElement | null = null;

    function getBrowserTestElement(): ITestElement {
      if (!browserTestElement) {
        throw new Error('Browser test element was not created.');
      }
      return browserTestElement;
    }

    const deferredModule = new Promise<() => ITestModule>((_, reject) => {
      rejectDeferredModule = reject;
    });

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
      info: ITestInfo;
      restored: Promise<void>;

      constructor(options: IJupyterLabOptions) {
        const info: ITestInfo = {
          availablePlugins: options.availablePlugins,
          disabled: {
            matches: [...options.disabled.matches],
            patterns: [...options.disabled.patterns]
          },
          addAvailablePlugins: (plugins: IPluginInfo[]) => {
            info.availablePlugins.push(...plugins);
          },
          addDisabledPluginIds: (pluginIds: string[]) => {
            info.disabled.matches.push(...pluginIds);
          }
        };
        this.info = info;
        this.restored = new Promise<void>(resolve => {
          resolveRestored = resolve;
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
              return 'true';
            case 'exposeAppInBrowser':
            case 'devMode':
              return 'false';
            case 'federated_extensions':
              return JSON.stringify([
                {
                  name: '@jupyterlab/failing-disabled-extension',
                  extension: './extension'
                }
              ]);
            default:
              return '';
          }
        },
        Extension: {
          disabled: ['@jupyterlab/failing-disabled-extension'],
          deferred: []
        }
      },
      JupyterPluginRegistry: MockJupyterPluginRegistry,
      require: (id: string) => {
        if (id === '@jupyterlab/application') {
          return { JupyterLab: MockJupyterLab };
        }
        if (id === '@jupyterlab/services') {
          return { IConnectionStatus: {}, IServiceManager: {} };
        }
        throw new Error(`Unexpected require: ${id}`);
      },
      window: {
        _JUPYTERLAB: {
          '@jupyterlab/failing-disabled-extension': {
            get: async (module: string) => {
              moduleRequests.push(
                `@jupyterlab/failing-disabled-extension:${module}`
              );
              return deferredModule;
            }
          }
        },
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
      }
    };

    const main = loadBootstrap(context);

    await main();

    resolveRestored!();
    await flushPromises();
    await flushPromises();

    expect(getBrowserTestElement().className).toBe('');

    rejectDeferredModule!(new Error('deferred disabled extension failed'));
    await flushPromises();
    await flushPromises();

    expect(moduleRequests).toEqual([
      '@jupyterlab/failing-disabled-extension:./extension'
    ]);
    expect(getBrowserTestElement().className).toBe('completed');
    expect(getBrowserTestElement().textContent).toContain(
      'deferred disabled extension failed'
    );
  });
});
