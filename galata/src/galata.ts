/* eslint-disable camelcase */
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import { Browser, Page } from '@playwright/test';
import { ContentsHelper } from './contents';
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
   * @param waitForApplication Callback that resolved when the application page is ready
   * @param appPath Application URL path fragment
   * @returns Playwright page model with Galata helpers
   */
  export async function newPage(
    browser: Browser,
    baseURL: string,
    waitForApplication: (page: Page, helpers: IJupyterLabPage) => Promise<void>,
    appPath: string = '/lab'
  ): Promise<IJupyterLabPageFixture> {
    const context = await browser.newContext();
    const page = await context.newPage();

    return addHelpersToPage(page, baseURL, waitForApplication, appPath);
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
          },
          orig_nbformat: 4
        },
        nbformat: 4,
        nbformat_minor: 4
      };
    }
  }
}
