/* eslint-disable @typescript-eslint/ban-ts-comment */
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { Kernel, Session, TerminalAPI, User } from '@jupyterlab/services';
import {
  test as base,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType
} from '@playwright/test';
import * as path from 'path';
import { ContentsHelper } from './contents';
import { galata } from './galata';
import { IJupyterLabPage, IJupyterLabPageFixture } from './jupyterlabpage';

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
   * Kernels created during the test.
   *
   * Possible values are:
   * - null: The kernels API won't be mocked
   * - Map<string, Kernel.IModel>: The kernels created during a test.
   *
   * By default the kernels created during a test will be tracked and disposed at the end.
   */
  kernels: Map<string, Kernel.IModel> | null;
  /**
   * Mock JupyterLab config in-memory or not.
   *
   * Possible values are:
   * - true (default): JupyterLab config will be mocked on a per test basis
   * - false: JupyterLab config won't be mocked (Be careful it will write config in local files)
   * - Record<string, JSONObject>: Initial JupyterLab data config - Mapping (config section, value).
   *
   * By default the config is stored in-memory.
   */
  mockConfig: boolean | Record<string, unknown>;
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
   * Mock JupyterLab user in-memory or not.
   *
   * Possible values are:
   * - true (default): JupyterLab user will be mocked on a per test basis
   * - false: JupyterLab user won't be mocked (It will be a random user so snapshots won't match)
   * - Record<string, unknown>: Initial JupyterLab user - Mapping (user attribute, value).
   *
   * By default the user is stored in-memory.
   */
  mockUser: boolean | Partial<User.IUser>;
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
  /**
   * Wait for the application page to be ready.
   *
   * @param page Playwright Page model
   * @param helpers JupyterLab helpers
   */
  waitForApplication: (page: Page, helpers: IJupyterLabPage) => Promise<void>;
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
  appPath: ['/lab', { option: true }],
  /**
   * Whether to go to JupyterLab page within the fixture or not.
   *
   * Default: true.
   *
   * Note: Setting it to false allows to register new route mock-ups for example.
   */
  autoGoto: [true, { option: true }],
  /**
   * Kernels created during the test.
   *
   * Possible values are:
   * - null: The kernels API won't be mocked
   * - Map<string, Kernel.IModel>: The kernels created during a test.
   *
   * By default the kernels created during a test will be tracked and disposed at the end.
   */
  kernels: async ({ request }, use) => {
    const kernels = new Map<string, Kernel.IModel>();

    await use(kernels);

    if (kernels.size > 0) {
      await galata.Mock.clearRunners(request, [...kernels.keys()], 'kernels');
    }
  },
  /**
   * Mock JupyterLab config in-memory or not.
   *
   * Possible values are:
   * - true (default): JupyterLab config will be mocked on a per test basis
   * - false: JupyterLab config won't be mocked (Be careful it will write config in local files)
   * - Record<string, JSONObject>: Initial JupyterLab data config - Mapping (config section, value).
   *
   * By default the config is stored in-memory.
   */
  mockConfig: [true, { option: true }],
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
  mockState: [true, { option: true }],
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
  mockSettings: [galata.DEFAULT_SETTINGS, { option: true }],
  /**
   * Mock JupyterLab user in-memory or not.
   *
   * Possible values are:
   * - true (default): JupyterLab user will be mocked on a per test basis
   * - false: JupyterLab user won't be mocked (It will be a random user so snapshots won't match)
   * - Record<string, unknown>: Initial JupyterLab user - Mapping (user attribute, value).
   *
   * By default the user is stored in-memory.
   */
  mockUser: [true, { option: true }],
  /**
   * Galata can keep the uploaded and created files in ``tmpPath`` on
   * the server root for debugging purpose. By default the files are
   * always deleted.
   *
   * - 'off' - ``tmpPath`` is deleted after each tests
   * - 'on' - ``tmpPath`` is never deleted
   * - 'only-on-failure' - ``tmpPath`` is deleted except if a test failed or timed out.
   */
  serverFiles: ['off', { option: true }],
  /**
   * Sessions created during the test.
   *
   * Possible values are:
   * - null: The sessions API won't be mocked
   * - Map<string, Session.IModel>: The sessions created during a test.
   *
   * By default the sessions created during a test will be tracked and disposed at the end.
   */
  sessions: async ({ request }, use) => {
    const sessions = new Map<string, Session.IModel>();

    await use(sessions);

    if (sessions.size > 0) {
      await galata.Mock.clearRunners(request, [...sessions.keys()], 'sessions');
    }
  },
  /**
   * Terminals created during the test.
   *
   * Possible values are:
   * - null: The Terminals API won't be mocked
   * - Map<string, TerminalAPI.IModel>: The Terminals created during a test.
   *
   * By default the Terminals created during a test will be tracked and disposed at the end.
   */
  terminals: async ({ request }, use) => {
    const terminals = new Map<string, TerminalAPI.IModel>();

    await use(terminals);

    if (terminals.size > 0) {
      await galata.Mock.clearRunners(
        request,
        [...terminals.keys()],
        'terminals'
      );
    }
  },
  /**
   * Unique test temporary path created on the server.
   *
   * Note: if you override this string, you will need to take care of creating the
   * folder and cleaning it.
   */
  tmpPath: async ({ request, serverFiles }, use, testInfo) => {
    // Remove appended retry part for reproducibility
    const testFolder = path
      .basename(testInfo.outputDir)
      .replace(/-retry\d+$/i, '');

    const contents = new ContentsHelper(request);

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
   * Wait for the application page to be ready
   *
   * @param page Playwright Page model
   * @param helpers JupyterLab helpers
   */
  waitForApplication: async ({ baseURL }, use) => {
    const waitIsReady = async (
      page: Page,
      helpers: IJupyterLabPage
    ): Promise<void> => {
      await page.locator('#jupyterlab-splash').waitFor({ state: 'detached' });
      await helpers.waitForCondition(() => {
        return helpers.activity.isTabActive('Launcher');
      });
      // Oddly current tab is not always set to active
      if (!(await helpers.isInSimpleMode())) {
        await helpers.activity.activateTab('Launcher');
      }
    };
    await use(waitIsReady);
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
      kernels,
      mockConfig,
      mockSettings,
      mockState,
      mockUser,
      page,
      sessions,
      terminals,
      tmpPath,
      waitForApplication
    },
    use
  ) => {
    await use(
      await galata.initTestPage(
        appPath,
        autoGoto,
        baseURL!,
        mockConfig,
        mockSettings,
        mockState,
        mockUser,
        page,
        sessions,
        terminals,
        tmpPath,
        waitForApplication,
        kernels
      )
    );
  }
});
