// Copyright (c) Jupyter Development Team.

import 'jest';

import { simulate } from 'simulate-event';

import { PromiseDelegate } from '@lumino/coreutils';

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
  initNotebookContext,
  signalToPromise,
  sleep,
  framePromise,
  acceptDialog,
  flakyIt as it
} from '@jupyterlab/testutils';

import { JupyterServer } from '@jupyterlab/testutils/lib/start_jupyter_server';

import * as utils from './utils';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

const server = new JupyterServer();

beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/notebook', () => {
  describe('ToolbarItems', () => {
    describe('noKernel', () => {
      let context: Context<INotebookModel>;
      let panel: NotebookPanel;

      beforeEach(async () => {
        context = await initNotebookContext();
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
        context = await initNotebookContext({ startKernel: true });
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
          const p = new PromiseDelegate();
          context.sessionContext.statusChanged.connect((sender, status) => {
            // Find the right status idle message
            if (status === 'idle' && codeCell.model.outputs.length > 0) {
              expect(mdCell.rendered).toBe(true);
              expect(widget.activeCellIndex).toBe(2);
              button.dispose();
              p.resolve(0);
            }
          });
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          await p.promise;
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
          jest.setTimeout(40000);
          const button = ToolbarItems.createRestartRunAllButton(panel);
          const widget = panel.content;

          // Clear the first two cells.
          const codeCell = widget.widgets[0] as CodeCell;
          codeCell.model.outputs.clear();
          const mdCell = widget.widgets[1] as MarkdownCell;
          mdCell.rendered = false;

          Widget.attach(button, document.body);
          const p = new PromiseDelegate();
          context.sessionContext.statusChanged.connect((sender, status) => {
            // Find the right status idle message
            if (status === 'idle' && codeCell.model.outputs.length > 0) {
              expect(
                widget.widgets
                  .filter(cell => cell.model.type === 'markdown')
                  .every(cell => (cell as MarkdownCell).rendered)
              );
              expect(widget.activeCellIndex).toBe(
                widget.widgets.filter(cell => cell.model.type === 'code').length
              );
              button.dispose();
              p.resolve(0);
            }
          });
          await context.sessionContext.ready;
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          await acceptDialog();
          await p.promise;
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
