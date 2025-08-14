/* eslint-disable @typescript-eslint/ban-types */
/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 * Copyright (c) Bloomberg Finance LP.
 */

import type { IRouter, JupyterFrontEnd } from '@jupyterlab/application';
import type {
  Dialog,
  IWidgetTracker,
  Notification,
  NotificationManager
} from '@jupyterlab/apputils';
import type { Cell, CodeCellModel, MarkdownCell } from '@jupyterlab/cells';
import type * as nbformat from '@jupyterlab/nbformat';
import type { NotebookPanel } from '@jupyterlab/notebook';
import { findIndex } from '@lumino/algorithm';
import { Signal } from '@lumino/signaling';
import {
  IGalataInpage,
  INotebookRunCallback,
  IPluginNameToInterfaceMap,
  IWaitForSelectorOptions,
  PLUGIN_ID_GALATA_HELPERS
} from './tokens';

const PLUGIN_ID_DOC_MANAGER = '@jupyterlab/docmanager-extension:manager';
const PLUGIN_ID_ROUTER = '@jupyterlab/application-extension:router';

/**
 * In-Page Galata helpers
 */
export class GalataInpage implements IGalataInpage {
  /**
   * Get an application plugin
   *
   * @param pluginId Plugin ID
   * @returns Application plugin
   */
  async getPlugin<K extends keyof IPluginNameToInterfaceMap>(
    pluginId: K
  ): Promise<IPluginNameToInterfaceMap[K] | undefined> {
    return new Promise((resolve, reject) => {
      const app = this._app;
      const hasPlugin = app.hasPlugin(pluginId);

      if (hasPlugin) {
        try {
          const appAny = app as any;
          const plugin: any = appAny.pluginRegistry._plugins
            ? appAny.pluginRegistry._plugins.get(pluginId)
            : undefined;
          if (plugin.activated) {
            resolve(plugin.service);
          } else {
            void app.activatePlugin(pluginId).then(response => {
              resolve(plugin.service);
            });
          }
        } catch (error) {
          console.error('Failed to get plugin', error);
        }
      }
    });
  }

  /**
   * Get the Jupyter notifications
   *
   * @returns Jupyter Notifications
   */
  async getNotifications(): Promise<Notification.INotification[]> {
    const plugin = await this.getPlugin(PLUGIN_ID_GALATA_HELPERS);
    return plugin?.notifications.notifications ?? [];
  }

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
  off(event: 'dialog' | 'notification', listener: (arg: any) => void): void {
    const callback = this.listeners.get(listener);
    if (callback) {
      this.getPlugin(PLUGIN_ID_GALATA_HELPERS)
        .then(plugin => {
          if (!plugin) {
            return;
          }
          switch (event) {
            case 'dialog':
              plugin.dialogs.currentChanged.disconnect(callback);
              break;
            case 'notification':
              plugin.notifications.changed.disconnect(callback);
              break;
          }
          this.listeners.delete(listener);
        })
        .catch(reason => {
          console.log(
            `Failed to disconnect listener for '${event}' event.`,
            reason
          );
        });
    }
  }

  /**
   * Connect a listener to new Jupyter dialog events.
   *
   * @param event Event type
   * @param listener Event listener
   */
  on(event: 'dialog', listener: (dialog: Dialog<any> | null) => void): void;
  on(
    event: 'notification',
    listener: (notification: Notification.INotification) => void
  ): void;
  /**
   * Connect a listener to new or updated Jupyter notification events.
   *
   * @param event Event type
   * @param listener Event listener
   */
  on(event: 'dialog' | 'notification', listener: (arg: any) => void): void {
    this.getPlugin(PLUGIN_ID_GALATA_HELPERS)
      .then(plugin => {
        switch (event) {
          case 'dialog':
            {
              const callback = (
                tracker: IWidgetTracker<Dialog<any>>,
                dialog: Dialog<any> | null
              ) => {
                listener(dialog);
              };
              this.listeners.set(listener, callback);
              plugin?.dialogs.currentChanged.connect(callback);
            }
            break;
          case 'notification':
            {
              const callback = (
                manager: NotificationManager,
                notification: Notification.IChange
              ) => {
                if (notification.type !== 'removed') {
                  listener(notification.notification);
                }
              };
              this.listeners.set(listener, callback);
              plugin?.notifications.changed.connect(callback);
            }
            break;
        }
      })
      .catch(reason => {
        console.error(
          `Failed to add listener to JupyterLab dialog event:\n${reason}`
        );
      });
  }

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
  once(event: 'dialog' | 'notification', listener: (arg: any) => void): void {
    const onceListener = (arg: any) => {
      try {
        listener(arg);
      } finally {
        this.off(event as any, onceListener);
      }
    };
    this.on(event as any, onceListener);
  }

