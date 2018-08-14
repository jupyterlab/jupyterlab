// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { toArray } from '@phosphor/algorithm';

import { PromiseDelegate } from '@phosphor/coreutils';

import { Widget } from '@phosphor/widgets';

import { Context } from '@jupyterlab/docregistry';

import { CodeCell, MarkdownCell } from '@jupyterlab/cells';

import { NotebookActions } from '@jupyterlab/notebook';

import { ToolbarItems } from '@jupyterlab/notebook';

import { INotebookModel } from '@jupyterlab/notebook';

import { NotebookPanel } from '@jupyterlab/notebook';

import {
  createNotebookContext,
  signalToPromise,
  sleep,
  NBTestUtils
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
        button.node.click();
        await promise;
        button.dispose();
      });

      it("should have the `'jp-SaveIcon'` class", () => {
        const button = ToolbarItems.createSaveButton(panel);
        expect(button.hasClass('jp-SaveIcon')).to.equal(true);
      });
    });

    describe('#createInsertButton()', () => {
      it('should insert below when clicked', () => {
        const button = ToolbarItems.createInsertButton(panel);
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.content.activeCellIndex).to.equal(1);
        expect(panel.content.activeCell).to.be.an.instanceof(CodeCell);
        button.dispose();
      });

      it("should have the `'jp-AddIcon'` class", () => {
        const button = ToolbarItems.createInsertButton(panel);
        expect(button.hasClass('jp-AddIcon')).to.equal(true);
      });
    });

    describe('#createCutButton()', () => {
      it('should cut when clicked', () => {
        const button = ToolbarItems.createCutButton(panel);
        const count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.content.widgets.length).to.equal(count - 1);
        expect(NBTestUtils.clipboard.hasData(JUPYTER_CELL_MIME)).to.equal(true);
        button.dispose();
      });

      it("should have the `'jp-CutIcon'` class", () => {
        const button = ToolbarItems.createCutButton(panel);
        expect(button.hasClass('jp-CutIcon')).to.equal(true);
      });
    });

    describe('#createCopyButton()', () => {
      it('should copy when clicked', () => {
        const button = ToolbarItems.createCopyButton(panel);
        const count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.content.widgets.length).to.equal(count);
        expect(NBTestUtils.clipboard.hasData(JUPYTER_CELL_MIME)).to.equal(true);
        button.dispose();
      });

      it("should have the `'jp-CopyIcon'` class", () => {
        const button = ToolbarItems.createCopyButton(panel);
        expect(button.hasClass('jp-CopyIcon')).to.equal(true);
      });
    });

    describe('#createPasteButton()', () => {
      it('should paste when clicked', async () => {
        const button = ToolbarItems.createPasteButton(panel);
        const count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        NotebookActions.copy(panel.content);
        button.node.click();
        await sleep();
        expect(panel.content.widgets.length).to.equal(count + 1);
        button.dispose();
      });

      it("should have the `'jp-PasteIcon'` class", () => {
        const button = ToolbarItems.createPasteButton(panel);
        expect(button.hasClass('jp-PasteIcon')).to.equal(true);
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
        button.node.click();
        await p.promise;
      });

      it("should have the `'jp-RunIcon'` class", () => {
        const button = ToolbarItems.createRunButton(panel);
        expect(button.hasClass('jp-RunIcon')).to.equal(true);
      });
    });

    describe('#createCellTypeItem()', () => {
      it('should track the cell type of the current cell', () => {
        const item = ToolbarItems.createCellTypeItem(panel);
        const node = item.node.getElementsByTagName(
          'select'
        )[0] as HTMLSelectElement;
        expect(node.value).to.equal('code');
        panel.content.activeCellIndex++;
        expect(node.value).to.equal('markdown');
      });

      it("should display `'-'` if multiple cell types are selected", () => {
        const item = ToolbarItems.createCellTypeItem(panel);
        const node = item.node.getElementsByTagName(
          'select'
        )[0] as HTMLSelectElement;
        expect(node.value).to.equal('code');
        panel.content.select(panel.content.widgets[1]);
        expect(node.value).to.equal('-');
      });

      it('should display the active cell type if multiple cells of the same type are selected', () => {
        const item = ToolbarItems.createCellTypeItem(panel);
        const node = item.node.getElementsByTagName(
          'select'
        )[0] as HTMLSelectElement;
        expect(node.value).to.equal('code');
        const cell = panel.model.contentFactory.createCodeCell({});
        panel.model.cells.insert(1, cell);
        panel.content.select(panel.content.widgets[1]);
        expect(node.value).to.equal('code');
      });
    });

    describe('#populateDefaults()', () => {
      it('should add the default items to the panel toolbar', () => {
        ToolbarItems.populateDefaults(panel);
        expect(toArray(panel.toolbar.names())).to.deep.equal([
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
