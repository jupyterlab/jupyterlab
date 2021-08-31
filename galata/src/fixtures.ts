/* eslint-disable @typescript-eslint/ban-ts-comment */
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Session, TerminalAPI, Workspace } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  test as base,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType
} from '@playwright/test';
import * as json5 from 'json5';
import fetch from 'node-fetch';
import { ContentsHelper } from './contents';
import { galata } from './galata';
import { IJupyterLabPageFixture } from './jupyterlabpage';

/**
 * Galata test arguments
 */
export interface IGalataTestArgs extends PlaywrightTestArgs {
  /**
   * JupyterLab test page.
   *
   * It brings the following feature on top of Playwright Page object:
   * - Goto to JupyterLab URL and wait for the application to be ready
   * - Helpers for JupyterLab
   * - Settings mock-up
   * - State mock-up
   * - Track sessions and terminals opened during a test to close them at the end
   *
   * Note: If autoGoto is true, the filebrowser will be set inside tmpPath.
   * Nothing is preventing you to navigate to some other folders.
   * So you must avoid creating files outside that directory to avoid
   * coupling effects between tests.
   *
   */
  page: IJupyterLabPageFixture;
}

/**
 * Galata test configuration
 */
export type GalataOptions = {
  /**
   * Application URL path fragment.
   *
   * Default: /lab
   */
  appPath: string;
  /**
   * Whether to go to JupyterLab page within the fixture or not.
   *
   * Default: true
   */
  autoGoto: boolean;
  /**
   * Galata can keep the uploaded and created files in ``tmpPath`` on
   * the server root for debugging purpose. By default the files are
   * always deleted
   *
   * - 'off' - ``tmpPath`` is deleted after each tests
   * - 'on' - ``tmpPath`` is never deleted
   * - 'only-on-failure' - ``tmpPath`` is deleted except if a test failed or timed out.
   */
  serverFiles: 'on' | 'off' | 'only-on-failure';
  /**
   * Mock JupyterLab state in-memory or not.
   *
   * Possible values are:
   * - true (default): JupyterLab state will be mocked on a per test basis
   * - false: JupyterLab state won't be mocked (Be careful it will write state in local files)
   * - Record<string, unknown>: Initial JupyterLab data state - Mapping (state key, value).
   *
   * By default the state is stored in-memory.
   */
  mockState: boolean | Record<string, unknown>;
  /**
   * Mock JupyterLab settings in-memory or not.
   *
   * Possible values are:
   * - true: JupyterLab settings will be mocked on a per test basis
   * - false: JupyterLab settings won't be mocked (Be careful it will read & write settings local files)
   * - Record<string, unknown>: Mapping {pluginId: settings} that will be default user settings
   *
   * The default value is `galata.DEFAULT_SETTINGS`
   *
   * By default the settings are stored in-memory. However the
   * they are still initialized with the hard drive values.
   */
  mockSettings: boolean | Record<string, unknown>;
  /**
   * Sessions created during the test.
   *
   * Possible values are:
   * - null: The sessions API won't be mocked
   * - Map<string, Session.IModel>: The sessions created during a test.
   *
   * By default the sessions created during a test will be tracked and disposed at the end.
   */
  sessions: Map<string, Session.IModel> | null;
  /**
   * Terminals created during the test.
   *
   * Possible values are:
   * - null: The Terminals API won't be mocked
   * - Map<string, TerminalsAPI.IModel>: The Terminals created during a test.
   *
   * By default the Terminals created during a test will be tracked and disposed at the end.
   */
  terminals: Map<string, TerminalAPI.IModel> | null;
  /**
   * Unique test temporary path created on the server.
   *
   * Note: if you override this string, you will need to take care of creating the
   * folder and cleaning it.
   */
  tmpPath: string;
};

/**
 * JupyterLab customized test.
 */
