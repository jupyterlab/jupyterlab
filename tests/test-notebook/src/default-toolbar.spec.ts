// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';


import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  Context
} from '@jupyterlab/docregistry';

import {
 CodeCell, MarkdownCell
} from '@jupyterlab/cells';

import {
  NotebookActions
} from '@jupyterlab/notebook';

import {
 ToolbarItems
} from '@jupyterlab/notebook';

import {
 INotebookModel
} from '@jupyterlab/notebook';

import {
 NotebookPanel
} from '@jupyterlab/notebook';

import {
  createNotebookContext, moment
} from '../../utils';

import {
  DEFAULT_CONTENT, clipboard, createNotebookPanel
} from '../../notebook-utils';


const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';


describe('@jupyterlab/notebook', () => {

  describe('ToolbarItems', () => {

    let context: Context<INotebookModel>;
    let panel: NotebookPanel;

    beforeEach(async () => {
      context = await createNotebookContext();
      await context.initialize(true);
      panel = createNotebookPanel(context);
      context.model.fromJSON(DEFAULT_CONTENT);
    });

    afterEach(async () => {
      await context.session.shutdown();
      context.dispose();
      panel.dispose();
    });

    describe('#createSaveButton()', () => {

      it('should save when clicked', (done) => {
        let button = ToolbarItems.createSaveButton(panel);
        Widget.attach(button, document.body);
        context.fileChanged.connect(() => {
          button.dispose();
          done();
        });
        button.node.click();
      });

      it('should have the `\'jp-SaveIcon\'` class', () => {
        let button = ToolbarItems.createSaveButton(panel);
        expect(button.hasClass('jp-SaveIcon')).to.be(true);
      });

    });

    describe('#createInsertButton()', () => {

      it('should insert below when clicked', () => {
        let button = ToolbarItems.createInsertButton(panel);
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.content.activeCellIndex).to.be(1);
        expect(panel.content.activeCell).to.be.a(CodeCell);
        button.dispose();
      });

      it('should have the `\'jp-AddIcon\'` class', () => {
        let button = ToolbarItems.createInsertButton(panel);
        expect(button.hasClass('jp-AddIcon')).to.be(true);
      });

    });

    describe('#createCutButton()', () => {

      it('should cut when clicked', () => {
        let button = ToolbarItems.createCutButton(panel);
        let count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.content.widgets.length).to.be(count - 1);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(true);
        button.dispose();
      });

      it('should have the `\'jp-CutIcon\'` class', () => {
        let button = ToolbarItems.createCutButton(panel);
        expect(button.hasClass('jp-CutIcon')).to.be(true);
      });

    });

    describe('#createCopyButton()', () => {

      it('should copy when clicked', () => {
        let button = ToolbarItems.createCopyButton(panel);
        let count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.content.widgets.length).to.be(count);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(true);
        button.dispose();
      });

      it('should have the `\'jp-CopyIcon\'` class', () => {
        let button = ToolbarItems.createCopyButton(panel);
        expect(button.hasClass('jp-CopyIcon')).to.be(true);
      });

    });

    describe('#createPasteButton()', () => {

      it('should paste when clicked', async () => {
        let button = ToolbarItems.createPasteButton(panel);
        let count = panel.content.widgets.length;
        Widget.attach(button, document.body);
        NotebookActions.copy(panel.content);
        button.node.click();
        await moment();
        expect(panel.content.widgets.length).to.be(count + 1);
        button.dispose();
      });

      it('should have the `\'jp-PasteIcon\'` class', () => {
        let button = ToolbarItems.createPasteButton(panel);
        expect(button.hasClass('jp-PasteIcon')).to.be(true);
      });

    });

    describe('#createRunButton()', () => {

      it('should run and advance when clicked', async () => {
        let button = ToolbarItems.createRunButton(panel);
        let widget = panel.content;

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
            expect(mdCell.rendered).to.be(true);
            expect(widget.activeCellIndex).to.equal(2);
            button.dispose();
            p.resolve(0);
          }
        });
        button.node.click();
        await p.promise;
      });

      it('should have the `\'jp-RunIcon\'` class', () => {
        let button = ToolbarItems.createRunButton(panel);
        expect(button.hasClass('jp-RunIcon')).to.be(true);
      });

    });

    describe('#createStepButton()', () => {

      it('should have the `\'jp-StepIcon\'` class', () => {
        let button = ToolbarItems.createStepButton(panel);
        expect(button.hasClass('jp-StepIcon')).to.be(true);
      });

    });

    describe('#createCellTypeItem()', () => {

      it('should track the cell type of the current cell', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        panel.content.activeCellIndex++;
        expect(node.value).to.be('markdown');
      });

      it('should display `\'-\'` if multiple cell types are selected', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        panel.content.select(panel.content.widgets[1]);
        expect(node.value).to.be('-');
      });

      it('should display the active cell type if multiple cells of the same type are selected', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        let cell = panel.model.contentFactory.createCodeCell({});
        panel.model.cells.insert(1, cell);
        panel.content.select(panel.content.widgets[1]);
        expect(node.value).to.be('code');
      });

    });

    describe('#populateDefaults()', () => {

      it('should add the default items to the panel toolbar', () => {
        ToolbarItems.populateDefaults(panel);
        expect(toArray(panel.toolbar.names())).to.eql(['save', 'insert', 'cut',
          'copy', 'paste', 'run', 'interrupt', 'restart', 'cellType',
          'spacer', 'kernelName', 'kernelStatus']);
      });

    });

  });

});
