// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type * as nbformat from '@jupyterlab/nbformat';
import type { NotebookPanel } from '@jupyterlab/notebook';
import { ElementHandle, Locator, Page } from '@playwright/test';
import * as path from 'path';
import { ContentsHelper } from '../contents';
import type { INotebookRunCallback } from '../extension';
import { galata } from '../galata';
import * as Utils from '../utils';
import { ActivityHelper } from './activity';
import { FileBrowserHelper } from './filebrowser';
import { MenuHelper } from './menu';

/**
 * Maximal number of retries to get a cell
 */
const MAX_RETRIES = 5;

/**
 * Notebook helpers
 */
export class NotebookHelper {
  constructor(
    readonly page: Page,
    readonly activity: ActivityHelper,
    readonly contents: ContentsHelper,
    readonly filebrowser: FileBrowserHelper,
    readonly menu: MenuHelper
  ) {}

  /**
   * Whether a given notebook is opened or not
   *
   * @param name Notebook name
   * @returns Notebook opened status
   */
  async isOpen(name: string): Promise<boolean> {
    const tab = this.activity.getTabLocator(name);
    return (await tab.count()) > 0;
  }

  /**
   * Whether a given notebook is active or not
   *
   * @param name Notebook name
   * @returns Notebook active status
   */
  async isActive(name: string): Promise<boolean> {
    return this.activity.isTabActive(name);
  }

  /**
   * Whether a notebook is currently active or not
   *
   * @returns Notebook active status
   */
  async isAnyActive(): Promise<boolean> {
    return (await this.getNotebookInPanelLocator()) !== null;
  }

  /**
   * Open a notebook from its name
   *
   * The notebook needs to exist in the current folder.
   *
   * @param name Notebook name
   * @returns Action success status
   */
  async open(name: string): Promise<boolean> {
    const isListed = await this.filebrowser.isFileListedInBrowser(name);
    if (!isListed) {
      return false;
    }

    await this.filebrowser.open(name);

    return await this.isOpen(name);
  }

  /**
   * Open a notebook from its path
   *
   * The notebook do not need to exist in the current folder
   *
   * @param filePath Notebook path
   * @returns Action success status
   */
  async openByPath(filePath: string): Promise<boolean> {
    await this.filebrowser.open(filePath);
    const name = path.basename(filePath);
    return await this.isOpen(name);
  }

  /**
   * Get the handle to a notebook panel
   *
   * @param name Notebook name
   * @returns Handle to the Notebook panel
   *
   * @deprecated You should use locator instead {@link getNotebookInPanelLocator}
   */
  async getNotebookInPanel(
    name?: string
  ): Promise<ElementHandle<Element> | null> {
    return (
      (await this.getNotebookInPanelLocator(name))?.elementHandle() ?? null
    );
  }

  /**
   * Get the locator to a notebook panel
   *
   * @param name Notebook name
   * @returns Locator to the Notebook panel
   */
  async getNotebookInPanelLocator(name?: string): Promise<Locator | null> {
    const nbPanel = await this.activity.getPanelLocator(name);

    if (nbPanel && (await nbPanel.count())) {
      if (await nbPanel.locator('.jp-NotebookPanel-notebook').count()) {
        return nbPanel.locator('.jp-NotebookPanel-notebook').first();
      }
    }

    return null;
  }

  /**
   * Get the handle to a notebook toolbar
   *
   * @param name Notebook name
   * @returns Handle to the Notebook toolbar
   *
   * @deprecated You should use locator instead {@link getToolbarLocator}
   */
  async getToolbar(name?: string): Promise<ElementHandle<Element> | null> {
    return (await this.getToolbarLocator(name))?.elementHandle() ?? null;
  }

  /**
   * Get the notebook toolbar locator
   *
   * @param name Notebook name
   * @returns Locator to the Notebook toolbar
   */
  async getToolbarLocator(name?: string): Promise<Locator | null> {
    return (
      (await this.activity.getPanelLocator(name))
        ?.locator('.jp-Toolbar')
        .first() ?? null
    );
  }

  /**
   * Get the handle to a notebook toolbar item from its index
   *
   * @param itemIndex Toolbar item index
   * @param notebookName Notebook name
   * @returns Handle to the notebook toolbar item
   *
   * @deprecated You should use locator instead {@link getToolbarItemLocatorByIndex}
   */
  async getToolbarItemByIndex(
    itemIndex: number,
    notebookName?: string
  ): Promise<ElementHandle<Element> | null> {
    return (
      (
        await this.getToolbarItemLocatorByIndex(itemIndex, notebookName)
      )?.elementHandle() ?? null
    );
  }

