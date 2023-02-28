/* eslint-disable camelcase */
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type * as nbformat from '@jupyterlab/nbformat';
import type {
  Session,
  TerminalAPI,
  User,
  Workspace
} from '@jupyterlab/services';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { JSONObject } from '@lumino/coreutils';
import { UUID } from '@lumino/coreutils';
import type { APIRequestContext, Browser, Page } from '@playwright/test';
import * as json5 from 'json5';
import { ContentsHelper } from './contents';
import { PerformanceHelper } from './helpers';
import {
  IJupyterLabPage,
  IJupyterLabPageFixture,
  JupyterLabPage
} from './jupyterlabpage';

/**
 * Galata namespace
 */
export namespace galata {
  /**
   * Default user settings:
   * - Deactivate codemirror cursor blinking to avoid noise in screenshots
   */
  export const DEFAULT_SETTINGS: Record<string, any> = {
    '@jupyterlab/apputils-extension:notification': {
      fetchNews: 'false'
    },
    '@jupyterlab/fileeditor-extension:plugin': {},
    '@jupyterlab/notebook-extension:tracker': {}
  };

  export const DEFAULT_DOCUMENTATION_STATE: Record<string, any> = {
    data: {
      'layout-restorer:data': {
        relativeSizes: [0, 1, 0]
      }
    }
  };

  /**
   * Sidebar position
   */
  export type SidebarPosition = 'left' | 'right';

  /**
   * Default sidebar ids
   */
  export type DefaultSidebarTabId =
    | 'filebrowser'
    | 'jp-running-sessions'
    | 'tab-manager'
    | 'jp-property-inspector'
    | 'table-of-contents'
    | 'extensionmanager.main-view'
    | 'jp-debugger-sidebar';

  /**
   * Sidebar id type
   */
  export type SidebarTabId = DefaultSidebarTabId | string;

  /**
   * Default toolbar item ids
   */
  export type DefaultNotebookToolbarItemId =
    | 'save'
    | 'insert'
    | 'cut'
    | 'copy'
    | 'paste'
    | 'run'
    | 'interrupt'
    | 'restart'
    | 'restart-and-run'
    | 'cellType'
    | 'kernelName'
    | 'kernelStatus';

  /**
   * Notebook toolbar item type
   */
  export type NotebookToolbarItemId = DefaultNotebookToolbarItemId | string;

  /**
   * Options to create a new page
   */
  export interface INewPageOption {
    /**
     * Application base URL
     */
    baseURL: string;
    /**
     * Playwright browser model
     */
    browser: Browser;
    /**
     * Callback that resolved when the application page is ready
     */
    waitForApplication: (page: Page, helpers: IJupyterLabPage) => Promise<void>;
    /**
     * Application URL path fragment
     *
     * Default: /lab
     */
    appPath?: string;
    /**
     * Whether to go to JupyterLab page within the fixture or not.
     *
     * Default: true
     */
    autoGoto?: boolean;
    /**
     * Mock Jupyter Server configuration in-memory or not.
     *
     * Default true
     */
    mockConfig?: boolean | Record<string, unknown>;
    /**
     * Mock JupyterLab state in-memory or not.
     *
     * Default galata.DEFAULT_SETTINGS
     */
    mockSettings?: boolean | Record<string, unknown>;
    /**
     * Mock JupyterLab settings in-memory or not.
     *
     * Default true
     */
    mockState?: boolean | Record<string, unknown>;
    /**
     * Mock JupyterLab user in-memory or not.
     *
     * Default true
     */
    mockUser?: boolean | Partial<User.IUser>;
    /**
     * Whether to store sessions in memory or not.
     *
     * Default true
     */
    mockSessions?: boolean;
    /**
     * Whether to store terminals in memory or not.
     *
     * Default true
     */
    mockTerminals?: boolean;
    /**
     * Create and delete a temporary path during the page existence
     *
     * Default ''
     */
    tmpPath?: string;
  }

  /**
   * Add the Galata helpers to the page model
   *
   * @param page Playwright page model
   * @param baseURL Application base URL
   * @param waitForApplication Callback that resolved when the application page is ready
   * @param appPath Application URL path fragment
   * @returns Playwright page model with Galata helpers
   */
  export function addHelpersToPage(
    page: Page,
    baseURL: string,
    waitForApplication: (page: Page, helpers: IJupyterLabPage) => Promise<void>,
    appPath?: string
  ): IJupyterLabPageFixture {
    const jlabPage = new JupyterLabPage(
      page,
      baseURL,
      waitForApplication,
      appPath
    );

    const handler = {
      get: function (obj: JupyterLabPage, prop: string) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return prop in obj ? obj[prop] : page[prop];
      }
    };

