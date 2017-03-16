// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel
} from '@jupyterlab/services';

import {
  toArray
} from '@phosphor/algorithm';

import {
  Widget
} from '@phosphor/widgets';

import {
  Context, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
 CodeCellWidget, MarkdownCellWidget
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
  JUPYTER_CELL_MIME
} from '@jupyterlab/notebook';

import {
 NotebookPanel
} from '@jupyterlab/notebook';

import {
  createNotebookContext
} from '../utils';

import {
  DEFAULT_CONTENT, createNotebookPanelFactory, rendermime, clipboard,
  mimeTypeService
} from './utils';


function startKernel(context: DocumentRegistry.IContext<INotebookModel>): Promise<Kernel.IKernel> {
  let kernel: Kernel.IKernel;
  return context.save().then(() => {
    return context.startDefaultKernel();
  }).then(k => {
    kernel = k;
    return kernel.ready;
  }).then(() => {
    return kernel;
  });
}


describe('notebook/notebook/default-toolbar', () => {

  let context: Context<INotebookModel>;

  beforeEach(() => {
    context = createNotebookContext();
  });

  afterEach(() => {
    context.dispose();
  });

  describe('ToolbarItems', () => {

    let panel: NotebookPanel;
    const contentFactory = createNotebookPanelFactory();

    beforeEach(() => {
      panel = new NotebookPanel({ rendermime, contentFactory,
                                  mimeTypeService });
      context.model.fromJSON(DEFAULT_CONTENT);
      panel.context = context;
    });

    afterEach(() => {
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
        expect(panel.notebook.activeCellIndex).to.be(1);
        expect(panel.notebook.activeCell).to.be.a(CodeCellWidget);
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
        let count = panel.notebook.widgets.length;
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.notebook.widgets.length).to.be(count - 1);
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
        let count = panel.notebook.widgets.length;
        Widget.attach(button, document.body);
        button.node.click();
        expect(panel.notebook.widgets.length).to.be(count);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(true);
        button.dispose();
      });

      it('should have the `\'jp-CopyIcon\'` class', () => {
        let button = ToolbarItems.createCopyButton(panel);
        expect(button.hasClass('jp-CopyIcon')).to.be(true);
      });

    });

    describe('#createPasteButton()', () => {

      it('should paste when clicked', (done) => {
        let button = ToolbarItems.createPasteButton(panel);
        let count = panel.notebook.widgets.length;
        Widget.attach(button, document.body);
        NotebookActions.copy(panel.notebook);
        button.node.click();
        requestAnimationFrame(() => {
          expect(panel.notebook.widgets.length).to.be(count + 1);
          button.dispose();
          done();
        });
      });

      it('should have the `\'jp-PasteIcon\'` class', () => {
        let button = ToolbarItems.createPasteButton(panel);
        expect(button.hasClass('jp-PasteIcon')).to.be(true);
      });

    });

    describe('#createRunButton()', () => {

      it('should run and advance when clicked', (done) => {
        let button = ToolbarItems.createRunButton(panel);
        let widget = panel.notebook;
        let next = widget.widgets[1] as MarkdownCellWidget;
        widget.select(next);
        let cell = widget.activeCell as CodeCellWidget;
        cell.model.outputs.clear();
        next.rendered = false;
        Widget.attach(button, document.body);
        startKernel(panel.context).then(kernel => {
          kernel.statusChanged.connect((sender, status) => {
            if (status === 'idle' && cell.model.outputs.length > 0) {
              expect(next.rendered).to.be(true);
              button.dispose();
              done();
            }
          });
          button.node.click();
        });
      });

      it('should have the `\'jp-RunIcon\'` class', () => {
        let button = ToolbarItems.createRunButton(panel);
        expect(button.hasClass('jp-RunIcon')).to.be(true);
      });

    });

    describe('#createCellTypeItem()', () => {

      it('should track the cell type of the current cell', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        panel.notebook.activeCellIndex++;
        expect(node.value).to.be('markdown');
      });

      it('should display `\'-\'` if multiple cell types are selected', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        panel.notebook.select(panel.notebook.widgets[1]);
        expect(node.value).to.be('-');
      });

      it('should display the active cell type if multiple cells of the same type are selected', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        let cell = panel.model.contentFactory.createCodeCell({});
        panel.model.cells.insert(1, cell);
        panel.notebook.select(panel.notebook.widgets[1]);
        expect(node.value).to.be('code');
      });

      it('should handle a change in context', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        context.model.fromJSON(DEFAULT_CONTENT);
        context.startDefaultKernel();
        panel.context = null;
        panel.notebook.activeCellIndex++;
        let node = item.node.getElementsByTagName('select')[0];
        expect((node as HTMLSelectElement).value).to.be('markdown');
      });

    });

    describe('#populateDefaults()', () => {

      it('should add the default items to the panel toolbar', () => {
        ToolbarItems.populateDefaults(panel);
        expect(toArray(panel.toolbar.names())).to.eql(['save', 'insert', 'cut',
          'copy', 'paste', 'run', 'interrupt', 'restart', 'cellType',
          'kernelName', 'kernelStatus']);
      });

    });

  });

});