  /**
   * Get the locator to a notebook toolbar item from its index
   *
   * @param itemIndex Toolbar item index
   * @param notebookName Notebook name
   * @returns locator to the notebook toolbar item
   */
  async getToolbarItemLocatorByIndex(
    itemIndex: number,
    notebookName?: string
  ): Promise<Locator | null> {
    if (itemIndex === -1) {
      return null;
    }

    const toolbar = await this.getToolbarLocator(notebookName);

    if (toolbar) {
      const toolbarItems = toolbar.locator('.jp-Toolbar-item');
      if (itemIndex < (await toolbarItems.count())) {
        return toolbarItems.nth(itemIndex);
      }
    }

    return null;
  }

  /**
   * Get the handle to a notebook toolbar item from its id
   *
   * @param itemId Toolbar item id
   * @param notebookName Notebook name
   * @returns Handle to the notebook toolbar item
   *
   * @deprecated You should use locator instead {@link getToolbarItemLocator}
   */
  async getToolbarItem(
    itemId: galata.NotebookToolbarItemId,
    notebookName?: string
  ): Promise<ElementHandle<Element> | null> {
    return (
      (
        await this.getToolbarItemLocator(itemId, notebookName)
      )?.elementHandle() ?? null
    );
  }

  /**
   * Get the locator to a notebook toolbar item from its id
   *
   * @param itemId Toolbar item id
   * @param notebookName Notebook name
   * @returns Locator to the notebook toolbar item
   */
  async getToolbarItemLocator(
    itemId: galata.NotebookToolbarItemId,
    notebookName?: string
  ): Promise<Locator | null> {
    const toolbar = await this.getToolbarLocator(notebookName);

    if (toolbar) {
      const itemIndex = await this.page.evaluate(async (itemId: string) => {
        return window.galata.getNotebookToolbarItemIndex(itemId);
      }, itemId);

      return this.getToolbarItemLocatorByIndex(itemIndex);
    }

    return null;
  }

  /**
   * Click on a notebook toolbar item
   *
   * @param itemId Toolbar item id
   * @param notebookName Notebook name
   * @returns Action success status
   */
  async clickToolbarItem(
    itemId: galata.NotebookToolbarItemId,
    notebookName?: string
  ): Promise<boolean> {
    const toolbarItem = await this.getToolbarItemLocator(itemId, notebookName);

    if (toolbarItem) {
      await toolbarItem.click();

      return true;
    }

    return false;
  }

  /**
   * Activate a notebook
   *
   * @param name Notebook name
   * @returns Action success status
   */
  async activate(name: string): Promise<boolean> {
    if (await this.activity.activateTab(name)) {
      await this.page.evaluate(async () => {
        const galata = window.galata;
        const nbPanel = galata.app.shell.currentWidget as NotebookPanel;
        await nbPanel.sessionContext.ready;
        // Assuming that if the session is ready, the kernel is ready also for now and commenting out this line
        // await nbPanel.session.kernel.ready;
        galata.app.shell.activateById(nbPanel.id);
      });

      return true;
    }

    return false;
  }

  /**
   * Save the currently active notebook
   *
   * @returns Action success status
   */
  async save(): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    await this.page.evaluate(async () => {
      await window.galata.saveActiveNotebook();
    });

