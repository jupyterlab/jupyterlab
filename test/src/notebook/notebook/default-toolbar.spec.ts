// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MimeData
} from 'phosphor-dragdrop';

import {
 CodeCellWidget, MarkdownCellWidget
} from '../../../../lib/notebook/cells/widget';

import {
  JUPYTER_CELL_MIME, NotebookActions
} from '../../../../lib/notebook/notebook/actions';

import {
 ToolbarItems
} from '../../../../lib/notebook/notebook/default-toolbar';

import {
 NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
 NotebookPanel
} from '../../../../lib/notebook/notebook/panel';

import {
  MockContext
} from '../../docmanager/mockcontext';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';

import {
  acceptDialog
} from '../../utils';

import {
  DEFAULT_CONTENT
} from '../utils';


/**
 * Default data.
 */
const rendermime = defaultRenderMime();
const clipboard = new MimeData();


describe('notebook/notebook/default-toolbar', () => {

  describe('TooolbarItems', () => {

    let panel: NotebookPanel;
    let context: MockContext<NotebookModel>;

    beforeEach(() => {
      panel = new NotebookPanel({ rendermime, clipboard });
      let model = new NotebookModel();
      model.fromJSON(DEFAULT_CONTENT);
      context = new MockContext<NotebookModel>(model);
      context.changeKernel({ name: 'python' });
      panel.context = context;
      return panel;
    });

    afterEach(() => {
      panel.dispose();
    });

    describe('#createSaveButton()', () => {

      it('should save when clicked', () => {
        let button = ToolbarItems.createSaveButton(panel);
        button.attach(document.body);
        button.node.click();
        expect(context.methods).to.contain('save');
        button.dispose();
      });

      it("should have the `'jp-NBToolbar-save'` class", () => {
        let button = ToolbarItems.createSaveButton(panel);
        expect(button.hasClass('jp-NBToolbar-save')).to.be(true);
      });

    });

    describe('#createInsertButton()', () => {

      it('should insert below when clicked', () => {
        let button = ToolbarItems.createInsertButton(panel);
        button.attach(document.body);
        button.node.click();
        expect(panel.content.activeCellIndex).to.be(1);
        expect(panel.content.activeCell).to.be.a(CodeCellWidget);
        button.dispose();
      });

      it("should have the `'jp-NBToolbar-insert'` class", () => {
        let button = ToolbarItems.createInsertButton(panel);
        expect(button.hasClass('jp-NBToolbar-insert')).to.be(true);
      });

    });

    describe('#createCutButton()', () => {

      it('should cut when clicked', () => {
        let button = ToolbarItems.createCutButton(panel);
        let count = panel.content.childCount();
        button.attach(document.body);
        button.node.click();
        expect(panel.content.childCount()).to.be(count - 1);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(true);
        button.dispose();
      });

      it("should have the `'jp-NBToolbar-cut'` class", () => {
        let button = ToolbarItems.createCutButton(panel);
        expect(button.hasClass('jp-NBToolbar-cut')).to.be(true);
      });

    });

    describe('#createCopyButton()', () => {

      it('should copy when clicked', () => {
        let button = ToolbarItems.createCopyButton(panel);
        let count = panel.content.childCount();
        button.attach(document.body);
        button.node.click();
        expect(panel.content.childCount()).to.be(count);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(true);
        button.dispose();
      });

      it("should have the `'jp-NBToolbar-copy'` class", () => {
        let button = ToolbarItems.createCopyButton(panel);
        expect(button.hasClass('jp-NBToolbar-copy')).to.be(true);
      });

    });

    describe('#createPasteButton()', () => {

      it('should paste when clicked', () => {
        let button = ToolbarItems.createPasteButton(panel);
        let count = panel.content.childCount();
        button.attach(document.body);
        NotebookActions.copy(panel.content, clipboard);
        button.node.click();
        expect(panel.content.childCount()).to.be(count + 1);
        button.dispose();
      });

      it("should have the `'jp-NBToolbar-paste'` class", () => {
        let button = ToolbarItems.createPasteButton(panel);
        expect(button.hasClass('jp-NBToolbar-paste')).to.be(true);
      });

    });

    describe('#createRunButton()', () => {

      it('should run and advance when clicked', (done) => {
        let button = ToolbarItems.createRunButton(panel);

        let widget = panel.content;
        let next = widget.childAt(1) as MarkdownCellWidget;
        widget.select(next);
        let cell = widget.activeCell as CodeCellWidget;
        cell.model.outputs.clear();
        next.rendered = false;

        button.attach(document.body);
        button.node.click();

        Promise.resolve(void 0).then(() => {
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
          button.dispose();
          done();
        });
      });

      it("should have the `'jp-NBToolbar-run'` class", () => {
        let button = ToolbarItems.createRunButton(panel);
        expect(button.hasClass('jp-NBToolbar-run')).to.be(true);
      });

    });

    describe('#createInterruptButton()', () => {

      it('should interrupt the kernel when clicked', (done) => {
        let button = ToolbarItems.createInterruptButton(panel);
        button.attach(document.body);
        button.node.click();
        expect(panel.context.kernel.status).to.be('busy');
        Promise.resolve(void 0).then(() => {
          expect(panel.context.kernel.status).to.be('idle');
          button.dispose();
          done();
        });
      });

      it("should have the `'jp-NBToolbar-interrupt'` class", () => {
        let button = ToolbarItems.createInterruptButton(panel);
        expect(button.hasClass('jp-NBToolbar-interrupt')).to.be(true);
      });

    });

    describe('#createRestartButton()', () => {

      it('should restart the kernel when the dialog is accepted', (done) => {
        let button = ToolbarItems.createRestartButton(panel);
        button.node.style.minHeight = '10px';
        button.node.style.minWidth = '10px';
        panel.node.style.minHeight = '300px';
        panel.node.style.minWidth = '300px';
        panel.attach(document.body);
        button.attach(document.body);
        button.node.click();
        acceptDialog(panel.node).then(() => {
          expect(context.kernel.status).to.be('restarting');
          panel.dispose();
          button.dispose();
          done();
        });
      });

      it("should have the `'jp-NBToolbar-restart'` class", () => {
        let button = ToolbarItems.createRestartButton(panel);
        expect(button.hasClass('jp-NBToolbar-restart')).to.be(true);
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

      it("should display `'-'` if multiple cell types are selected", () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        panel.content.select(panel.content.childAt(1));
        expect(node.value).to.be('-');
      });

      it('should display the active cell type if multiple cells of the same type are selected', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('code');
        let cell = panel.model.factory.createCodeCell();
        panel.model.cells.insert(1, cell);
        panel.content.select(panel.content.childAt(1));
        expect(node.value).to.be('code');
      });

      it('should handle a change in context', () => {
        let item = ToolbarItems.createCellTypeItem(panel);
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        context = new MockContext<NotebookModel>(model);
        context.changeKernel({ name: 'python' });
        panel.context = context;
        panel.content.activeCellIndex++;
        let node = item.node.getElementsByTagName('select')[0] as HTMLSelectElement;
        expect(node.value).to.be('markdown');
      });

    });

    describe('#createKernelNameItem()', () => {

      it("should display the `'display_name`' of the current kernel", (done) => {
        let item = ToolbarItems.createKernelNameItem(panel);
        panel.kernel.getKernelSpec().then(spec => {
          expect(item.node.textContent).to.be(spec.display_name);
          done();
        });
      });

      it("should display `'No Kernel!'` if there is no kernel", () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        context = new MockContext<NotebookModel>(model);
        panel.context = context;
        let item = ToolbarItems.createKernelNameItem(panel);
        expect(item.node.textContent).to.be('No Kernel!');
      });

      it('should handle a change in kernel', (done) => {
        let item = ToolbarItems.createKernelNameItem(panel);
        panel.context.changeKernel({ name: 'shell' }).then(kernel => {
          kernel.getKernelSpec().then(spec => {
            expect(item.node.textContent).to.be(spec.display_name);
            done();
          });
        });
      });

      it('should handle a change in context', () => {
        let item = ToolbarItems.createKernelNameItem(panel);
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        context = new MockContext<NotebookModel>(model);
        panel.context = context;
        expect(item.node.textContent).to.be('No Kernel!');
      });

    });

    describe('#createKernelStatusItem()', () => {

      it('should display a busy status if the kernel status is not idle', (done) => {
        let item = ToolbarItems.createKernelStatusItem(panel);
        expect(item.hasClass('jp-mod-busy')).to.be(true);
        panel.kernel.statusChanged.connect(() => {
          if (panel.kernel.status === 'idle') {
            expect(item.hasClass('jp-mod-busy')).to.be(false);
            done();
          }
        });
      });

      it('should show the current status in the node title', (done) => {
        let item = ToolbarItems.createKernelStatusItem(panel);
        let status = panel.kernel.status;
        expect(item.node.title.toLowerCase()).to.contain(status);
        panel.kernel.statusChanged.connect(() => {
          if (panel.kernel.status === 'idle') {
            expect(item.node.title.toLowerCase()).to.contain('idle');
            done();
          }
        });
      });

      it('should handle a change to the kernel', (done) => {
        let item = ToolbarItems.createKernelStatusItem(panel);
        panel.context.changeKernel({ name: 'shell' });
        panel.kernel.statusChanged.connect(() => {
          if (panel.kernel.status === 'idle') {
            expect(item.hasClass('jp-mod-busy')).to.be(false);
            done();
          }
        });
      });

      it('should handle a change to the context', (done) => {
        let item = ToolbarItems.createKernelStatusItem(panel);
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        context = new MockContext<NotebookModel>(model);
        context.changeKernel({ name: 'python' });
        panel.context = context;
        panel.kernel.statusChanged.connect(() => {
          if (panel.kernel.status === 'idle') {
            expect(item.hasClass('jp-mod-busy')).to.be(false);
            done();
          }
        });
      });

    });

    describe('#populateDefaults()', () => {

      it('should add the default items to the panel toolbar', () => {
        ToolbarItems.populateDefaults(panel);
        expect(panel.toolbar.list()).to.eql(['save', 'insert', 'cut',
          'copy', 'paste', 'run', 'interrupt', 'restart', 'cellType',
          'kernelName', 'kernelStatus']);
      });

    });

  });

});