// @ts-ignore
export const test: TestType<
  IGalataTestArgs & GalataOptions & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> = base.extend<GalataOptions>({
  /**
   * `baseURL` used for all pages in the test. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   *
   * It can also be set with `TARGET_URL` environment variable and default to `http://localhost:8888`.
   */
  baseURL: async ({ baseURL }, use) => {
    await use(baseURL ?? process.env.TARGET_URL ?? 'http://localhost:8888');
  },
  /**
   * Application URL path fragment.
   *
   * Default: /lab
   */
  appPath: '/lab',
  /**
   * Whether to go to JupyterLab page within the fixture or not.
   *
   * Default: true.
   *
   * Note: Setting it to false allows to register new route mock-ups for example.
   */
  autoGoto: true,
  /**
   * Mock JupyterLab state in-memory or not.
   *
   * Possible values are:
   * - true (default): JupyterLab state will be mocked on a per test basis
   * - false: JupyterLab state won't be mocked (Be careful it will write state in local files)
   * - Record<string, unknown>: Initial JupyterLab data state - Mapping (state key, value).
   *
   * By default the state is stored in-memory
   */
  mockState: true,
  /**
   * Mock JupyterLab settings in-memory or not.
   *
   * Possible values are:
   * - true: JupyterLab settings will be mocked on a per test basis
   * - false: JupyterLab settings won't be mocked (Be careful it may write settings local files)
   * - Record<string, unknown>: Mapping {pluginId: settings} that will be default user settings
   *
   * The default value is `galata.DEFAULT_SETTINGS`
   *
   * By default the settings are stored in-memory. However the
   * they are still initialized with the hard drive values.
   */
  mockSettings: galata.DEFAULT_SETTINGS,
  /**
   * Galata can keep the uploaded and created files in ``tmpPath`` on
   * the server root for debugging purpose. By default the files are
   * always deleted.
   *
   * - 'off' - ``tmpPath`` is deleted after each tests
   * - 'on' - ``tmpPath`` is never deleted
   * - 'only-on-failure' - ``tmpPath`` is deleted except if a test failed or timed out.
   */
  serverFiles: 'off',
  /**
   * Sessions created during the test.
   *
   * Possible values are:
   * - null: The sessions API won't be mocked
   * - Map<string, Session.IModel>: The sessions created during a test.
   *
   * By default the sessions created during a test will be tracked and disposed at the end.
   */
  sessions: async ({ baseURL }, use) => {
    const sessions = new Map<string, Session.IModel>();

    await use(sessions);

    if (sessions.size > 0) {
      await Private.clearRunners(baseURL!, [...sessions.keys()], 'sessions');
    }
  },
  /**
   * Terminals created during the test.
   *
   * Possible values are:
   * - null: The Terminals API won't be mocked
   * - Map<string, TerminalsAPI.IModel>: The Terminals created during a test.
   *
   * By default the Terminals created during a test will be tracked and disposed at the end.
   */
  terminals: async ({ baseURL }, use) => {
    const terminals = new Map<string, TerminalAPI.IModel>();

    await use(terminals);

    if (terminals.size > 0) {
      await Private.clearRunners(baseURL!, [...terminals.keys()], 'terminals');
    }
  },
  /**
   * Unique test temporary path created on the server.
   *
   * Note: if you override this string, you will need to take care of creating the
   * folder and cleaning it.
   */
  tmpPath: async ({ baseURL, serverFiles }, use, testInfo) => {
    const parts = testInfo.outputDir.split('/');
    const testFolder = parts[parts.length - 1];

    const contents = new ContentsHelper(baseURL!);

    if (await contents.directoryExists(testFolder)) {
      await contents.deleteDirectory(testFolder);
    }

    // Create the test folder on the server
    await contents.createDirectory(testFolder);

    await use(testFolder);

    // Delete the test folder on the server
    // If serverFiles is 'on' or 'only-on-failure', keep the server files for the test
    if (
      serverFiles === 'off' ||
      (serverFiles === 'only-on-failure' &&
        (testInfo.status === 'passed' || testInfo.status === 'skipped'))
    ) {
      await contents.deleteDirectory(testFolder);
    }
  },
  /**
   * JupyterLab test page.
   *
   * It brings the following feature on top of Playwright Page object:
   * - Goto to JupyterLab URL and wait for the application to be ready (autoGoto == true)
   * - Helpers for JupyterLab
   * - Settings mock-up
   * - State mock-up
   * - Track sessions and terminals opened during a test to close them at the end
   *
   * Note: If autoGoto is true, the filebrowser will be set inside tmpPath.
   * Nothing is preventing you to navigate to some other folders.
   * So you must avoid creating files outside that directory to avoid
   * coupling effects between tests.
   */
  // @ts-ignore
  page: async (
    {
      appPath,
      autoGoto,
      baseURL,
      mockSettings,
      mockState,
      page,
      sessions,
      terminals,
      tmpPath
    },
    use
  ) => {
    // Hook the helpers
    const jlabWithPage = galata.addHelpersToPage(page, baseURL!, appPath!);

    // Add server mocks
    const settings: ISettingRegistry.IPlugin[] = [];
    if (mockSettings) {
      // Settings will be stored in-memory (after loading the initial version from disk)
      await Private.mockSettings(
        page,
        settings,
        typeof mockSettings === 'boolean' ? {} : { ...mockSettings }
      );
    }

    const workspace: Workspace.IWorkspace = {
      data: {},
      metadata: { id: 'default' }
    };
    if (mockState) {
      if (typeof mockState !== 'boolean') {
        workspace.data = { ...mockState } as any;
      }
      // State will be stored in-memory (after loading the initial version from disk)
      await Private.mockState(page, workspace);
    }

    // Add sessions and terminals trackers
    if (sessions) {
      await Private.mockRunners(page, sessions, 'sessions');
    }
    if (terminals) {
      await Private.mockRunners(page, terminals, 'terminals');
    }

    if (autoGoto) {
      // Load and initialize JupyterLab and goto test folder
      await jlabWithPage.goto(`tree/${tmpPath}`);
    }

    await use(jlabWithPage);
  }
});