    // Proxy playwright page object
    return new Proxy(jlabPage, handler) as any;
  }

  export async function initTestPage(
    appPath: string,
    autoGoto: boolean,
    baseURL: string,
    mockConfig: boolean | Record<string, unknown>,
    mockSettings: boolean | Record<string, unknown>,
    mockState: boolean | Record<string, unknown>,
    mockUser: boolean | Partial<User.IUser>,
    page: Page,
    sessions: Map<string, Session.IModel> | null,
    terminals: Map<string, TerminalAPI.IModel> | null,
    tmpPath: string,
    waitForApplication: (page: Page, helpers: IJupyterLabPage) => Promise<void>
  ): Promise<IJupyterLabPageFixture> {
    // Hook the helpers
    const jlabWithPage = addHelpersToPage(
      page,
      baseURL,
      waitForApplication,
      appPath
    );

    // Add server mocks
    if (mockConfig) {
      const config: Record<string, JSONObject> =
        typeof mockConfig !== 'boolean' ? ({ ...mockConfig } as any) : {};
      await Mock.mockConfig(page, config);
    }

    const settings: ISettingRegistry.IPlugin[] = [];
    if (mockSettings) {
      // Settings will be stored in-memory (after loading the initial version from disk)
      await Mock.mockSettings(
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
      await Mock.mockState(page, workspace);
    }

    let user: User.IUser = {
      identity: {
        username: UUID.uuid4(),
        name: 'jovyan',
        display_name: 'jovyan',
        initials: 'JP',
        color: 'var(--jp-collaborator-color1)'
      },
      permissions: {}
    };
    if (mockUser) {
      if (typeof mockUser !== 'boolean') {
        user = { ...mockUser } as any;
      }
      // The user will be stored in-memory
      await Mock.mockUser(page, user);
    }

    // Add sessions and terminals trackers
    if (sessions) {
      await Mock.mockRunners(page, sessions, 'sessions');
    }
    if (terminals) {
      await Mock.mockRunners(page, terminals, 'terminals');
    }

    if (autoGoto) {
      // Load and initialize JupyterLab and goto test folder
      await jlabWithPage.goto(`tree/${tmpPath}`);
    }

    return jlabWithPage;
  }

  /**
   * Create a contents REST API helpers object
   *
   * @param request Playwright API request context
   * @param page Playwright page model
   * @returns Contents REST API helpers
   */
  export function newContentsHelper(
    request?: APIRequestContext,
    page?: Page
  ): ContentsHelper {
    return new ContentsHelper(request, page);
  }

  /**
   * Create a page with Galata helpers for the given browser in a new context.
   *
   * @returns Playwright page model with Galata helpers
   */
  export async function newPage(options: INewPageOption): Promise<{
    page: IJupyterLabPageFixture;
    sessions: Map<string, Session.IModel> | null;
    terminals: Map<string, TerminalAPI.IModel> | null;
  }> {
    const {
      appPath,
      autoGoto,
      baseURL,
      browser,
      waitForApplication,
      mockConfig,
      mockSessions,
      mockSettings,
      mockState,
      mockTerminals,
      mockUser,
      tmpPath
    } = {
      appPath: '/lab',
      autoGoto: true,
      mockConfig: true,
      mockSessions: true,
      mockSettings: galata.DEFAULT_SETTINGS,
      mockState: true,
      mockTerminals: true,
      mockUser: true,
      tmpPath: '',
      ...options
    };
    const context = await browser.newContext();
    const page = await context.newPage();

    const sessions = mockSessions ? new Map<string, Session.IModel>() : null;
    const terminals = mockTerminals
      ? new Map<string, TerminalAPI.IModel>()
      : null;

    return {
      page: await initTestPage(
        appPath,
        autoGoto,
        baseURL,
        mockConfig,
        mockSettings,
        mockState,
        mockUser,
        page,
        sessions,
        terminals,
        tmpPath,
        waitForApplication
      ),
      sessions,
      terminals
    };
  }

  /**
   * Create a new performance helper
   *
   * @param page Playwright page model
   * @returns Performance helper
   */
  export function newPerformanceHelper(page: Page): PerformanceHelper {
    return new PerformanceHelper(page);
  }

  /**
   * Regex to capture JupyterLab API call
   */
  export namespace Routes {
    /**
     * Config API
     *
     * The config section can be found in the named group `section`.
     */
    export const config = /.*\/api\/config\/(?<section>\w+)/;

    /**
     * Contents API
     *
     * The content path can be found in the named group `path`.
     *
     * The path will be prefixed by '/'.
     * The path will be undefined for the root folder.
     */
    export const contents = /.*\/api\/contents(?<path>\/.+)?\?/;

    /**
     * Extensions API
     */
    export const extensions = /.*\/lab\/api\/extensions.*/;

    /**
     * Sessions API
     *
     * The session id can be found in the named group `id`.
     *
     * The id will be prefixed by '/'.
     */
    export const sessions = /.*\/api\/sessions(?<id>\/[@:-\w]+)?/;

    /**
     * Settings API
     *
     * The schema name can be found in the named group `id`.
     *
     * The id will be prefixed by '/'.
     */
    export const settings = /.*\/api\/settings(?<id>(\/[@:-\w]+)*)/;

    /**
     * Terminals API
     *
     * The terminal id can be found in the named group `id`.
     *
     * The id will be prefixed by '/'.
     */
    export const terminals = /.*\/api\/terminals(?<id>\/[@:-\w]+)?/;

    /**
     * Translations API
     *
     * The locale can be found in the named group `id`.
     *
     * The id will be prefixed by '/'.
     */
    export const translations = /.*\/api\/translations(?<id>\/[@:-\w]+)?/;

    /**
     * Workspaces API
     *
     * The space name can be found in the named group `id`.
     *
     * The id will be prefixed by '/'.
     */
    export const workspaces = /.*\/api\/workspaces(?<id>(\/[-\w]+)+)/;

    /**
     * User API
     */
    export const user = /.*\/api\/me.*/;
  }

  /**
   * Notebook generation helpers
   */
  export namespace Notebook {
    /**
     * Generate a notebook with identical cells
     *
     * @param nCells Number of cells
     * @param cellType Type of cells
     * @param defaultInput Default input source
     * @param defaultOutput Default outputs
     * @returns The notebook
     */
    export function generateNotebook(
      nCells: number = 0,
      cellType: nbformat.CellType = 'code',
      defaultInput: string[] = [],
      defaultOutput: nbformat.IOutput[] = []
    ): nbformat.INotebookContent {
      const cells = new Array<nbformat.ICell>();
      for (let i = 0; i < nCells; i++) {
        const execution_count =
          cellType === 'code'
            ? defaultOutput.length > 0
              ? i + 1
              : null
            : undefined;
        const cell = makeCell({
          cell_type: cellType,
          source: [...defaultInput],
          outputs: cellType === 'code' ? [...defaultOutput] : undefined,
          execution_count
        });
        cells.push(cell);
      }

      return makeNotebook(cells);
    }

    /**
     * Generate a cell object
     *
     * @param skeleton Cell description template
     * @returns A cell
     */
    export function makeCell(
      skeleton: Partial<nbformat.ICell>
    ): nbformat.ICell {
      switch (skeleton.cell_type ?? 'code') {
        case 'code':
          return {
            cell_type: 'code',
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [],
            ...skeleton
          };
        default: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { execution_count, outputs, ...others } = skeleton;
          return {
            cell_type: 'markdown',
            metadata: {},
            source: [],
            ...others
          };
        }
      }
    }

    /**
     * Generate a notebook object from a cell list
     *
     * @param cells Notebook cells
     * @returns Notebook
     */
    export function makeNotebook(
      cells: Array<nbformat.ICell>
    ): nbformat.INotebookContent {
      return {
        cells,
        metadata: {
          kernelspec: {
            display_name: 'Python 3',
            language: 'python',
            name: 'python3'
          },
          language_info: {
            codemirror_mode: {
              name: 'ipython',
              version: 3
            },
            file_extension: '.py',
            mimetype: 'text/x-python',
            name: 'python',
            nbconvert_exporter: 'python',
            pygments_lexer: 'ipython3',
            version: '3.8.0'
          }
        },
        nbformat: 4,
        nbformat_minor: 4
      };
    }
  }

  /**
   * Mock methods
   */
  export namespace Mock {
    /**
     * Set last modified attributes one day ago one listing
     * directory content.
     *
     * @param page Page model object
     *
     * #### Notes
     * The goal is to freeze the file browser display
     */
    export async function freezeContentLastModified(page: Page): Promise<void> {
      // Listen for closing connection (may happen when request are still being processed)
      let isClosed = false;
      const ctxt = page.context();
      ctxt.once('close', () => {
        isClosed = true;
      });
      ctxt.browser()?.once('disconnected', () => {
        isClosed = true;
      });

      return page.route(Routes.contents, async (route, request) => {
        switch (request.method()) {
          case 'GET': {
            // Proxy the GET request
            const response = await ctxt.request.fetch(request);
            if (!response.ok()) {
              if (!page.isClosed() && !isClosed) {
                return route.fulfill({
                  status: response.status(),
                  body: await response.text()
                });
              }
              break;
            }
            const data = await response.json();
            // Modify the last_modified values to be set one day before now.
            if (
              data['type'] === 'directory' &&
              Array.isArray(data['content'])
            ) {
              const now = Date.now();
              const aDayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
              for (const entry of data['content'] as any[]) {
                // Mutate the list in-place
                entry['last_modified'] = aDayAgo;
              }
            }

            if (!page.isClosed() && !isClosed) {
              return route.fulfill({
                status: 200,
                body: JSON.stringify(data),
                contentType: 'application/json'
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
     * Clear all wanted sessions or terminals.
     *
     * @param baseURL Application base URL
     * @param runners Session or terminal ids to stop
     * @param type Type of runner; session or terminal
     * @param request API request context
     * @returns Whether the runners were closed or not
     */
    export async function clearRunners(
      request: APIRequestContext,
      runners: string[],
      type: 'sessions' | 'terminals'
    ): Promise<boolean> {
      const responses = await Promise.all(
        [...new Set(runners)].map(id =>
          request.fetch(`/api/${type}/${id}`, {
            method: 'DELETE'
          })
        )
      );
      return responses.every(response => response.ok());
    }

    /**
     * Mock config route.
     *
     * @param page Page model object
     * @param config In-memory config
     */
    export function mockConfig(
      page: Page,
      config: Record<string, JSONObject>
    ): Promise<void> {
      return page.route(Routes.config, (route, request) => {
        const section = Routes.config.exec(request.url())?.groups
          ?.section as string;
        switch (request.method()) {
          case 'GET':
            return route.fulfill({
              status: 200,
              body: JSON.stringify(config[section] ?? {})
            });
          case 'PATCH': {
            const data = request.postDataJSON();
            // FIXME jupyter-server does a recursive update
            // We are not doing it here as @jupyterlab/services is actually not recursively
            // updating the object.
            config[section] = { ...(config[section] ?? {}), ...data };
            return route.fulfill({
              status: 200,
              body: JSON.stringify(config[section])
            });
          }
          case 'PUT': {
            const data = request.postDataJSON();
            config[section] = data;
            return route.fulfill({ status: 204 });
          }
          default:
            return route.continue();
        }
      });
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
        type === 'sessions' ? Routes.sessions : Routes.terminals;
      // Listen for closing connection (may happen when request are still being processed)
      let isClosed = false;
      const ctxt = page.context();
      ctxt.once('close', () => {
        isClosed = true;
      });
      ctxt.browser()?.once('disconnected', () => {
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
                const response = await ctxt.request.fetch(request);
                if (!response.ok()) {
                  if (!page.isClosed() && !isClosed) {
                    return route.fulfill({
                      status: response.status(),
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
              const response = await ctxt.request.fetch(request);
              if (!response.ok()) {
                if (!page.isClosed() && !isClosed) {
                  return route.fulfill({
                    status: response.status(),
                    body: await response.text()
                  });
                }
                break;
              }
              const data = (await response.json()) as any[];
              const updated = new Set<string>();
              data.forEach(item => {
                const itemID: string =
                  type === 'sessions' ? item.id : item.name;
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
            const response = await ctxt.request.fetch(request);
            if (!response.ok()) {
              if (!page.isClosed() && !isClosed) {
                return route.fulfill({
                  status: response.status(),
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
            const response = await ctxt.request.fetch(request);
            if (!response.ok()) {
              if (!page.isClosed() && !isClosed) {
                return route.fulfill({
                  status: response.status(),
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
                status: type === 'sessions' ? 201 : 200,
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
      return page.route(Routes.workspaces, (route, request) => {
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
    const settingsRegex = Routes.settings;

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
      ctxt.once('close', () => {
        isClosed = true;
      });
      ctxt.browser()?.once('disconnected', () => {
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
                const response = await ctxt.request.fetch(request);
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
                const response = await ctxt.request.fetch(request);
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
                console.warn(
                  `Failed to read raw settings ${pluginSettings.raw}`
                );
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

    /**
     * Mock user route.
     *
     * @param page Page model object
     * @param user In-memory user
     */
    export function mockUser(page: Page, user: User.IUser): Promise<void> {
      return page.route(Routes.user, (route, request) => {
        switch (request.method()) {
          case 'GET':
            return route.fulfill({
              status: 200,
              body: JSON.stringify(user)
            });
          default:
            return route.continue();
        }
      });
    }
  }
}