  /**
   * Wait for a function to finish for max. timeout milliseconds
   *
   * @param fn Function
   * @param timeout Timeout
   */
  async waitForFunction(fn: Function, timeout?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let checkTimer: number | null = null;
      let timeoutTimer: number | null = null;
      const check = async () => {
        checkTimer = null;
        if (await Promise.resolve(fn())) {
          if (timeoutTimer) {
            clearTimeout(timeoutTimer);
          }
          resolve();
        } else {
          checkTimer = window.setTimeout(check, 200);
        }
      };

      void check();

      if (timeout) {
        timeoutTimer = window.setTimeout(() => {
          timeoutTimer = null;
          if (checkTimer) {
            clearTimeout(checkTimer);
          }
          reject(new Error('Timed out waiting for condition to be fulfilled.'));
        }, timeout);
      }
    });
  }

  /**
   * Waits for the given `timeout` in milliseconds.
   *
   * @param timeout A timeout to wait for
   */
  async waitForTimeout(timeout: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }

  /**
   * Wait for a condition to fulfill or for a certain time
   *
   * @param condition Condition or timeout to wait for
   * @param timeout Timeout
   */
  async waitFor(condition: Function | number, timeout?: number): Promise<void> {
    const conditionType = typeof condition;

    if (conditionType === 'function') {
      return this.waitForFunction(condition as Function, timeout);
    } else if (conditionType === 'number') {
      return this.waitForTimeout(condition as number);
    }
  }

  /**
   * Wait for the route to be on path and close all documents
   *
   * @param path Path to monitor
   */
  async waitForLaunch(path = '/lab'): Promise<void> {
    let resolver: () => void;
    const delegate = new Promise<void>(resolve => {
      resolver = resolve;
    });
    const router = await this.getPlugin(PLUGIN_ID_ROUTER);
    const docManager = await this.getPlugin(PLUGIN_ID_DOC_MANAGER);

    const listener = async (sender: IRouter, args: IRouter.ILocation) => {
      if (args.path === path) {
        router?.routed.disconnect(listener);
        await docManager?.closeAll();
        resolver();
      }
    };

    router?.routed.connect(listener);
    return delegate;
  }

  /**
   * Wait for an element to be found from a CSS selector
   *
   * @param selector CSS selector
   * @param node Element
   * @param options Options
   * @returns Selected element
   */
  async waitForSelector(
    selector: string,
    node?: Element,
    options?: IWaitForSelectorOptions
  ): Promise<Node | null> {
    const waitForHidden = options && options.hidden;

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        const parent = node || document;
        const found = parent.querySelector(selector);
        if (waitForHidden) {
          if (!found) {
            clearInterval(timer);
            resolve(null);
          }
        } else if (found) {
          clearInterval(timer);
          resolve(found);
        }
      }, 200);
    });
  }

  /**
   * Wait for an element to be found from a XPath
   *
   * @param selector CSS selector
   * @param node Element
   * @param options Options
   * @returns Selected element
   */
  async waitForXPath(
    selector: string,
    node?: Element,
    options?: IWaitForSelectorOptions
  ): Promise<Node | null> {
    const waitForHidden = options && options.hidden;

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        const parent = node || document;
        const iterator = document.evaluate(
          selector,
          parent,
          null,
          XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
          null
        );
        const found = iterator && iterator.iterateNext();
        if (waitForHidden) {
          if (!found) {
            clearInterval(timer);
            resolve(null);
          }
        } else if (found) {
          clearInterval(timer);
          resolve(found);
        }
      }, 200);
    });
  }

  /**
   * Delete all cells of the active notebook
   */
  async deleteNotebookCells(): Promise<void> {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    const nb = nbPanel.content;

    void this._app.commands.execute('notebook:delete-cell');

    nb.update();
  }
  /**
   * Add a cell to the active notebook
   *
   * @param cellType Cell type
   * @param source Cell input source
   * @returns Action success result
   */
  addNotebookCell(cellType: nbformat.CellType, source: string): boolean {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    const nb = nbPanel.content;

    if (nb !== null) {
      void this._app.commands.execute('notebook:insert-cell-below');

      if (nb.model) {
        const sharedModel = nb.model.sharedModel;
        sharedModel.insertCell(sharedModel.cells.length, {
          cell_type: cellType,
          source
        });
      }
      nb.update();
    } else {
      return false;
    }

    return true;
  }

  /**
   * Reset execution count of one or all cells.
   *
   * @param cellIndex Cell index
   */
  resetExecutionCount(cellIndex?: number): void {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    const nb = nbPanel.content;

    if (nb) {
      if (nb.model) {
        if (cellIndex === undefined) {
          for (const cell of nb.model.cells) {
            switch (cell.type) {
              case 'code':
                (cell as CodeCellModel).executionCount = null;
                break;
            }
          }
        } else if (nb.model.cells.get(cellIndex)?.type === 'code') {
          (nb.model.cells.get(cellIndex) as CodeCellModel).executionCount =
            null;
        }
      }
    }
  }

  /**
   * Set the type and content of a cell in the active notebook
   *
   * @param cellIndex Cell index
   * @param cellType Cell type
   * @param source Cell input source
   * @returns Action success status
   */
  setNotebookCell(
    cellIndex: number,
    cellType: nbformat.CellType,
    source: string
  ): boolean {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    const nb = nbPanel.content;

    if (nb) {
      const numCells = nb.widgets.length;
      if (cellIndex < 0 || cellIndex >= numCells) {
        return false;
      }

      if (nb.model) {
        const sharedModel = nb.model.sharedModel;
        sharedModel.transact(() => {
          sharedModel.deleteCell(cellIndex);
          sharedModel.insertCell(cellIndex, { cell_type: cellType, source });
        });
      }
      nb.update();
    } else {
      return false;
    }

    return true;
  }

  /**
   * Test if a cell is selected in the active notebook
   *
   * @param cellIndex Cell index
   * @returns Whether the cell is selected or not
   */
  isNotebookCellSelected(cellIndex: number): boolean {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    const nb = nbPanel.content;

    const numCells = nb.widgets.length;
    if (cellIndex < 0 || cellIndex >= numCells) {
      return false;
    }

    return nb.isSelected(nb.widgets[cellIndex]);
  }

  /**
   * Save the active notebook
   */
  async saveActiveNotebook(): Promise<void> {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    await nbPanel.context.save();
  }

  /**
   * Wait for a Markdown cell to be rendered
   *
   * @param cell Cell
   */
  async waitForMarkdownCellRendered(cell: MarkdownCell): Promise<void> {
    if (!cell.inViewport) {
      return;
    }

    await cell.ready;

    if (cell.rendered) {
      return;
    }

    let resolver: (value: void | PromiseLike<void>) => void;
    const delegate = new Promise<void>(resolve => {
      resolver = resolve;
    });

    const onRenderedChanged = () => {
      Signal.disconnectReceiver(onRenderedChanged);
      resolver();
    };

    cell.renderedChanged.connect(onRenderedChanged);

    return delegate;
  }

  /**
   * Wait for a cell to be run
   *
   * @param cell Cell
   * @param timeout Timeout
   */
  async waitForCellRun(cell: Cell, timeout = 2000): Promise<void> {
    const model = cell.model;
    const code = model.sharedModel.getSource();
    if (!code.trim()) {
      return;
    }

    const cellType = cell.model.type;
    if (cellType === 'markdown') {
      await this.waitForMarkdownCellRendered(cell as MarkdownCell);
      return;
    } else if (cellType === 'raw') {
      return;
    } else {
      // 'code'
      let resolver: () => void;
      const delegate = new Promise<void>(resolve => {
        resolver = resolve;
      });

      let numTries = 0;
      let timer: any = null;
      let timeoutTimer: any = null;

      const clearAndResolve = () => {
        clearInterval(timer);
        timer = null;
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
        resolver();
      };

      const startTimeout = () => {
        if (!timeoutTimer) {
          timeoutTimer = setTimeout(() => {
            clearAndResolve();
          }, timeout);
        }
      };

      const checkIfDone = () => {
        if ((cell.model as CodeCellModel).executionCount !== null) {
          if (!cell.inViewport) {
            clearAndResolve();
            return;
          }

          const output = cell.node.querySelector(
            '.jp-Cell-outputArea .jp-OutputArea-output'
          );

          if (output) {
            if (output.textContent === 'Loading widget...') {
              startTimeout();
            } else {
              clearAndResolve();
            }
          } else {
            if (numTries > 0) {
              clearAndResolve();
            }
          }
        } else {
          startTimeout();
        }
        numTries++;
      };

      checkIfDone();

      timer = setInterval(() => {
        checkIfDone();
      }, 200);
      return delegate;
    }
  }

  /**
   * Run the active notebook cell by cell
   * and execute the callback after each cell execution
   *
   * @param callback Callback
   */
  async runActiveNotebookCellByCell(
    callback?: INotebookRunCallback
  ): Promise<void> {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    const notebook = nbPanel.content;
    if (!notebook.widgets) {
      console.error('NOTEBOOK CELL PROBLEM', notebook);
    }
    const numCells = notebook.widgets.length;

    if (numCells === 0) {
      return;
    }

    void this._app.commands.execute('notebook:deselect-all');

    for (let i = 0; i < numCells; ++i) {
      const cell = notebook.widgets[i];
      notebook.activeCellIndex = i;
      notebook.select(cell);

      await this._app.commands.execute('notebook:run-cell');

      await this.waitForCellRun(cell);

      if (callback?.onAfterCellRun) {
        await callback.onAfterCellRun(i);
      }

      if (callback?.onBeforeScroll) {
        await callback.onBeforeScroll();
      }

      await notebook.scrollToItem(i).catch(reason => {
        // no-op
      });

      if (callback?.onAfterScroll) {
        await callback.onAfterScroll();
      }
    }
  }

  /**
   * Test if one or all cells have an execution number.
   *
   * @param cellIndex Cell index
   * @returns Whether the cell was executed or not
   *
   * ### Notes
   * It checks that no cells have a `null` execution count.
   */
  haveBeenExecuted(cellIndex?: number): boolean {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    const nb = nbPanel.content;

    let counter = 0;
    if (nb) {
      if (nb.model) {
        if (cellIndex === undefined) {
          for (const cell of nb.model.cells) {
            if (cell.type === 'code') {
              counter +=
                cell.sharedModel.getSource().length > 0 &&
                (cell as CodeCellModel).executionCount === null
                  ? 1
                  : 0;
            }
          }
        } else {
          const cell = nb.model.cells.get(cellIndex);
          if (cell?.type === 'code') {
            counter +=
              cell.sharedModel.getSource().length > 0 &&
              (cell as CodeCellModel).executionCount === null
                ? 1
                : 0;
          }
        }
      }
    }

    return counter === 0;
  }

  /**
   * Get the index of a toolbar item
   *
   * @param itemName Item name
   * @returns Index
   */
  getNotebookToolbarItemIndex(itemName: string): number {
    const nbPanel = this._app.shell.currentWidget as NotebookPanel;
    return findIndex(nbPanel.toolbar.names(), name => name === itemName);
  }

  /**
   * Test if a element is visible or not
   *
   * @param el Element
   * @returns Test result
   */
  isElementVisible(el: HTMLElement): boolean {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  /**
   * Set the application theme
   *
   * @param themeName Theme name
   */
  async setTheme(themeName: string): Promise<void> {
    await this._app.commands.execute('apputils:change-theme', {
      theme: themeName
    });

    await this.waitFor(async () => {
      return document.body.dataset.jpThemeName === themeName;
    });
  }

  /**
   * Application object
   */
  get app(): JupyterFrontEnd {
    if (!this._app) {
      this._app = window.jupyterapp;
    }
    return this._app;
  }

  private _app: JupyterFrontEnd;
  protected listeners = new WeakMap<
    (arg: unknown) => void,
    (sender: unknown, args: unknown) => void
  >();
}