/**
 * Private methods
 */
namespace Private {
  /**
   * Clear all wanted sessions or terminals.
   *
   * @param baseURL Application base URL
   * @param runners Session or terminal ids to stop
   * @param type Type of runner; session or terminal
   * @returns Whether the runners were closed or not
   */
  export async function clearRunners(
    baseURL: string,
    runners: string[],
    type: 'sessions' | 'terminals'
  ): Promise<boolean> {
    const responses = await Promise.all(
      [...new Set(runners)].map(id =>
        fetch(`${baseURL}/api/${type}/${id}`, { method: 'DELETE' })
      )
    );
    return responses.every(response => response.ok);
  }

  /**
   * Mock the runners API to display only those created during a test
   *
   * @param page Page model object
   * @param runners Mapping of current test runners
   * @param type Type of runner; session or terminal
   */
  export function mockRunners(
    page: Page,
    runners: Map<string, any>,
    type: 'sessions' | 'terminals'
  ): Promise<void> {
    const routeRegex =
      type === 'sessions' ? galata.Routes.sessions : galata.Routes.terminals;
    // Listen for closing connection (may happen when request are still being processed)
    let isClosed = false;
    const ctxt = page.context();
    ctxt.on('close', () => {
      isClosed = true;
    });
    ctxt.browser()?.on('disconnected', () => {
      isClosed = true;
    });
    return page.route(routeRegex, async (route, request) => {
      switch (request.method()) {
        case 'DELETE': {
          // slice is used to remove the '/' prefix
          const id = routeRegex.exec(request.url())?.groups?.id?.slice(1);

          await route.continue();

          if (id && runners.has(id)) {
            runners.delete(id);
          }

          break;
        }
        case 'GET': {
          // slice is used to remove the '/' prefix
          const id = routeRegex.exec(request.url())?.groups?.id?.slice(1);

          if (id) {
            if (runners.has(id)) {
              // Proxy the GET request
              const response = await fetch(request.url(), {
                headers: request.headers(),
                method: request.method()
              });
              if (!response.ok) {
                if (!page.isClosed() && !isClosed) {
                  return route.fulfill({
                    status: response.status,
                    body: await response.text()
                  });
                }
                break;
              }
              const data = await response.json();
              // Update stored runners
              runners.set(type === 'sessions' ? data.id : data.name, data);

              if (!page.isClosed() && !isClosed) {
                return route.fulfill({
                  status: 200,
                  body: JSON.stringify(data),
                  contentType: 'application/json'
                });
              }
              break;
            } else {
              if (!page.isClosed() && !isClosed) {
                return route.fulfill({
                  status: 404
                });
              }
              break;
            }
          } else {
            // Proxy the GET request
            const response = await fetch(request.url(), {
              headers: request.headers(),
              method: request.method()
            });
            if (!response.ok) {
              if (!page.isClosed() && !isClosed) {
                return route.fulfill({
                  status: response.status,
                  body: await response.text()
                });
              }
              break;
            }
            const data = (await response.json()) as any[];
            const updated = new Set<string>();
            data.forEach(item => {
              const itemID: string = type === 'sessions' ? item.id : item.name;
              if (runners.has(itemID)) {
                updated.add(itemID);
                runners.set(itemID, item);
              }
            });

            if (updated.size !== runners.size) {
              for (const [runnerID] of runners) {
                if (!updated.has(runnerID)) {
                  runners.delete(runnerID);
                }
              }
            }

            if (!page.isClosed() && !isClosed) {
              return route.fulfill({
                status: 200,
                body: JSON.stringify([...runners.values()]),
                contentType: 'application/json'
              });
            }
            break;
          }
        }
        case 'PATCH': {
          // Proxy the PATCH request
          const response = await fetch(request.url(), {
            body: request.postDataBuffer()!,
            headers: request.headers(),
            method: request.method()
          });
          if (!response.ok) {
            if (!page.isClosed() && !isClosed) {
              return route.fulfill({
                status: response.status,
                body: await response.text()
              });
            }
            break;
          }
          const data = await response.json();
          // Update stored runners
          runners.set(type === 'sessions' ? data.id : data.name, data);

          if (!page.isClosed() && !isClosed) {
            return route.fulfill({
              status: 200,
              body: JSON.stringify(data),
              contentType: 'application/json'
            });
          }
          break;
        }
        case 'POST': {
          // Proxy the POST request
          const response = await fetch(request.url(), {
            body: request.postDataBuffer()!,
            headers: request.headers(),
            method: request.method()
          });
          if (!response.ok) {
            if (!page.isClosed() && !isClosed) {
              return route.fulfill({
                status: response.status,
                body: await response.text()
              });
            }
            break;
          }
          const data = await response.json();
          const id = type === 'sessions' ? data.id : data.name;
          runners.set(id, data);
          if (!page.isClosed() && !isClosed) {
            return route.fulfill({
              status: 201,
              body: JSON.stringify(data),
              contentType: 'application/json',
              headers: response.headers as any
            });
          }
          break;
        }
        default:
          return route.continue();
      }
    });
  }

