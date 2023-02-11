// Copyright (c) Jupyter Development Team.
// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { IRouter } from '@jupyterlab/application';
import type {
  Dialog,
  Notification,
  NotificationManager,
  WidgetTracker
} from '@jupyterlab/apputils';
import type { IDocumentManager } from '@jupyterlab/docmanager';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Token } from '@lumino/coreutils';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    /**
     * Access Jupyter Application object
     */
    jupyterapp: JupyterFrontEnd;
    /**
     * Access to Galata In-Page helpers
     *
     * Those helpers are injected through a JupyterLab extension
     */
    galata: IGalataInpage;
    /**
     * Access to Galata In-Page helpers
     *
     * @deprecated since v4
     * Those helpers are injected through a JupyterLab extension
     */
    galataip: IGalataInpage;
  }
}

/**
 * Galata in-page extension helpers.
 */
export const PLUGIN_ID_GALATA_HELPERS = '@jupyterlab/galata-extension:helpers';

/**
 * Static objects exposed.
 */
export interface IGalataHelpers {
  /**
   * JupyterLab dialogs tracker.
   */
  readonly dialogs: WidgetTracker<Dialog<any>>;
  /**
   * JupyterLab notifications manager.
   */
  readonly notifications: NotificationManager;
}

/**
 * Test token exposing some static JupyterLab objects.
 */
export const IGalataHelpers = new Token<IGalataHelpers>(
  '@jupyterlab/galata-extension:IGalataHelpers'
);

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

export interface IPluginNameToInterfaceMap {
  [PLUGIN_ID_GALATA_HELPERS]: IGalataHelpers;
  '@jupyterlab/application-extension:router': IRouter;
  '@jupyterlab/docmanager-extension:manager': IDocumentManager;
  '@jupyterlab/apputils-extension:settings': ISettingRegistry;
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
   * Get the Jupyter notifications.
   *
   * @returns Jupyter Notifications
   */
  getNotifications(): Promise<Notification.INotification[]>;

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
   * Disconnect a listener to new Jupyter dialog events.
   *
   * @param event Event type
   * @param listener Event listener
   */
  off(event: 'dialog', listener: (dialog: Dialog<any> | null) => void): void;
  /**
   * Disconnect a listener to new or updated Jupyter notification events.
   *
   * @param event Event type
   * @param listener Event listener
   */
  off(
    event: 'notification',
    listener: (notification: Notification.INotification) => void
  ): void;

  /**
   * Connect a listener to new Jupyter dialog events.
   *
   * @param event Event type
   * @param listener Event listener
   */
  on(event: 'dialog', listener: (dialog: Dialog<any> | null) => void): void;

  /**
   * Connect a listener to new or updated Jupyter notification events.
   *
   * @param event Event type
   * @param listener Event listener
   */
  on(
    event: 'notification',
    listener: (notification: Notification.INotification) => void
  ): void;

  /**
   * Connect a listener to the next new Jupyter dialog event.
   *
   * @param event Event type
   * @param listener Event listener
   */
  once(event: 'dialog', listener: (dialog: Dialog<any> | null) => void): void;

  /**
   * Connect a listener to the next new or updated Jupyter notification event.
   *
   * @param event Event type
   * @param listener Event listener
   */
  once(
    event: 'notification',
    listener: (notification: Notification.INotification) => void
  ): void;

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