    return true;
  }

  /**
   * Revert changes to the currently active notebook
   *
   * @returns Action success status
   */
  async revertChanges(): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    await this.page.evaluate(async () => {
      const app = window.galata.app;
      const nbPanel = app.shell.currentWidget as NotebookPanel;
      await nbPanel.context.revert();
    });

    return true;
  }

  /**
   * Run all cells of the currently active notebook
   *
   * @returns Action success status
   */
  async run(): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    await this.page.evaluate(() => {
      window.galata.resetExecutionCount();
    });
    await this.menu.clickMenuItem('Run>Run All Cells');
    await this.waitForRun();

    return true;
  }

  /**
   * Run the currently active notebook cell by cell.
   *
   * @param callback Cell ran callback
   * @returns Action success status
   */
  async runCellByCell(callback?: INotebookRunCallback): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    let callbackName = '';

    if (callback) {
      callbackName = `_runCallbacksExposed${++this._runCallbacksExposed}`;

      await this.page.exposeFunction(
        `${callbackName}_onBeforeScroll`,
        async () => {
          if (callback && callback.onBeforeScroll) {
            await callback.onBeforeScroll();
          }
        }
      );

      await this.page.exposeFunction(
        `${callbackName}_onAfterScroll`,
        async () => {
          if (callback && callback.onAfterScroll) {
            await callback.onAfterScroll();
          }
        }
      );

      await this.page.exposeFunction(
        `${callbackName}_onAfterCellRun`,
        async (cellIndex: number) => {
          if (callback && callback.onAfterCellRun) {
            await callback.onAfterCellRun(cellIndex);
          }
        }
      );
    }

    await this.page.evaluate(async (callbackName: string) => {
      const callbacks =
        callbackName === ''
          ? undefined
          : ({
              onBeforeScroll: async () => {
                await (window as any)[`${callbackName}_onBeforeScroll`]();
              },

              onAfterScroll: async () => {
                await (window as any)[`${callbackName}_onAfterScroll`]();
              },

              onAfterCellRun: async (cellIndex: number) => {
                await (window as any)[`${callbackName}_onAfterCellRun`](
                  cellIndex
                );
              }
            } as INotebookRunCallback);

      await window.galata.runActiveNotebookCellByCell(callbacks);
    }, callbackName);

    return true;
  }

  /**
   * Trust the active notebook
   *
   * @returns Whether the action succeeded or not.
   */
  async trust(): Promise<boolean> {
    if (
      (await this.isAnyActive()) &&
      (await this.page
        .locator('[data-icon="ui-components:not-trusted"]')
        .count()) === 1
    ) {
      await this.page.keyboard.press('Control+Shift+C');
      await this.page.getByPlaceholder('SEARCH', { exact: true }).fill('trust');
      await this.page.getByText('Trust Notebook').click();
      await this.page.getByRole('button', { name: 'Trust' }).click();

      return (
        (await this.page
          .locator('[data-icon="ui-components:trusted"]')
          .count()) === 1
      );
    }

    return true;
  }

  /**
   * Wait for notebook cells execution to finish
   *
   * @param cellIndex Cell index
   */
  async waitForRun(cellIndex?: number): Promise<void> {
    const idleLocator = this.page.locator('#jp-main-statusbar >> text=Idle');
    await idleLocator.waitFor();

    // Wait for all cells to have an execution count
    let done = false;
    do {
      await this.page.waitForTimeout(20);
      done = await this.page.evaluate(cellIdx => {
        return window.galata.haveBeenExecuted(cellIdx);
      }, cellIndex);
    } while (!done);
  }

  /**
   * Close the notebook with or without reverting unsaved changes
   *
   * @param revertChanges Whether to revert changes or not
   * @returns Action success status
   */
  async close(revertChanges = true): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    const page = this.page;
    const tab = this.activity.getTabLocator();

    if (!(await tab.count())) {
      return false;
    }

    if (revertChanges) {
      if (!(await this.revertChanges())) {
        return false;
      }
    }

    const closeIcon = tab.locator('.lm-TabBar-tabCloseIcon');
    if (!(await closeIcon.count())) {
      return false;
    }

    await closeIcon.click();

    // close save prompt
    const dialog = page.locator('.jp-Dialog .jp-Dialog-content');
    const dlgBtnSelector = revertChanges
      ? 'button.jp-mod-accept.jp-mod-warn' // discard
      : 'button.jp-mod-accept:not(.jp-mod-warn)'; // save
    const dlgBtn = dialog.locator(dlgBtnSelector);

    if (await dlgBtn.count()) {
      await dlgBtn.click();
    }
    await dialog.waitFor({ state: 'hidden' });

    return true;
  }

  /**
   * Get the number of cells in the currently active notebook
   *
   * @returns Number of cells
   */
  getCellCount = async (): Promise<number> => {
    const notebook = await this.getNotebookInPanelLocator();
    if (!notebook) {
      return -1;
    }
    const scroller = notebook.locator('.jp-WindowedPanel-outer');
    const scrollTop = await scroller.evaluate(node => node.scrollTop);

    // Scroll to bottom
    let previousScrollHeight = scrollTop;
    let scrollHeight =
      previousScrollHeight +
      (await scroller.evaluate(node => node.clientHeight));
    do {
      await scroller.evaluate((node, scrollTarget) => {
        node.scrollTo({ top: scrollTarget });
      }, scrollHeight);
      await this.page.waitForTimeout(50);
      previousScrollHeight = scrollHeight;
      scrollHeight = await scroller.evaluate(
        node => node.scrollHeight - node.clientHeight
      );
    } while (scrollHeight > previousScrollHeight);
    const lastCell = notebook.locator('div.jp-Cell').last();
    const count =
      parseInt(
        (await lastCell.getAttribute('data-windowed-list-index')) ?? '0',
        10
      ) + 1;

    // Scroll back to original position
    await scroller.evaluate((node, scrollTarget) => {
      node.scrollTo({ top: scrollTarget });
    }, scrollTop);

    return count;
  };

  /**
   * Get a cell handle
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell
   *
   * @deprecated You should use locator instead {@link getCellLocator}
   */
  async getCell(cellIndex: number): Promise<ElementHandle<Element> | null> {
    return (await this.getCellLocator(cellIndex))?.elementHandle() ?? null;
  }

  /**
   * Get a cell locator
   *
   * @param cellIndex Cell index
   * @param name Notebook name
   * @returns Handle to the cell
   */
  async getCellLocator(cellIndex: number): Promise<Locator | null> {
    const notebook = await this.getNotebookInPanelLocator();
    if (!notebook) {
      return null;
    }

    const cells = notebook.locator('.jp-Cell:visible');
    let firstIndex = parseInt(
      (await cells.first().getAttribute('data-windowed-list-index')) ?? '',
      10
    );
    let lastIndex = parseInt(
      (await cells.last().getAttribute('data-windowed-list-index')) ?? '',
      10
    );
    if (cellIndex < firstIndex) {
      // Scroll up
      const viewport = await notebook
        .locator('.jp-WindowedPanel-outer')
        .first()
        .boundingBox();
      await this.page.mouse.move(viewport!.x, viewport!.y);
      do {
        await this.page.mouse.wheel(0, -100);
        await this.page.waitForTimeout(50);
        firstIndex = parseInt(
          (await cells.first().getAttribute('data-windowed-list-index')) ?? '',
          10
        );
      } while (cellIndex < firstIndex);
      lastIndex = parseInt(
        (await cells.last().getAttribute('data-windowed-list-index')) ?? '',
        10
      );
    } else if (cellIndex > lastIndex) {
      // Scroll down
      const viewport = await notebook
        .locator('.jp-WindowedPanel-outer')
        .first()
        .boundingBox();
      await this.page.mouse.move(viewport!.x, viewport!.y);
      do {
        await this.page.mouse.wheel(0, 100);
        await this.page.waitForTimeout(50);
        lastIndex = parseInt(
          (await cells.last().getAttribute('data-windowed-list-index')) ?? '',
          10
        );
      } while (lastIndex < cellIndex);
      firstIndex = parseInt(
        (await cells.first().getAttribute('data-windowed-list-index')) ?? '',
        10
      );
    }

    if (firstIndex <= cellIndex && cellIndex <= lastIndex) {
      return notebook.locator(
        `.jp-Cell[data-windowed-list-index="${cellIndex}"]`
      );
    } else {
      return null;
    }
  }

  /**
   * Get the handle to the input of a cell
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell input
   *
   * @deprecated You should use locator instead {@link getCellInputLocator}
   */
  async getCellInput(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    return (await this.getCellInputLocator(cellIndex))?.elementHandle() ?? null;
  }

  /**
   * Get the locator to the input of a cell
   *
   * @param cellIndex Cell index
   * @returns Locator to the cell input
   */
  async getCellInputLocator(cellIndex: number): Promise<Locator | null> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return null;
    }

    const cellEditor = cell.locator('.jp-InputArea-editor');
    if (!(await cellEditor.count())) {
      return null;
    }

    const isRenderedMarkdown = (
      await Utils.getLocatorClassList(cellEditor)
    ).includes('lm-mod-hidden');

    if (isRenderedMarkdown) {
      return cell.locator('.jp-MarkdownOutput');
    }

    return cellEditor;
  }

  /**
   * Get the content of the cell input
   *
   * @param cellIndex Cell index
   * @returns the code input
   */
  async getCellTextInput(cellIndex: number): Promise<string> {
    // Using textContent on handle does not preserve new lines, so we need to either:
    // (a) use `evaluate()` operate on the codemirror instance directly to get the code
    // (b) iterate the lines in representation and concatenate manually
    // (c) copy-paste the content and read the clipboard
    // Out of the three options only (c) does not touch implementation details of CodeMirror.
    const wasInEditingMode = await this.isCellInEditingMode(cellIndex);
    if (!wasInEditingMode) {
      await this.enterCellEditingMode(cellIndex);
    }
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Control+C');
    await this.page.context().grantPermissions(['clipboard-read']);
    const handle = await this.page.evaluateHandle(() =>
      navigator.clipboard.readText()
    );
    if (!wasInEditingMode) {
      await this.leaveCellEditingMode(cellIndex);
    }
    return await handle.jsonValue();
  }

  /**
   * Get the handle to the input expander of a cell
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell input expander
   *
   * @deprecated You should use locator instead {@link getCellInputExpanderLocator}
   */
  async getCellInputExpander(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    return (
      (await this.getCellInputExpanderLocator(cellIndex))?.elementHandle() ??
      null
    );
  }

  /**
   * Get the locator to the input expander of a cell
   *
   * @param cellIndex Cell index
   * @returns Locator to the cell input expander
   */
  async getCellInputExpanderLocator(
    cellIndex: number
  ): Promise<Locator | null> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return null;
    }

    return cell.locator('.jp-InputCollapser');
  }

  /**
   * Whether a cell input is expanded or not
   *
   * @param cellIndex Cell index
   * @returns Cell input expanded status
   */
  async isCellInputExpanded(cellIndex: number): Promise<boolean | null> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return null;
    }

    return (await cell.locator('.jp-InputPlaceholder').count()) > 0;
  }

  /**
   * Set the expanded status of a given input cell
   *
   * @param cellIndex Cell index
   * @param expand Input expanded status
   * @returns Action success status
   */
  async expandCellInput(cellIndex: number, expand: boolean): Promise<boolean> {
    const expanded = await this.isCellInputExpanded(cellIndex);
    if ((expanded && expand) || (!expanded && !expand)) {
      return false;
    }

    const inputExpander = await this.getCellInputExpanderLocator(cellIndex);
    if (!inputExpander) {
      return false;
    }

    await inputExpander.click();

    return true;
  }

  /**
   * Get the handle to a cell output expander
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell output expander
   *
   * @deprecated You should use locator instead {@link getCellOutputExpanderLocator}
   */
  async getCellOutputExpander(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    return (
      (await this.getCellInputExpanderLocator(cellIndex))?.elementHandle() ??
      null
    );
  }

  /**
   * Get the locator to a cell output expander
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell output expander
   */
  async getCellOutputExpanderLocator(
    cellIndex: number
  ): Promise<Locator | null> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return null;
    }

    const cellType = await this.getCellType(cellIndex);

    return cellType === 'code' ? cell.locator('.jp-OutputCollapser') : null;
  }

  /**
   * Whether a cell output is expanded or not
   *
   * @param cellIndex Cell index
   * @returns Cell output expanded status
   */
  async isCellOutputExpanded(cellIndex: number): Promise<boolean | null> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return null;
    }

    return (await cell.locator('.jp-OutputPlaceholder').count()) > 0;
  }

  /**
   * Set the expanded status of a given output cell
   *
   * @param cellIndex Cell index
   * @param expand Output expanded status
   * @returns Action success status
   */
  async expandCellOutput(cellIndex: number, expand: boolean): Promise<boolean> {
    const expanded = await this.isCellOutputExpanded(cellIndex);
    if ((expanded && expand) || (!expanded && !expand)) {
      return false;
    }

    const outputExpander = await this.getCellOutputExpanderLocator(cellIndex);
    if (!outputExpander) {
      return false;
    }

    await outputExpander.click();

    return true;
  }

  /**
   * Get the handle on a given output cell
   *
   * @param cellIndex Cell index
   * @returns Output cell handle
   *
   * @deprecated You should use locator instead {@link getCellOutputLocator}
   */
  async getCellOutput(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    return (
      (await this.getCellOutputLocator(cellIndex))?.elementHandle() ?? null
    );
  }

  /**
   * Get the locator on a given output cell
   *
   * @param cellIndex Cell index
   * @returns Locator cell handle
   */
  async getCellOutputLocator(cellIndex: number): Promise<Locator | null> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return null;
    }

    const codeCellOutput = cell.locator('.jp-Cell-outputArea');
    if (await codeCellOutput.count()) {
      return codeCellOutput;
    }

    const mdCellOutput = cell.locator('.jp-MarkdownOutput');
    if (await mdCellOutput.count()) {
      return mdCellOutput;
    }

    return null;
  }

  /**
   * Get all cell outputs as text
   *
   * @param cellIndex Cell index
   * @returns List of text outputs
   */
  async getCellTextOutput(cellIndex: number): Promise<string[] | null> {
    const cellOutput = await this.getCellOutputLocator(cellIndex);
    if (!cellOutput) {
      return null;
    }

    const textOutputs = cellOutput.locator('.jp-OutputArea-output');
    const textOutputsNum = await textOutputs.count();
    if (textOutputsNum > 0) {
      const outputs: string[] = [];
      for (let i = 0; i < textOutputsNum; i++) {
        outputs.push((await textOutputs.nth(i).textContent()) ?? '');
      }

      return outputs;
    }

    return null;
  }

  /**
   * Whether the cell is in editing mode or not.
   *
   * This method is not suitable for checking if a cell is unrendered
   * as it will return false when the cell is not active (not focused).
   *
   * @param cellIndex Cell index
   * @returns Editing mode
   */
  async isCellInEditingMode(cellIndex: number): Promise<boolean> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return false;
    }

    const cellEditor = cell.locator('.jp-InputArea-editor');
    if (await cellEditor.count()) {
      return (await Utils.getLocatorClassList(cellEditor)).includes(
        'jp-mod-focused'
      );
    }

    return false;
  }

  private async _setCellMode(
    cell: Locator,
    mode: 'Edit' | 'Command'
  ): Promise<boolean> {
    const isCellActive = (await cell.getAttribute('class'))
      ?.split(/\s/)
      .includes('jp-mod-active');
    const modeLocator = this.page.getByText(`Mode: ${mode}`, { exact: true });
    if ((await modeLocator.count()) == 1 && isCellActive) {
      return false;
    }
    const cellInput = cell.locator('.jp-Cell-inputArea');
    if (!(await cellInput.count())) {
      return false;
    }

    let isMarkdown = false;
    const cellType = await this.getCellLocatorType(cell);
    if (cellType === 'markdown') {
      const renderedMarkdown = cell.locator('.jp-MarkdownOutput');
      if (await renderedMarkdown.count()) {
        isMarkdown = true;
      }
    }

    if (mode == 'Edit') {
      if (isMarkdown) {
        await cellInput.dblclick();
      }
      await cell.locator('.jp-Cell-inputArea').dblclick();
      const cellEditor = cellInput.locator('.jp-InputArea-editor');
      if (!cellEditor.count()) {
        return false;
      }

      await cellEditor.click();
    } else {
      await cell.locator('.jp-Cell-inputArea').press('Escape');
    }

    return true;
  }

  /**
   * Enter the editing mode on a given cell
   *
   * @param cellIndex Cell index
   * @returns Action success status
   */
  async enterCellEditingMode(cellIndex: number): Promise<boolean> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return false;
    }

    return this._setCellMode(cell, 'Edit');
  }

  /**
   * Leave the editing mode
   *
   * @param cellIndex Cell index
   * @returns Action success status
   */
  async leaveCellEditingMode(cellIndex: number): Promise<boolean> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return false;
    }

    await this._setCellMode(cell, 'Command');

    return true;
  }

  /**
   * Clicks a cell gutter line for code cells
   *
   * @param cellIndex Cell index
   * @param lineNumber Cell line number, starts at 1
   */
  async clickCellGutter(
    cellIndex: number,
    lineNumber: number
  ): Promise<boolean> {
    if (lineNumber < 1) {
      return false;
    }

    if (!(await this.isCellGutterPresent(cellIndex))) {
      return false;
    }

    const cell = await this.getCellLocator(cellIndex);
    return this._clickOnGutter(cell!, lineNumber);
  }

  /**
   * Check if cell gutter is present
   *
   * @param cellIndex
   */
  async isCellGutterPresent(cellIndex: number): Promise<boolean> {
    const cell = await this.getCellLocator(cellIndex);
    if (!cell) {
      return false;
    }
    return await cell.locator('.cm-gutters')?.isVisible();
  }

  /**
   * Wait until cell gutter is visible
   *
   * @param cellIndex
   */
  waitForCellGutter(cellIndex: number): Promise<void> {
    return Utils.waitForCondition(() => this.isCellGutterPresent(cellIndex));
  }

  /**
   * Clicks a code gutter line for scripts
   *
   * @param lineNumber Cell line number, starts at 1
   */
  async clickCodeGutter(lineNumber: number): Promise<boolean> {
    if (lineNumber < 1) {
      return false;
    }

    if (!(await this.isCodeGutterPresent())) {
      return false;
    }

    const panel = await this.activity.getPanelLocator();
    if (!panel) {
      return false;
    }
    await Utils.waitForCondition(
      async () =>
        (await panel
          .locator(
            '.cm-gutters > .cm-gutter.cm-breakpoint-gutter > .cm-gutterElement'
          )
          .count()) > 0
    );

    return this._clickOnGutter(panel!, lineNumber);
  }

  /**
   * Check if code gutter is present
   *
   */
  async isCodeGutterPresent(): Promise<boolean> {
    const panel = await this.activity.getPanelLocator();
    if (!(panel && (await panel.count()))) {
      return false;
    }
    return (await panel.locator('.cm-gutters')?.isVisible()) !== null;
  }

  /**
   * Wait until cell gutter is visible
   *
   * @param cellIndex
   */
  waitForCodeGutter(): Promise<void> {
    return Utils.waitForCondition(() => this.isCodeGutterPresent());
  }

  protected async _clickOnGutter(
    panel: Locator,
    line: number
  ): Promise<boolean> {
    const gutters = panel.locator(
      '.cm-gutters > .cm-gutter.cm-breakpoint-gutter > .cm-gutterElement'
    );
    if ((await gutters.count()) < line) {
      return false;
    }

    // Sometime the breakpoint is not activated when clicking on the gutter, it can be
    // useful to try it several times.
    const gutter = gutters.nth(line);
    for (let i = 0; i < 3; i++) {
      await gutter.click({ position: { x: 5, y: 5 } });
      let break_ = true;
      try {
        await Utils.waitForCondition(
          async () => ((await gutter.textContent())?.length ?? 0) > 0,
          1000
        );
      } catch (reason) {
        break_ = false;
      }
      if (break_) {
        break;
      }
    }
    return true;
  }

  /**
   * Select cells
   *
   * @param startIndex Start cell index
   * @param endIndex End cell index
   * @returns Action success status
   */
  async selectCells(startIndex: number, endIndex?: number): Promise<boolean> {
    const startCell = await this.getCellLocator(startIndex);
    if (!startCell) {
      return false;
    }

    const clickPosition: any = { x: 15, y: 5 };

    await startCell.click({ position: clickPosition });

    if (endIndex !== undefined) {
      const endCell = await this.getCellLocator(endIndex);
      if (!endCell) {
        return false;
      }

      await endCell.click({ position: clickPosition, modifiers: ['Shift'] });
    }

    return true;
  }

  /**
   * Whether a given cell is selected or not
   *
   * @param cellIndex Cell index
   * @returns Selection status
   */
  async isCellSelected(cellIndex: number): Promise<boolean> {
    return await this.page.evaluate((cellIndex: number) => {
      return window.galata.isNotebookCellSelected(cellIndex);
    }, cellIndex);
  }

  /**
   * Delete selected cells
   *
   * @returns Action success status
   */
  async deleteCells(): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    await this.page.evaluate(() => {
      return window.galata.deleteNotebookCells();
    });

    return true;
  }

  /**
   * Add a cell to the currently active notebook
   *
   * @param cellType Cell type
   * @param source Source
   * @returns Action success status
   */
  async addCell(cellType: nbformat.CellType, source: string): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    const numCells = await this.getCellCount();

    await this.selectCells(numCells - 1);
    await this.clickToolbarItem('insert');
    await Utils.waitForCondition(async (): Promise<boolean> => {
      return (await this.getCellCount()) === numCells + 1;
    });

    return await this.setCell(numCells, cellType, source);
  }

  /**
   * Set the input source of a cell
   *
   * @param cellIndex Cell index
   * @param cellType Cell type
   * @param source Source
   * @returns Action success status
   */
  async setCell(
    cellIndex: number,
    cellType: nbformat.CellType,
    source: string
  ): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    const r = await this.setCellType(cellIndex, cellType);
    if (!r) {
      return false;
    }

    if (
      !(await this.isCellSelected(cellIndex)) &&
      !(await this.selectCells(cellIndex))
    ) {
      return false;
    }

    const cell = await this.getCellLocator(cellIndex);

    if (!cell) {
      return false;
    }

    await this._setCellMode(cell, 'Edit');
    await cell.getByRole('textbox').press('Control+A');
    await cell.getByRole('textbox').pressSequentially(source);
    await this._setCellMode(cell, 'Command');

    if (cellType === 'code') {
      // Wait until the CodeMirror highlighting is stable
      // over 10 consecutive animation frames.
      await cell.evaluate((cell: HTMLElement) => {
        let _resolve: () => void;
        const promise = new Promise<void>(resolve => {
          _resolve = resolve;
        });
        let framesWithoutChange = 0;
        let content = cell.querySelector('.cm-content')!.innerHTML;
        const waitUntilNextFrame = () => {
          window.requestAnimationFrame(() => {
            const newContent = cell.querySelector('.cm-content')!.innerHTML;
            if (content === newContent) {
              framesWithoutChange += 1;
            } else {
              framesWithoutChange = 0;
            }
            if (framesWithoutChange < 10) {
              waitUntilNextFrame();
            } else {
              _resolve();
            }
          });
        };
        waitUntilNextFrame();
        return promise;
      });
    }

    return true;
  }

  /**
   * Set the type of a cell
   *
   * @param cellIndex Cell index
   * @param cellType Cell type
   * @returns Action success status
   */
  async setCellType(
    cellIndex: number,
    cellType: nbformat.CellType
  ): Promise<boolean> {
    const nbPanel = await this.activity.getPanelLocator();
    if (!(nbPanel && (await nbPanel.count()))) {
      return false;
    }

    if ((await this.getCellType(cellIndex)) === cellType) {
      return true;
    }

    if (!(await this.selectCells(cellIndex))) {
      return false;
    }

    await this.clickToolbarItem('cellType');
    const selectInput = nbPanel.locator('.jp-Notebook-toolbarCellTypeDropdown');
    if (!(await selectInput.count())) {
      return false;
    }

    // Legay select
    const select = selectInput.locator('select');
    if (await select.count()) {
      await select.selectOption(cellType);
    } else {
      await selectInput.evaluate((el, cellType) => {
        (el as any).value = cellType;
      }, cellType);
    }

    // Wait for the new cell to be rendered
    let cell: Locator | null;
    let counter = 1;
    do {
      await this.page.waitForTimeout(50);
      cell = await this.getCellLocator(cellIndex);
    } while (!cell?.isVisible() && counter++ < MAX_RETRIES);

    return counter < MAX_RETRIES;
  }

  /**
   * Get the cell type of a cell
   *
   * @param cellIndex Cell index
   * @returns Cell type
   */
  async getCellType(cellIndex: number): Promise<nbformat.CellType | null> {
    const cell = await this.getCellLocator(cellIndex);

    if (!cell) {
      return null;
    }

    return this.getCellLocatorType(cell);
  }

  /**
   * Get the cell type of a cell from its locator
   *
   * @param cell Cell locator
   * @returns Cell type
   */
  async getCellLocatorType(cell: Locator): Promise<nbformat.CellType | null> {
    const classList = await Utils.getLocatorClassList(cell);

    if (classList.indexOf('jp-CodeCell') !== -1) {
      return 'code';
    } else if (classList.indexOf('jp-MarkdownCell') !== -1) {
      return 'markdown';
    } else if (classList.indexOf('jp-RawCell') !== -1) {
      return 'raw';
    }

    return null;
  }

  /**
   * Run a given cell
   *
   * @param cellIndex Cell index
   * @param inplace Whether to stay on the cell or select the next one
   * @returns Action success status
   */
  async runCell(cellIndex: number, inplace?: boolean): Promise<boolean> {
    if (!(await this.isAnyActive())) {
      return false;
    }

    if (
      !(await this.isCellSelected(cellIndex)) &&
      !(await this.selectCells(cellIndex))
    ) {
      return false;
    }

    await this.page.evaluate(cellIdx => {
      window.galata.resetExecutionCount(cellIdx);
    }, cellIndex);
    await this.page.keyboard.press(
      inplace === true ? 'Control+Enter' : 'Shift+Enter'
    );
    await this.waitForRun(cellIndex);

    return true;
  }

  /**
   * Creates a new notebook.
   *
   * @param name - The name of the notebook. If provided, the notebook will be renamed to this name.
   * @param options - Parameters for creating the notebook.
   * @param options.kernel - The kernel to use for the notebook.
   * @returns A Promise that resolves to the name of the created notebook, or `null` if the notebook creation failed.
   */
  async createNew(
    name?: string,
    options?: { kernel?: string | null }
  ): Promise<string | null> {
    await this.menu.clickMenuItem('File>New>Notebook');

    const page = this.page;
    await page.locator('.jp-Dialog').waitFor();

    if (options && options.kernel !== undefined) {
      if (options.kernel === null) {
        await page
          .getByRole('dialog')
          .getByRole('combobox')
          .selectOption('null');
      } else {
        await page
          .getByRole('dialog')
          .getByRole('combobox')
          .selectOption(`{"name":"${options.kernel}"}`);
      }
    }

    await page.click('.jp-Dialog .jp-mod-accept');

    const activeTab = this.activity.getTabLocator();
    if (!(await activeTab.count())) {
      return null;
    }

    const label = activeTab.locator('div.lm-TabBar-tabLabel');
    if (!(await label.count())) {
      return null;
    }

    const assignedName = await label.textContent();

    if (!name) {
      return assignedName;
    }

    const currentDir = await this.filebrowser.getCurrentDirectory();
    await this.contents.renameFile(
      `${currentDir}/${assignedName}`,
      `${currentDir}/${name}`
    );
    const renamedTab = this.activity.getTabLocator(name);

    return (await renamedTab.count()) ? name : null;
  }

  private _runCallbacksExposed = 0;
}
