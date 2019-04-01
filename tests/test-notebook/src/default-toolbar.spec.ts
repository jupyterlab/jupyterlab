// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { simulate } from 'simulate-event';

import { PromiseDelegate } from '@phosphor/coreutils';

import { Widget } from '@phosphor/widgets';

import { Context } from '@jupyterlab/docregistry';

import { CodeCell, MarkdownCell } from '@jupyterlab/cells';

import {
  INotebookModel,
  NotebookActions,
  NotebookPanel,
  ToolbarItems
} from '@jupyterlab/notebook';

import {
  createNotebookContext,
  signalToPromise,
  sleep,
  NBTestUtils,
  framePromise
} from '@jupyterlab/testutils';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

describe('@jupyterlab/notebook', () => {
  describe('ToolbarItems', () => {
    let context: Context<INotebookModel>;
    let panel: NotebookPanel;

    beforeEach(async () => {
      context = await createNotebookContext();
      await context.initialize(true);
      panel = NBTestUtils.createNotebookPanel(context);
      context.model.fromJSON(NBTestUtils.DEFAULT_CONTENT);
    });

    afterEach(async () => {
      await context.session.shutdown();
      context.dispose();
      panel.dispose();
    });

    describe('#createSaveButton()', () => {
      it('should save when clicked', async () => {
        const button = ToolbarItems.createSaveButton(panel);
        Widget.attach(button, document.body);
        let promise = signalToPromise(context.fileChanged);
        await framePromise();
        simulate(button.node.firstChild as HTMLElement, 'mousedown');
        await promise;
        button.dispose();
      });

      it("should have the `'jp-SaveIcon'` class", async () => {
        const button = ToolbarItems.createSaveButton(panel);
        Widget.attach(button, document.body);
        await framePromise();
        expect(button.node.querySelector('.jp-SaveIcon')).to.exist;
      });
    });

    describe('#createInsertButton()', () => {
      it('should insert below when clicked', async () => {
        const button = ToolbarItems.createInsertButton(panel);
        Widget.attach(button, document.body);
        await framePromise();
        simulate(button.node.firstChild as HTMLElement, 'mousedown');
        expect(panel.content.activeCellIndex).to.equal(1);
        expect(panel.content.activeCell).to.be.an.instanceof(CodeCell);
        button.dispose();
      });

      it("should have the `'jp-AddIcon'` class", async () => {
        const button = ToolbarItems.createInsertButton(panel);
        Widget.attach(button, document.body);
        await framePromise();
        expect(button.node.querySelector('.jp-AddIcon')).to.exist;
      });
    });

    describe('#createCutButton()', () => {
      it('should cut when clicked', async () => {
        const button = ToolbarItems.createCutButton(panel);
        const count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        await framePromise();
        simulate(button.node.firstChild as HTMLElement, 'mousedown');
        expect(panel.content.widgets.length).to.equal(count - 1);
        expect(NBTestUtils.clipboard.hasData(JUPYTER_CELL_MIME)).to.equal(true);
        button.dispose();
      });

      it("should have the `'jp-CutIcon'` class", async () => {
        const button = ToolbarItems.createCutButton(panel);
        Widget.attach(button, document.body);
        await framePromise();
        expect(button.node.querySelector('.jp-CutIcon')).to.exist;
      });
    });

    describe('#createCopyButton()', () => {
      it('should copy when clicked', async () => {
        const button = ToolbarItems.createCopyButton(panel);
        const count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        await framePromise();
        simulate(button.node.firstChild as HTMLElement, 'mousedown');
        expect(panel.content.widgets.length).to.equal(count);
        expect(NBTestUtils.clipboard.hasData(JUPYTER_CELL_MIME)).to.equal(true);
        button.dispose();
      });

      it("should have the `'jp-CopyIcon'` class", async () => {
        const button = ToolbarItems.createCopyButton(panel);
        Widget.attach(button, document.body);
        await framePromise();
        expect(button.node.querySelector('.jp-CopyIcon')).to.exist;
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
        expect(panel.content.widgets.length).to.equal(count + 1);
        button.dispose();
      });

      it("should have the `'jp-PasteIcon'` class", async () => {
        const button = ToolbarItems.createPasteButton(panel);
        Widget.attach(button, document.body);
        await framePromise();
        expect(button.node.querySelector('.jp-PasteIcon')).to.exist;
      });
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
        await context.ready;
        await context.session.ready;
        await context.session.kernel.ready;
        const p = new PromiseDelegate();
        context.session.statusChanged.connect((sender, status) => {
          // Find the right status idle message
          if (status === 'idle' && codeCell.model.outputs.length > 0) {
            expect(mdCell.rendered).to.equal(true);
            expect(widget.activeCellIndex).to.equal(2);
            button.dispose();
            p.resolve(0);
          }
        });
        await framePromise();
        simulate(button.node.firstChild as HTMLElement, 'mousedown');
        await p.promise;
      }).timeout(30000); // Allow for slower CI

      it("should have the `'jp-RunIcon'` class", async () => {
        const button = ToolbarItems.createRunButton(panel);
        Widget.attach(button, document.body);
        await framePromise();
        expect(button.node.querySelector('.jp-RunIcon')).to.exist;
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
        expect(node.value).to.equal('code');
        panel.content.activeCellIndex++;
        await framePromise();
        expect(node.value).to.equal('markdown');
      });

      it("should display `'-'` if multiple cell types are selected", async () => {
        const item = ToolbarItems.createCellTypeItem(panel);
        Widget.attach(item, document.body);
        await framePromise();
        const node = item.node.getElementsByTagName(
          'select'
        )[0] as HTMLSelectElement;
        expect(node.value).to.equal('code');
        panel.content.select(panel.content.widgets[1]);
        await framePromise();
        expect(node.value).to.equal('-');
      });

      it('should display the active cell type if multiple cells of the same type are selected', async () => {
        const item = ToolbarItems.createCellTypeItem(panel);
        Widget.attach(item, document.body);
        await framePromise();
        const node = item.node.getElementsByTagName(
          'select'
        )[0] as HTMLSelectElement;
        expect(node.value).to.equal('code');
        const cell = panel.model.contentFactory.createCodeCell({});
        panel.model.cells.insert(1, cell);
        panel.content.select(panel.content.widgets[1]);
        await framePromise();
        expect(node.value).to.equal('code');
      });
    });

    describe('#getDefaultItems()', () => {
      it('should return the default items of the panel toolbar', () => {
        const names = ToolbarItems.getDefaultItems(panel).map(
          item => item.name
        );
        expect(names).to.deep.equal([
          'save',
          'insert',
          'cut',
          'copy',
          'paste',
          'run',
          'interrupt',
          'restart',
          'cellType',
          'spacer',
          'kernelName',
          'kernelStatus'
        ]);
      });
    });
  });
});
