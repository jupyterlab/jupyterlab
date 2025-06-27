// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell, MarkdownCell } from '@jupyterlab/cells';
import { Context } from '@jupyterlab/docregistry';
import { KernelMessage } from '@jupyterlab/services';
import {
  acceptDialog,
  framePromise,
  signalToPromise,
  sleep
} from '@jupyterlab/testing';
import { PromiseDelegate } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';
import {
  INotebookModel,
  NotebookActions,
  NotebookPanel,
  ToolbarItems
} from '@jupyterlab/notebook';
import * as utils from './utils';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

describe('@jupyterlab/notebook', () => {
  describe('ToolbarItems', () => {
    describe('noKernel', () => {
      let context: Context<INotebookModel>;
      let panel: NotebookPanel;
      let originalClipboard: Clipboard;

      beforeEach(async () => {
        context = await utils.createMockContext();
        panel = utils.createNotebookPanel(context);
        panel.content.notebookConfig.windowingMode = 'none';
        context.model.fromJSON(utils.DEFAULT_CONTENT);
        originalClipboard = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: jest.fn().mockResolvedValue(undefined),
            readText: jest.fn().mockResolvedValue('mocked content')
          },
          writable: true
        });
      });

      afterEach(() => {
        panel.dispose();
        context.dispose();
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          writable: true
        });
      });

      describe('#createSaveButton()', () => {
        it('should save when clicked', async () => {
          const button = ToolbarItems.createSaveButton(panel);
          Widget.attach(button, document.body);
          const promise = signalToPromise(context.fileChanged);
          await framePromise();
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'click');
          await expect(promise).resolves.not.toThrow();
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
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'click');
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
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'click');
          await sleep();
          expect(panel.content.widgets.length).toBe(count - 1);
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
          const copied = JSON.parse(
            (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]
          );
          expect(copied.length).toBe(1);
          expect(copied[0].cell_type).toBe('code');
          expect(copied[0].source).toBe(
            [
              'import sys\n',
              "sys.stdout.write('hello world\\n')\n",
              'sys.stdout.flush()\n',
              'for i in range(3):\n',
              "    sys.stdout.write('%s\\n' % i)\n",
              '    sys.stdout.flush()\n',
              "sys.stderr.write('output to stderr\\n')\n",
              'sys.stderr.flush()\n',
              "sys.stdout.write('some more stdout text\\n')\n",
              'sys.stdout.flush()'
            ].join('')
          );
          expect(copied[0].metadata).toEqual({ tags: [] });
          expect(copied[0].outputs).toStrictEqual([
            {
              output_type: 'stream',
              name: 'stdout',
              text: ['hello world\n', '0\n', '1\n', '2\n'].join(',')
            },
            {
              output_type: 'stream',
              name: 'stderr',
              text: 'output to stderr\n'
            },
            {
              output_type: 'stream',
              name: 'stdout',
              text: 'some more stdout text\n'
            }
          ]);
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
        it('should copy when clicked in secure context', async () => {
          // secure context: use the native clipboard API
          (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(null);
          const button = ToolbarItems.createCopyButton(panel);
          const count = panel.content.widgets.length;
          Widget.attach(button, document.body);
          await framePromise();
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'click');
          expect(panel.content.widgets.length).toBe(count);
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
          const copied = JSON.parse(
            (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]
          );
          expect(copied.length).toBe(1);
          expect(copied[0].cell_type).toBe('code');
          expect(copied[0].source).toBe(
            [
              'import sys\n',
              "sys.stdout.write('hello world\\n')\n",
              'sys.stdout.flush()\n',
              'for i in range(3):\n',
              "    sys.stdout.write('%s\\n' % i)\n",
              '    sys.stdout.flush()\n',
              "sys.stderr.write('output to stderr\\n')\n",
              'sys.stderr.flush()\n',
              "sys.stdout.write('some more stdout text\\n')\n",
              'sys.stdout.flush()'
            ].join('')
          );
          expect(copied[0].metadata).toEqual({ tags: [] });
          expect(copied[0].outputs).toStrictEqual([
            {
              output_type: 'stream',
              name: 'stdout',
              text: ['hello world\n', '0\n', '1\n', '2\n'].join(',')
            },
            {
              output_type: 'stream',
              name: 'stderr',
              text: 'output to stderr\n'
            },
            {
              output_type: 'stream',
              name: 'stdout',
              text: 'some more stdout text\n'
            }
          ]);
          button.dispose();
        });

        it('should copy when clicked in insecure context', async () => {
          // insecure context: fallback to internal clipboard API
          (navigator.clipboard.writeText as jest.Mock).mockRejectedValue({
            name: 'NotAllowedError'
          });
          const button = ToolbarItems.createCopyButton(panel);
          const count = panel.content.widgets.length;
          Widget.attach(button, document.body);
          await framePromise();
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'click');
          expect(panel.content.widgets.length).toBe(count);
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
          await sleep();
          expect(
            (utils.systemClipboard as any).fallback.hasData(JUPYTER_CELL_MIME)
          ).toBe(true);
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
          (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(null);
          const button = ToolbarItems.createPasteButton(panel);
          const count = panel.content.widgets.length;
          Widget.attach(button, document.body);
          await framePromise();
          await button.renderPromise;
          await NotebookActions.copyToSystemClipboard(panel.content);
          // Ensure the readText returns the copied content
          const copied = (navigator.clipboard.writeText as jest.Mock).mock
            .calls[0][0];
          (navigator.clipboard.readText as jest.Mock).mockResolvedValue(copied);
          simulate(button.node.firstChild as HTMLElement, 'click');
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
          await item.renderPromise;
          const node = item.node.getElementsByTagName(
            'select'
          )[0] as HTMLSelectElement;
          expect(node.value).toBe('code');
          panel.content.activeCellIndex++;
          await framePromise();
          await item.renderPromise;
          expect(node.value).toBe('markdown');
          item.dispose();
        });

        it("should display `'-'` if multiple cell types are selected", async () => {
          const item = ToolbarItems.createCellTypeItem(panel);
          Widget.attach(item, document.body);
          await framePromise();
          await item.renderPromise;
          const node = item.node.getElementsByTagName(
            'select'
          )[0] as HTMLSelectElement;
          expect(node.value).toBe('code');
          panel.content.select(panel.content.widgets[1]);
          await framePromise();
          await item.renderPromise;
          expect(node.value).toBe('-');
          item.dispose();
        });

        it('should display the active cell type if multiple cells of the same type are selected', async () => {
          const item = ToolbarItems.createCellTypeItem(panel);
          Widget.attach(item, document.body);
          await framePromise();
          await item.renderPromise;
          const node = item.node.getElementsByTagName(
            'select'
          )[0] as HTMLSelectElement;
          expect(node.value).toBe('code');
          panel.model!.sharedModel.insertCell(0, { cell_type: 'code' });
          panel.content.select(panel.content.widgets[1]);
          await framePromise();
          await item.renderPromise;
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
            'kernelName'
          ]);
        });
      });
    });

    describe('kernelRequired', () => {
      let context: Context<INotebookModel>;
      let panel: NotebookPanel;

      beforeEach(async function () {
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
          await button.renderPromise;
          await context.sessionContext.session!.kernel!.info;

          const delegate = new PromiseDelegate();
          panel.sessionContext.iopubMessage.connect((_, msg) => {
            if (KernelMessage.isExecuteInputMsg(msg)) {
              delegate.resolve(void 0);
            }
          });
          simulate(button.node.firstChild as HTMLElement, 'click');
          await expect(delegate.promise).resolves.not.toThrow();
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
          await button.renderPromise;
          await panel.sessionContext.ready;
          const delegate = new PromiseDelegate();
          panel.sessionContext.iopubMessage.connect((_, msg) => {
            if (KernelMessage.isExecuteInputMsg(msg)) {
              delegate.resolve(void 0);
            }
          });
          simulate(button.node.firstChild as HTMLElement, 'click');
          await acceptDialog();
          await expect(delegate.promise).resolves.not.toThrow();
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
