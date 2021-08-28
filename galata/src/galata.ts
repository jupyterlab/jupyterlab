// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Browser, Page } from '@playwright/test';
import { ContentsHelper } from './contents';
import { IJupyterLabPageFixture, JupyterLabPage } from './jupyterlabpage';

/**
 * Galata namespace
 */
export namespace galata {
  /**
   * Default user settings:
   * - Deactivate codemirror cursor blinking to avoid noise in screenshots
   */
  export const DEFAULT_SETTINGS: Record<string, any> = {
    '@jupyterlab/fileeditor-extension:plugin': {
      editorConfig: { cursorBlinkRate: 0 }
    },
    '@jupyterlab/notebook-extension:tracker': {
      codeCellConfig: { cursorBlinkRate: 0 },
      markdownCellConfig: { cursorBlinkRate: 0 },
      rawCellConfig: { cursorBlinkRate: 0 }
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
   * Add the Galata helpers to the page model
   *
   * @param page Playwright page model
   * @param baseURL Application base URL
   * @param appPath Application URL path fragment
   * @returns Playwright page model with Galata helpers
   */
  export function addHelpersToPage(
    page: Page,
    baseURL: string,
    appPath: string
  ): IJupyterLabPageFixture {
    const jlabPage = new JupyterLabPage(page, baseURL, appPath);

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

  /**
   * Create a contents REST API helpers object
   *
   * @param baseURL Application base URL
   * @param page Playwright page model
   * @returns Contents REST API helpers
   */
  export function newContentsHelper(
    baseURL: string,
    page?: Page
  ): ContentsHelper {
    return new ContentsHelper(baseURL, page);
  }

  /**
   * Create a page with Galata helpers for the given browser
   *
   * @param browser Playwright browser model
   * @param baseURL Application base URL
   * @param appPath Application URL path fragment
   * @returns Playwright page model with Galata helpers
   */
  export async function newPage(
    browser: Browser,
    baseURL: string,
    appPath: string = '/lab'
  ): Promise<IJupyterLabPageFixture> {
    const context = await browser.newContext();
    const page = await context.newPage();

    return addHelpersToPage(page, baseURL, appPath);
  }

  /**
   * Regex to capture JupyterLab API call
   */
  export namespace Routes {
    /**
     * Sessions API
     *
     * The session id can be found in the named group `id`.
     *
     * The id will be suffixed by '/'.
     */
    export const sessions = /.*\/api\/sessions(?<id>\/[@:-\w]+)?/;

    /**
     * Settings API
     *
     * The schema name can be found in the named group `id`.
     *
     * The id will be suffixed by '/'.
     */
    export const settings = /.*\/api\/settings(?<id>(\/[@:-\w]+)*)/;

    /**
     * Terminals API
     *
     * The terminal id can be found in the named group `id`.
     *
     * The id will be suffixed by '/'.
     */
    export const terminals = /.*\/api\/terminals(?<id>\/[@:-\w]+)?/;

    /**
     * Translations API
     *
     * The locale can be found in the named group `id`.
     *
     * The id will be suffixed by '/'.
     */
    export const translations = /.*\/api\/translations(?<id>\/[@:-\w]+)?/;

    /**
     * Workspaces API
     *
     * The space name can be found in the named group `id`.
     *
     * The id will be suffixed by '/'.
     */
    export const workspaces = /.*\/api\/workspaces(?<id>(\/[-\w]+)+)/;
  }
}
