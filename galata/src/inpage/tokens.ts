// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { IRouter } from '@jupyterlab/application';
import type { IDocumentManager } from '@jupyterlab/docmanager';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Cell execution callbacks interface
 */
export interface INotebookRunCallback {
  /**
   * Callback before scrolling to the cell
   */
  onBeforeScroll?: () => Promise<void>;
  /**
   * Callback after scrolling to the cell
   */
  onAfterScroll?: () => Promise<void>;
  /**
   * Callback after cell execution
   */
  onAfterCellRun?: (cellIndex: number) => Promise<void>;
}

/**
 * waitForSelector options
 */
export interface IWaitForSelectorOptions {
  /**
   * Test for the element to be hidden.
   */
  hidden?: boolean;
}

export const PLUGIN_ID_ROUTER = '@jupyterlab/application-extension:router';
export const PLUGIN_ID_DOC_MANAGER = '@jupyterlab/docmanager-extension:manager';
export const PLUGIN_ID_SETTINGS = '@jupyterlab/apputils-extension:settings';

export interface IPluginNameToInterfaceMap {
  [PLUGIN_ID_ROUTER]: IRouter;
  [PLUGIN_ID_DOC_MANAGER]: IDocumentManager;
  [PLUGIN_ID_SETTINGS]: ISettingRegistry;
}

/**
 * Galata In-Page interface
 */
export interface IGalataInpage {
  /**
   * Delete all cells of the active notebook
   */
  deleteNotebookCells(): Promise<void>;

  /**
   * Get the index of a toolbar item
   *
   * @param itemName Item name
   * @returns Index
   */
  getNotebookToolbarItemIndex(itemName: string): number;

  /**
   * Get an application plugin
   *
   * @param pluginId Plugin ID
   * @returns Application plugin
   */
  getPlugin<K extends keyof IPluginNameToInterfaceMap>(
    pluginId: K
  ): Promise<IPluginNameToInterfaceMap[K] | undefined>;

  /**
   * Test if one or all cells have an execution number.
   *
   * @param cellIndex Cell index
   * @returns Whether the cell was executed or not
   *
   * ### Notes
   * It checks that no cells have a `null` execution count.
   */
  haveBeenExecuted(cellIndex?: number): boolean;

  /**
   * Test if a cell is selected in the active notebook
   *
   * @param cellIndex Cell index
   * @returns Whether the cell is selected or not
   */
  isNotebookCellSelected(cellIndex: number): boolean;

  /**
   * Test if a element is visible or not
   *
   * @param el Element
   * @returns Test result
   */
  isElementVisible(el: HTMLElement): boolean;

  /**
   * Save the active notebook
   */
  saveActiveNotebook(): Promise<void>;

  /**
   * Set the application theme
   *
   * @param themeName Theme name
   */
  setTheme(themeName: string): Promise<void>;

  /**
   * Reset execution count of one or all cells.
   *
   * @param cellIndex Cell index
   */
  resetExecutionCount(cellIndex?: number): void;

  /**
   * Run the active notebook cell by cell
   * and execute the callback after each cell execution
   *
   * @param callback Callback
   */
  runActiveNotebookCellByCell(callback?: INotebookRunCallback): Promise<void>;

  /**
   * Wait for the route to be on path and close all documents
   *
   * @param path Path to monitor
   */
  waitForLaunch(path?: string): Promise<void>;

  /**
   * Wait for an element to be found from a CSS selector
   *
   * @param selector CSS selector
   * @param node Element
   * @param options Options
   * @returns Selected element
   */
  waitForSelector(
    selector: string,
    node?: Element,
    options?: IWaitForSelectorOptions
  ): Promise<Node | null>;

  /**
   * Waits for the given `timeout` in milliseconds.
   *
   * @param timeout A timeout to wait for
   */
  waitForTimeout(duration: number): Promise<void>;

  /**
   * Wait for an element to be found from a XPath
   *
   * @param selector CSS selector
   * @param node Element
   * @param options Options
   * @returns Selected element
   */
  waitForXPath(
    selector: string,
    node?: Element,
    options?: IWaitForSelectorOptions
  ): Promise<Node | null>;

  /**
   * Application object
   */
  readonly app: JupyterFrontEnd;
}
