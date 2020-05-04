// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { simulate } from 'simulate-event';

import { Widget } from '@lumino/widgets';

import { Context } from '@jupyterlab/docregistry';

import { CodeCell, MarkdownCell } from '@jupyterlab/cells';

import {
  INotebookModel,
  NotebookActions,
  NotebookPanel,
  ToolbarItems
} from '../src';

import {
  signalToPromise,
  sleep,
  framePromise,
  acceptDialog
} from '@jupyterlab/testutils';

import * as utils from './utils';
import { PromiseDelegate } from '@lumino/coreutils';
import { KernelMessage } from '@jupyterlab/services';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

describe('@jupyterlab/notebook', () => {
  describe('ToolbarItems', () => {
    describe('noKernel', () => {
      let context: Context<INotebookModel>;
      let panel: NotebookPanel;

      beforeEach(async () => {
        context = await utils.createMockContext();
        panel = utils.createNotebookPanel(context);
        context.model.fromJSON(utils.DEFAULT_CONTENT);
      });

      afterEach(() => {
        panel.dispose();
        context.dispose();
      });

      describe('#createSaveButton()', () => {
        it('should save when clicked', async () => {
          const button = ToolbarItems.createSaveButton(panel);
          Widget.attach(button, document.body);
          const promise = signalToPromise(context.fileChanged);
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          await promise;
          button.dispose();
        });

        it("should add an inline svg node with the 'save' icon", async () => {
          const button = ToolbarItems.createSaveButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          expect(
            button.node.querySelector("[data-icon$='save']")
          ).toBeDefined();
        });
      });

      describe('#createInsertButton()', () => {
        it('should insert below when clicked', async () => {
          const button = ToolbarItems.createInsertButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          expect(panel.content.activeCellIndex).toBe(1);
          expect(panel.content.activeCell).toBeInstanceOf(CodeCell);
          button.dispose();
        });

        it("should add an inline svg node with the 'add' icon", async () => {
          const button = ToolbarItems.createInsertButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          expect(button.node.querySelector("[data-icon$='add']")).toBeDefined();
          button.dispose();
        });
      });

      describe('#createCutButton()', () => {
        it('should cut when clicked', async () => {
          const button = ToolbarItems.createCutButton(panel);
          const count = panel.content.widgets.length;
          Widget.attach(button, document.body);
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          expect(panel.content.widgets.length).toBe(count - 1);
          expect(utils.clipboard.hasData(JUPYTER_CELL_MIME)).toBe(true);
          button.dispose();
        });

        it("should add an inline svg node with the 'cut' icon", async () => {
          const button = ToolbarItems.createCutButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          expect(button.node.querySelector("[data-icon$='cut']")).toBeDefined();
          button.dispose();
        });
      });

      describe('#createCopyButton()', () => {
        it('should copy when clicked', async () => {
          const button = ToolbarItems.createCopyButton(panel);
          const count = panel.content.widgets.length;
          Widget.attach(button, document.body);
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          expect(panel.content.widgets.length).toBe(count);
          expect(utils.clipboard.hasData(JUPYTER_CELL_MIME)).toBe(true);
          button.dispose();
        });

        it("should add an inline svg node with the 'copy' icon", async () => {
          const button = ToolbarItems.createCopyButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          expect(
            button.node.querySelector("[data-icon$='copy']")
          ).toBeDefined();
          button.dispose();
        });
      });

      describe('#createPasteButton()', () => {
        it('should paste when clicked', async () => {
          const button = ToolbarItems.createPasteButton(panel);
          const count = panel.content.widgets.length;
          Widget.attach(button, document.body);
          await framePromise();
          NotebookActions.copy(panel.content);
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          await sleep();
          expect(panel.content.widgets.length).toBe(count + 1);
          button.dispose();
        });

        it("should add an inline svg node with the 'paste' icon", async () => {
          const button = ToolbarItems.createPasteButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          expect(
            button.node.querySelector("[data-icon$='paste']")
          ).toBeDefined();
          button.dispose();
        });
      });

      describe('#createCellTypeItem()', () => {
        it('should track the cell type of the current cell', async () => {
          const item = ToolbarItems.createCellTypeItem(panel);
          Widget.attach(item, document.body);
          await framePromise();
          const node = item.node.getElementsByTagName(
            'select'
          )[0] as HTMLSelectElement;
          expect(node.value).toBe('code');
          panel.content.activeCellIndex++;
          await framePromise();
          expect(node.value).toBe('markdown');
          item.dispose();
        });

        it("should display `'-'` if multiple cell types are selected", async () => {
          const item = ToolbarItems.createCellTypeItem(panel);
          Widget.attach(item, document.body);
          await framePromise();
          const node = item.node.getElementsByTagName(
            'select'
          )[0] as HTMLSelectElement;
          expect(node.value).toBe('code');
          panel.content.select(panel.content.widgets[1]);
          await framePromise();
          expect(node.value).toBe('-');
          item.dispose();
        });

        it('should display the active cell type if multiple cells of the same type are selected', async () => {
          const item = ToolbarItems.createCellTypeItem(panel);
          Widget.attach(item, document.body);
          await framePromise();
          const node = item.node.getElementsByTagName(
            'select'
          )[0] as HTMLSelectElement;
          expect(node.value).toBe('code');
          const cell = panel.model!.contentFactory.createCodeCell({});
          panel.model!.cells.insert(1, cell);
          panel.content.select(panel.content.widgets[1]);
          await framePromise();
          expect(node.value).toBe('code');
          item.dispose();
        });
      });

      describe('#getDefaultItems()', () => {
        it('should return the default items of the panel toolbar', () => {
          const names = ToolbarItems.getDefaultItems(panel).map(item => {
            const name = item.name;
            item.widget.dispose();
            return name;
          });
          expect(names).toEqual([
            'save',
            'insert',
            'cut',
            'copy',
            'paste',
            'run',
            'interrupt',
            'restart',
            'restart-and-run',
            'cellType',
            'spacer',
            'kernelName',
            'kernelStatus'
          ]);
        });
      });
    });

    describe('kernelRequired', () => {
      let context: Context<INotebookModel>;
      let panel: NotebookPanel;

      beforeEach(async function() {
        context = await utils.createMockContext(true);
        panel = utils.createNotebookPanel(context);
        context.model.fromJSON(utils.DEFAULT_CONTENT);
      });

      afterEach(async () => {
        await context.sessionContext.shutdown();
        panel.dispose();
        context.dispose();
      });

      describe('#createRunButton()', () => {
        it('should run and advance when clicked', async () => {
          const button = ToolbarItems.createRunButton(panel);
          const widget = panel.content;

          // Clear and select the first two cells.
          const codeCell = widget.widgets[0] as CodeCell;
          codeCell.model.outputs.clear();
          widget.select(codeCell);
          const mdCell = widget.widgets[1] as MarkdownCell;
          mdCell.rendered = false;
          widget.select(mdCell);

          Widget.attach(button, document.body);
          await context.sessionContext.session!.kernel!.info;

          const delegate = new PromiseDelegate();
          panel.sessionContext.iopubMessage.connect((_, msg) => {
            if (KernelMessage.isExecuteInputMsg(msg)) {
              delegate.resolve(void 0);
            }
          });
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          await delegate.promise;
          button.dispose();
        });

        it("should add an inline svg node with the 'run' icon", async () => {
          const button = ToolbarItems.createRunButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          expect(button.node.querySelector("[data-icon$='run']")).toBeDefined();
        });
      });

      describe('#createRestartRunAllButton()', () => {
        it('should restart and run all when clicked', async () => {
          const button = ToolbarItems.createRestartRunAllButton(panel);
          const widget = panel.content;

          // Clear the first two cells.
          const codeCell = widget.widgets[0] as CodeCell;
          codeCell.model.outputs.clear();
          const mdCell = widget.widgets[1] as MarkdownCell;
          mdCell.rendered = false;

          Widget.attach(button, document.body);
          await panel.sessionContext.ready;
          const delegate = new PromiseDelegate();
          panel.sessionContext.iopubMessage.connect((_, msg) => {
            if (KernelMessage.isExecuteInputMsg(msg)) {
              delegate.resolve(void 0);
            }
          });
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          await acceptDialog();
          await delegate.promise;
          button.dispose();
        });

        it("should add an inline svg node with the 'fast-forward' icon", async () => {
          const button = ToolbarItems.createRestartRunAllButton(panel);
          Widget.attach(button, document.body);
          await framePromise();
          expect(
            button.node.querySelector("[data-icon$='fast-forward']")
          ).toBeDefined();
        });
      });
    });
  });
});