  /**
   * Mock workspace route.
   *
   * @param page Page model object
   * @param workspace In-memory workspace
   */
  export function mockState(
    page: Page,
    workspace: Workspace.IWorkspace
  ): Promise<void> {
    return page.route(galata.Routes.workspaces, (route, request) => {
      switch (request.method()) {
        case 'GET':
          return route.fulfill({
            status: 200,
            body: JSON.stringify(workspace)
          });
        case 'PUT': {
          const data = request.postDataJSON();
          workspace.data = { ...workspace.data, ...data.data };
          workspace.metadata = { ...workspace.metadata, ...data.metadata };
          return route.fulfill({ status: 204 });
        }
        default:
          return route.continue();
      }
    });
  }

  /**
   * Settings REST API endpoint
   */
  const settingsRegex = galata.Routes.settings;

  /**
   * Mock settings route.
   *
   * @param page Page model object
   * @param settings In-memory settings
   * @param mockedSettings Test mocked settings
   */
  export function mockSettings(
    page: Page,
    settings: ISettingRegistry.IPlugin[],
    mockedSettings: Record<string, any>
  ): Promise<void> {
    // Listen for closing connection (may happen when request are still being processed)
    let isClosed = false;
    const ctxt = page.context();
    ctxt.on('close', () => {
      isClosed = true;
    });
    ctxt.browser()?.on('disconnected', () => {
      isClosed = true;
    });

    return page.route(settingsRegex, async (route, request) => {
      switch (request.method()) {
        case 'GET': {
          // slice is used to remove the '/' prefix
          const id = settingsRegex.exec(request.url())?.groups?.id.slice(1);

          if (!id) {
            // Get all settings
            if (settings.length === 0) {
              const response = await fetch(request.url(), {
                headers: request.headers()
              });
              const loadedSettings = (await response.json())
                .settings as ISettingRegistry.IPlugin[];

              settings.push(
                ...loadedSettings.map(plugin => {
                  const mocked = mockedSettings[plugin.id] ?? {};
                  return {
                    ...plugin,
                    raw: JSON.stringify(mocked),
                    settings: mocked
                  };
                })
              );
            }
            if (!page.isClosed() && !isClosed) {
              return route.fulfill({
                status: 200,
                body: JSON.stringify({ settings })
              });
            }
            break;
          } else {
            // Get specific settings
            let pluginSettings = settings.find(setting => setting.id === id);
            if (!pluginSettings) {
              const response = await fetch(request.url(), {
                headers: request.headers()
              });
              pluginSettings = await response.json();
              if (pluginSettings) {
                const mocked = mockedSettings[id] ?? {};
                pluginSettings = {
                  ...pluginSettings,
                  raw: JSON.stringify(mocked),
                  settings: mocked
                };
                settings.push(pluginSettings);
              }
            }

            if (!page.isClosed() && !isClosed) {
              return route.fulfill({
                status: 200,
                body: JSON.stringify(pluginSettings)
              });
            }

            break;
          }
        }

        case 'PUT': {
          // slice is used to remove the '/' prefix
          const id = settingsRegex.exec(request.url())?.groups?.id?.slice(1);
          if (!id) {
            return route.abort('addressunreachable');
          }
          const pluginSettings = settings.find(setting => setting.id === id);
          const data = request.postDataJSON();

          if (pluginSettings) {
            pluginSettings.raw = data.raw;
            try {
              pluginSettings.settings = json5.parse(pluginSettings.raw);
            } catch (e) {
              console.warn(`Failed to read raw settings ${pluginSettings.raw}`);
              pluginSettings.settings = {};
            }
          } else {
            settings.push({
              id,
              ...data
            });
          }
          // Stop mocking if a new version is pushed
          delete mockedSettings[id];
          return route.fulfill({
            status: 204
          });
        }
        default:
          return route.continue();
      }
    });
  }
}
