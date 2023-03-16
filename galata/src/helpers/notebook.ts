// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type * as nbformat from '@jupyterlab/nbformat';
import type { NotebookPanel } from '@jupyterlab/notebook';
import { ElementHandle, Page } from '@playwright/test';
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
const MAX_RETRIES = 3;

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
    const tab = await this.activity.getTab(name);
    return tab !== null;
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
    return (await this.getNotebookInPanel()) !== null;
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
   */
  async getNotebookInPanel(
    name?: string
  ): Promise<ElementHandle<Element> | null> {
    const nbPanel = await this.activity.getPanel(name);

    if (nbPanel) {
      return await nbPanel.$('.jp-NotebookPanel-notebook');
    }

    return null;
  }

  /**
   * Get the handle to a notebook toolbar
   *
   * @param name Notebook name
   * @returns Handle to the Notebook toolbar
   */
  async getToolbar(name?: string): Promise<ElementHandle<Element> | null> {
    const nbPanel = await this.activity.getPanel(name);

    if (nbPanel) {
      return await nbPanel.$('.jp-Toolbar');
    }

    return null;
  }

  /**
   * Get the handle to a notebook toolbar item from its index
   *
   * @param itemIndex Toolbar item index
   * @param notebookName Notebook name
   * @returns Handle to the notebook toolbar item
   */
  async getToolbarItemByIndex(
    itemIndex: number,
    notebookName?: string
  ): Promise<ElementHandle<Element> | null> {
    if (itemIndex === -1) {
      return null;
    }

    const toolbar = await this.getToolbar(notebookName);

    if (toolbar) {
      const toolbarItems = await toolbar.$$('.jp-Toolbar-item');
      if (itemIndex < toolbarItems.length) {
        return toolbarItems[itemIndex];
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
   */
  async getToolbarItem(
    itemId: galata.NotebookToolbarItemId,
    notebookName?: string
  ): Promise<ElementHandle<Element> | null> {
    const toolbar = await this.getToolbar(notebookName);

    if (toolbar) {
      const itemIndex = await this.page.evaluate(async (itemId: string) => {
        return window.galata.getNotebookToolbarItemIndex(itemId);
      }, itemId);

      return this.getToolbarItemByIndex(itemIndex);
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
    const toolbarItem = await this.getToolbarItem(itemId, notebookName);

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
    const tab = await this.activity.getTab();

    if (!tab) {
      return false;
    }

    if (revertChanges) {
      if (!(await this.revertChanges())) {
        return false;
      }
    }

    const closeIcon = await tab.$('.lm-TabBar-tabCloseIcon');
    if (!closeIcon) {
      return false;
    }

    await closeIcon.click();

    // close save prompt
    const dialogSelector = '.jp-Dialog .jp-Dialog-content';
    const dialog = await page.$(dialogSelector);
    if (dialog) {
      const dlgBtnSelector = revertChanges
        ? 'button.jp-mod-accept.jp-mod-warn' // discard
        : 'button.jp-mod-accept:not(.jp-mod-warn)'; // save
      const dlgBtn = await dialog.$(dlgBtnSelector);

      if (dlgBtn) {
        await dlgBtn.click();
      }
    }
    await page.waitForSelector(dialogSelector, { state: 'hidden' });

    return true;
  }

  /**
   * Get the number of cells in the currently active notebook
   *
   * @returns Number of cells
   */
  getCellCount = async (): Promise<number> => {
    const notebook = await this.getNotebookInPanel();
    if (!notebook) {
      return -1;
    }

    const scrollTop = await notebook.evaluate(node => node.scrollTop);

    // Scroll to bottom
    let previousScrollHeight = scrollTop;
    let scrollHeight =
      previousScrollHeight +
      (await notebook.evaluate(node => node.clientHeight));
    do {
      await notebook.evaluate((node, scrollTarget) => {
        node.scrollTo({ top: scrollTarget });
      }, scrollHeight);
      await this.page.waitForTimeout(50);
      previousScrollHeight = scrollHeight;
      scrollHeight = await notebook.evaluate(
        node => node.scrollHeight - node.clientHeight
      );
    } while (scrollHeight > previousScrollHeight);

    const lastCell = await notebook.$$('div.jp-Cell >> nth=-1');
    const count =
      parseInt(
        (await lastCell[0].getAttribute('data-windowed-list-index')) ?? '0',
        10
      ) + 1;

    // Scroll back to original position
    await notebook.evaluate((node, scrollTarget) => {
      node.scrollTo({ top: scrollTarget });
    }, scrollTop);

    return count;
  };

  /**
   * Get a cell handle
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell
   */
  async getCell(cellIndex: number): Promise<ElementHandle<Element> | null> {
    const notebook = await this.getNotebookInPanel();
    if (!notebook) {
      return null;
    }

    const allCells = await notebook.$$('div.jp-Cell');
    const filters = await Promise.all(allCells.map(c => c.isVisible()));
    const cells = allCells.filter((c, i) => filters[i]);

    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];

    let firstIndex = parseInt(
      (await firstCell.getAttribute('data-windowed-list-index')) ?? '0',
      10
    );
    let lastIndex = parseInt(
      (await lastCell.getAttribute('data-windowed-list-index')) ?? '0',
      10
    );

    if (cellIndex < firstIndex) {
      // Scroll up
      let scrollTop =
        (await firstCell.boundingBox())?.y ??
        (await notebook.evaluate(node => node.scrollTop - node.clientHeight));

      do {
        await notebook.evaluate((node, scrollTarget) => {
          node.scrollTo({ top: scrollTarget });
        }, scrollTop);
        await this.page.waitForTimeout(50);

        const cells = await notebook.$$('div.jp-Cell');
        const isVisible = await Promise.all(cells.map(c => c.isVisible()));
        const firstCell = isVisible.findIndex(visibility => visibility);

        firstIndex = parseInt(
          (await cells[firstCell].getAttribute('data-windowed-list-index')) ??
            '0',
          10
        );
        scrollTop =
          (await cells[firstCell].boundingBox())?.y ??
          (await notebook.evaluate(node => node.scrollTop - node.clientHeight));
      } while (scrollTop > 0 && firstIndex > cellIndex);
    } else if (cellIndex > lastIndex) {
      const clientHeight = await notebook.evaluate(node => node.clientHeight);
      // Scroll down
      const viewport = await (
        await notebook.$$('.jp-WindowedPanel-window')
      )[0].boundingBox();
      let scrollHeight = viewport!.y + viewport!.height;
      let previousScrollHeight = 0;

      do {
        previousScrollHeight = scrollHeight;
        await notebook.evaluate((node, scrollTarget) => {
          node.scrollTo({ top: scrollTarget });
        }, scrollHeight);
        await this.page.waitForTimeout(50);

        const cells = await notebook.$$('div.jp-Cell');
        const isVisible = await Promise.all(cells.map(c => c.isVisible()));
        const lastCell = isVisible.lastIndexOf(true);

        lastIndex = parseInt(
          (await cells[lastCell].getAttribute('data-windowed-list-index')) ??
            '0',
          10
        );

        const viewport = await (
          await notebook.$$('.jp-WindowedPanel-window')
        )[0].boundingBox();
        scrollHeight = viewport!.y + viewport!.height;
        // Avoid jitter
        scrollHeight = Math.max(
          previousScrollHeight + clientHeight,
          scrollHeight
        );
      } while (scrollHeight > previousScrollHeight && lastIndex < cellIndex);
    }

    if (firstIndex <= cellIndex && cellIndex <= lastIndex) {
      return (
        await notebook.$$(
          `div.jp-Cell[data-windowed-list-index="${cellIndex}"]`
        )
      )[0];
    } else {
      return null;
    }
  }

  /**
   * Get the handle to the input of a cell
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell input
   */
  async getCellInput(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return null;
    }

    const cellEditor = await cell.$('.jp-InputArea-editor');
    if (!cellEditor) {
      return null;
    }

    const isRenderedMarkdown = await cellEditor.evaluate(editor =>
      editor.classList.contains('lm-mod-hidden')
    );
    if (isRenderedMarkdown) {
      return await cell.$('.jp-MarkdownOutput');
    }

    return cellEditor;
  }

  /**
   * Get the handle to the input expander of a cell
   *
   * @param cellIndex Cell index
   * @returns Handle to the cell input expander
   */
  async getCellInputExpander(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return null;
    }

    return await cell.$('.jp-InputCollapser');
  }

  /**
   * Whether a cell input is expanded or not
   *
   * @param cellIndex Cell index
   * @returns Cell input expanded status
   */
  async isCellInputExpanded(cellIndex: number): Promise<boolean | null> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return null;
    }

    return (await cell.$('.jp-InputPlaceholder')) === null;
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

    const inputExpander = await this.getCellInputExpander(cellIndex);
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
   */
  async getCellOutputExpander(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return null;
    }

    const cellType = await this.getCellType(cellIndex);

    return cellType === 'code' ? await cell.$('.jp-OutputCollapser') : null;
  }

  /**
   * Whether a cell output is expanded or not
   *
   * @param cellIndex Cell index
   * @returns Cell output expanded status
   */
  async isCellOutputExpanded(cellIndex: number): Promise<boolean | null> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return null;
    }

    return (await cell.$('.jp-OutputPlaceholder')) === null;
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

    const outputExpander = await this.getCellOutputExpander(cellIndex);
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
   */
  async getCellOutput(
    cellIndex: number
  ): Promise<ElementHandle<Element> | null> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return null;
    }

    const codeCellOutput = await cell.$('.jp-Cell-outputArea');
    if (codeCellOutput) {
      return codeCellOutput;
    }

    const mdCellOutput = await cell.$('.jp-MarkdownOutput');
    if (mdCellOutput) {
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
    const cellOutput = await this.getCellOutput(cellIndex);
    if (!cellOutput) {
      return null;
    }

    const textOutputs = await cellOutput.$$('.jp-OutputArea-output');
    if (textOutputs.length > 0) {
      const outputs: string[] = [];
      for (const textOutput of textOutputs) {
        outputs.push(
          (await (
            await textOutput.getProperty('textContent')
          ).jsonValue()) as string
        );
      }

      return outputs;
    }

    return null;
  }

  /**
   * Whether the cell is in editing mode or not
   *
   * @param cellIndex Cell index
   * @returns Editing mode
   */
  async isCellInEditingMode(cellIndex: number): Promise<boolean> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return false;
    }

    const cellEditor = await cell.$('.jp-InputArea-editor');
    if (cellEditor) {
      return await cellEditor.evaluate(editor =>
        editor.classList.contains('jp-mod-focused')
      );
    }

    return false;
  }

  /**
   * Enter the editing mode on a given cell
   *
   * @param cellIndex Cell index
   * @returns Action success status
   */
  async enterCellEditingMode(cellIndex: number): Promise<boolean> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return false;
    }

    const cellEditor = await cell.$('.jp-Cell-inputArea');
    if (cellEditor) {
      let isMarkdown = false;
      const cellType = await this.getCellType(cellIndex);
      if (cellType === 'markdown') {
        const renderedMarkdown = await cell.$('.jp-MarkdownOutput');
        if (renderedMarkdown) {
          isMarkdown = true;
        }
      }

      if (isMarkdown) {
        await cellEditor.dblclick();
      }

      await cellEditor.click();

      return true;
    }

    return false;
  }

  /**
   * Leave the editing mode
   *
   * @param cellIndex Cell index
   * @returns Action success status
   */
  async leaveCellEditingMode(cellIndex: number): Promise<boolean> {
    if (await this.isCellInEditingMode(cellIndex)) {
      await this.page.keyboard.press('Escape');
      return true;
    }

    return false;
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

    const cell = await this.getCell(cellIndex);
    const gutters = await cell!.$$(
      '.cm-gutters > .cm-gutter.cm-breakpoint-gutter > .cm-gutterElement'
    );
    if (gutters.length < lineNumber) {
      return false;
    }
    await gutters[lineNumber].click();
    return true;
  }

  /**
   * Check if cell gutter is present
   *
   * @param cellIndex
   */
  async isCellGutterPresent(cellIndex: number): Promise<boolean> {
    const cell = await this.getCell(cellIndex);
    if (!cell) {
      return false;
    }
    return (await cell.$('.cm-gutters')) !== null;
  }

  /**
   * Wait until cell gutter is visible
   *
   * @param cellIndex
   */
  async waitForCellGutter(cellIndex: number): Promise<void> {
    const cell = await this.getCell(cellIndex);
    if (cell) {
      await this.page.waitForSelector('.cm-gutters', {
        state: 'attached'
      });
    }
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

    const panel = await this.activity.getPanel();
    await panel!.waitForSelector(
      '.cm-gutters > .cm-gutter.cm-breakpoint-gutter > .cm-gutterElement',
      { state: 'attached' }
    );
    const gutters = await panel!.$$(
      '.cm-gutters > .cm-gutter.cm-breakpoint-gutter > .cm-gutterElement'
    );
    if (gutters.length < lineNumber) {
      return false;
    }
    await gutters[lineNumber].click();
    return true;
  }

  /**
   * Check if code gutter is present
   *
   */
  async isCodeGutterPresent(): Promise<boolean> {
    const panel = await this.activity.getPanel();
    if (!panel) {
      return false;
    }
    return (await panel.$('.cm-gutters')) !== null;
  }

  /**
   * Wait until cell gutter is visible
   *
   * @param cellIndex
   */
  async waitForCodeGutter(): Promise<void> {
    const panel = await this.activity.getPanel();
    if (panel) {
      await this.page.waitForSelector('.cm-gutters', {
        state: 'attached'
      });
    }
  }

  /**
   * Select cells
   *
   * @param startIndex Start cell index
   * @param endIndex End cell index
   * @returns Action success status
   */
  async selectCells(startIndex: number, endIndex?: number): Promise<boolean> {
    const startCell = await this.getCell(startIndex);
    if (!startCell) {
      return false;
    }

    const clickPosition: any = { x: 15, y: 5 };

    await startCell.click({ position: clickPosition });

    if (endIndex !== undefined) {
      const endCell = await this.getCell(endIndex);
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

    await this.setCellType(cellIndex, cellType);

    if (
      !(await this.isCellSelected(cellIndex)) &&
      !(await this.selectCells(cellIndex))
    ) {
      return false;
    }

    await this.enterCellEditingMode(cellIndex);

    const keyboard = this.page.keyboard;
    await keyboard.press('Control+A');
    // give CodeMirror time to style properly
    await keyboard.type(source, { delay: cellType === 'code' ? 100 : 0 });

    await this.leaveCellEditingMode(cellIndex);

    // give CodeMirror time to style properly
    if (cellType === 'code') {
      await this.page.waitForTimeout(500);
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
    const nbPanel = await this.activity.getPanel();
    if (!nbPanel) {
      return false;
    }

    if ((await this.getCellType(cellIndex)) === cellType) {
      return false;
    }

    if (!(await this.selectCells(cellIndex))) {
      return false;
    }

    await this.clickToolbarItem('cellType');
    const selectInput = await nbPanel.$(
      'div.jp-Notebook-toolbarCellTypeDropdown select'
    );
    if (!selectInput) {
      return false;
    }

    await selectInput.selectOption(cellType);

    // Wait for the new cell to be rendered
    let cell: ElementHandle | null;
    let counter = 1;
    do {
      await this.page.waitForTimeout(50);
      cell = await this.getCell(cellIndex);
    } while (cell === null && counter++ < MAX_RETRIES);

    return true;
  }

  /**
   * Get the cell type of a cell
   *
   * @param cellIndex Cell index
   * @returns Cell type
   */
  async getCellType(cellIndex: number): Promise<nbformat.CellType | null> {
    const notebook = await this.getNotebookInPanel();
    if (!notebook) {
      return null;
    }

    const cell = await this.getCell(cellIndex);

    if (!cell) {
      return null;
    }

    const classList = await Utils.getElementClassList(cell);

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
   * Create a new notebook
   *
   * @param name Name of the notebook
   * @returns Name of the created notebook or null if it failed
   */
  async createNew(name?: string): Promise<string | null> {
    await this.menu.clickMenuItem('File>New>Notebook');

    const page = this.page;
    await page.waitForSelector('.jp-Dialog');
    await page.click('.jp-Dialog .jp-mod-accept');

    const activeTab = await this.activity.getTab();
    if (!activeTab) {
      return null;
    }

    const label = await activeTab.$('div.lm-TabBar-tabLabel');
    if (!label) {
      return null;
    }

    const assignedName = (await (
      await label.getProperty('textContent')
    ).jsonValue()) as string;

    if (!name) {
      return assignedName;
    }

    const currentDir = await this.filebrowser.getCurrentDirectory();
    await this.contents.renameFile(
      `${currentDir}/${assignedName}`,
      `${currentDir}/${name}`
    );
    const renamedTab = await this.activity.getTab(name);

    return renamedTab ? name : null;
  }

  private _runCallbacksExposed = 0;
}
