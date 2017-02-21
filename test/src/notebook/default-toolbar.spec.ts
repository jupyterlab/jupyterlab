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
} from '@phosphor/widgetwidget';

import {
  Context, DocumentRegistry
} from '../../../lib/docregistry';

import {
 CodeCellWidget, MarkdownCellWidget
} from '../../../lib/cells/widget';

import {
  NotebookActions
} from '../../../lib/notebook/actions';

import {
 ToolbarItems
} from '../../../lib/notebook/default-toolbar';

import {
 INotebookModel
} from '../../../lib/notebook/model';

import {
  JUPYTER_CELL_MIME
} from '../../../lib/notebook/widget';

import {
 NotebookPanel
} from '../../../lib/notebook/panel';

import {
 createInterruptButton,
 createKernelNameItem,
 createKernelStatusItem,
 createRestartButton
} from '../../../lib/toolbar/kernel';

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
      panel = new NotebookPanel({ rendermime, clipboard, contentFactory,
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
        NotebookActions.copy(panel.notebook, clipboard);
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
        let next = widget.widgets.at(1) as MarkdownCellWidget;
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

    describe('#createInterruptButton()', () => {

      it('should have the `\'jp-StopIcon\'` class', () => {
        let button = createInterruptButton(panel);
        expect(button.hasClass('jp-StopIcon')).to.be(true);
      });

    });

    describe('#createRestartButton()', () => {

      it('should have the `\'jp-RefreshIcon\'` class', () => {
        let button = createRestartButton(panel);
        expect(button.hasClass('jp-RefreshIcon')).to.be(true);
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
        panel.notebook.select(panel.notebook.widgets.at(1));
        expect(node.value).to.be('-');
      });

      it('should display the active cell type if multiple cells of the same type are selected', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        let cell = panel.model.contentFactory.createCodeCell({});
        panel.model.cells.insert(1, cell);
        panel.notebook.select(panel.notebook.widgets.at(1));
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

    describe('#createKernelNameItem()', () => {

      it('should display the `\'display_name\'` of the kernel', (done) => {
        let item = createKernelNameItem(panel);
        startKernel(context).then(kernel => {
          console.log('started kernel');
          return kernel.getSpec();
        }).then(spec => {
          let name = spec.display_name;
          expect(item.node.textContent).to.be(name);
          done();
        }).catch(done);
      });

      it('should display `\'No Kernel!\'` if there is no kernel', () => {
        let item = createKernelNameItem(panel);
        expect(item.node.textContent).to.be('No Kernel!');
      });

      it('should handle a change in context', (done) => {
        let item = createKernelNameItem(panel);
        startKernel(context).then(kernel => {
          console.log('started kernel');
          return kernel.ready;
        }).then(() => {
          panel.context = null;
          expect(item.node.textContent).to.be('No Kernel!');
          done();
        }).catch(done);
      });

    });

    describe('#createKernelStatusItem()', () => {

      beforeEach((done) => {
        startKernel(panel.context).then(() => {
          done();
        }).catch(done);
      });

      it('should display a busy status if the kernel status is not idle', (done) => {
        let item = createKernelStatusItem(panel);
        panel.kernel.statusChanged.connect(() => {
          if (panel.kernel.status === 'busy') {
            expect(item.hasClass('jp-mod-busy')).to.be(true);
            done();
          }
        });
        panel.kernel.requestExecute({ code: 'a = 1' });
      });

      it('should show the current status in the node title', (done) => {
        let item = createKernelStatusItem(panel);
        let status = panel.kernel.status;
        expect(item.node.title.toLowerCase()).to.contain(status);
        panel.kernel.statusChanged.connect(() => {
          if (panel.kernel.status === 'busy') {
            expect(item.node.title.toLowerCase()).to.contain('busy');
            done();
          }
        });
        panel.kernel.requestExecute({ code: 'a = 1' });
      });

      it('should handle a null kernel', (done) => {
        let item = createKernelStatusItem(panel);
        panel.context.changeKernel(void 0).then(() => {
          expect(item.node.title).to.be('No Kernel!');
          expect(item.hasClass('jp-mod-busy')).to.be(true);
          done();
        }).catch(done);
      });

      it('should handle a change to the context', () => {
        let item = createKernelStatusItem(panel);
        context = createNotebookContext();
        context.model.fromJSON(DEFAULT_CONTENT);
        panel.context = context;
        expect(item.node.title).to.be('No Kernel!');
        expect(item.hasClass('jp-mod-busy')).to.be(true);
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
