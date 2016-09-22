// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  IChangedArgs
} from '../../../../lib/common/interfaces';

import {
  IDocumentContext
} from '../../../../lib/docregistry';

import {
  CompleterWidget
} from '../../../../lib/completer';

import {
  INotebookModel, NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  NotebookPanel
} from '../../../../lib/notebook/notebook/panel';

import {
  Toolbar
} from '../../../../lib/toolbar';

import {
  Notebook
} from '../../../../lib/notebook/notebook/widget';

import {
  MockContext
} from '../../docmanager/mockcontext';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';

import {
  DEFAULT_CONTENT
} from '../utils';

import {
  CodeMirrorNotebookPanelRenderer
} from '../../../../lib/notebook/codemirror/notebook/panel';


/**
 * Default data.
 */
const rendermime = defaultRenderMime();
const clipboard = new MimeData();
const renderer = CodeMirrorNotebookPanelRenderer.defaultRenderer;


class LogNotebookPanel extends NotebookPanel {

  methods: string[] = [];

  protected onContextChanged(oldValue: IDocumentContext<INotebookModel>, newValue: IDocumentContext<INotebookModel>): void {
    super.onContextChanged(oldValue, newValue);
    this.methods.push('onContextChanged');
  }

  protected onModelStateChanged(sender: INotebookModel, args: IChangedArgs<any>): void {
    super.onModelStateChanged(sender, args);
    this.methods.push('onModelStateChanged');
  }

  protected onPathChanged(sender: IDocumentContext<INotebookModel>, path: string): void {
    super.onPathChanged(sender, path);
    this.methods.push('onPathChanged');
  }

  protected onPopulated(sender: IDocumentContext<INotebookModel>, args: void): void {
    super.onPopulated(sender, args);
    this.methods.push('onPopulated');
  }
}


function createPanel(): LogNotebookPanel {
  let panel = new LogNotebookPanel({ rendermime, clipboard, renderer });
  let model = new NotebookModel();
  model.fromJSON(DEFAULT_CONTENT);
  let context = new MockContext<NotebookModel>(model);
  panel.context = context;
  return panel;
}


describe('notebook/notebook/panel', () => {

  describe('NotebookPanel', () => {

    describe('#constructor()', () => {

      it('should create a notebook panel', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer});
        expect(panel).to.be.a(NotebookPanel);
      });


      it('should accept an optional render', () => {
        let newRenderer = new CodeMirrorNotebookPanelRenderer();
        let panel = new NotebookPanel({ rendermime, clipboard, renderer: newRenderer});
        expect(panel.renderer).to.be(newRenderer);
      });

    });

    describe('#contextChanged', () => {

      it('should be emitted when the context on the panel changes', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        let called = false;
        let model = new NotebookModel();
        let context = new MockContext<INotebookModel>(model);
        panel.contextChanged.connect((sender, args) => {
          expect(sender).to.be(panel);
          expect(args).to.be(void 0);
          called = true;
        });
        panel.context = context;
        expect(called).to.be(true);
      });

      it('should not be emitted if the context does not change', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        let called = false;
        let model = new NotebookModel();
        let context = new MockContext<INotebookModel>(model);
        panel.context = context;
        panel.contextChanged.connect(() => { called = true; });
        panel.context = context;
        expect(called).to.be(false);
      });

    });

    describe('#kernelChanged', () => {

      it('should be emitted when the kernel on the panel changes', () => {
        let panel = createPanel();
        let called = false;
        panel.kernelChanged.connect((sender, args) => {
          expect(sender).to.be(panel);
          expect(args).to.be.a(MockKernel);
          called = true;
        });
        panel.context.changeKernel({ name: 'python' });
        expect(called).to.be(true);
      });

    });

    describe('#toolbar', () => {

      it('should be the toolbar used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.toolbar).to.be.a(Toolbar);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(() => { panel.toolbar = null; }).to.throwError();
      });

    });

    describe('#content', () => {

      it('should be the content area used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.content).to.be.a(Notebook);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(() => { panel.content = null; }).to.throwError();
      });

    });

    describe('#kernel', () => {

      it('should be the current kernel used by the panel', () => {
        let panel = createPanel();
        expect(panel.kernel.name).to.be('python');
        panel.context.changeKernel({ name: 'shell' });
        expect(panel.kernel.name).to.be('shell');
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(() => { panel.kernel = null; }).to.throwError();
      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.rendermime).to.be(rendermime);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(() => { panel.rendermime = null; }).to.throwError();
      });

    });

    describe('#renderer', () => {

      it('should be the renderer used by the widget', () => {
        let renderer = new CodeMirrorNotebookPanelRenderer();
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.renderer).to.be(renderer);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(() => { panel.renderer = null; });
      });

    });

    describe('#clipboard', () => {

      it('should be the clipboard instance used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.clipboard).to.be(clipboard);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(() => { panel.clipboard = null; }).to.throwError();
      });

    });

    describe('#model', () => {

      it('should be the model for the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.model).to.be(null);
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.context = context;
        expect(panel.model).to.be(model);
        expect(panel.content.model).to.be(model);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(() => { panel.model = null; }).to.throwError();
      });

    });

    describe('#context', () => {

      it('should get the document context for the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.context).to.be(null);
      });

      it('should set the document context for the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.context = context;
        expect(panel.context).to.be(context);
      });

      it('should emit the `contextChanged` signal', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        let called = false;
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.contextChanged.connect(() => { called = true; });
        panel.context = context;
        expect(called).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.context = context;
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        panel.dispose();
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

    });

    describe('#onContextChanged()', () => {

      it('should be called when the context changes', () => {
        let panel = new LogNotebookPanel({ rendermime, clipboard, renderer });
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.methods = [];
        panel.context = context;
        expect(panel.methods).to.contain('onContextChanged');
      });

    });

    describe('#onPopulated()', () => {

      it('should initialize the model state', () => {
        let panel = new LogNotebookPanel({ rendermime, clipboard, renderer });
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.cells.canUndo).to.be(true);
        let context = new MockContext<NotebookModel>(model);
        panel.context = context;
        expect(panel.methods).to.contain('onPopulated');
        expect(model.cells.canUndo).to.be(false);
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should be called when the model state changes', () => {
        let panel = createPanel();
        panel.methods = [];
        panel.model.dirty = false;
        expect(panel.methods).to.contain('onModelStateChanged');
      });

      it('should update the title className based on the dirty state', () => {
        let panel = createPanel();
        panel.model.dirty = true;
        expect(panel.title.className).to.contain('jp-mod-dirty');
        panel.model.dirty = false;
        expect(panel.title.className).to.not.contain('jp-mod-dirty');
      });

    });

    describe('#onPathChanged()', () => {

      it('should be called when the path changes', () => {
        let panel = createPanel();
        panel.methods = [];
        panel.context.saveAs();
        expect(panel.methods).to.contain('onPathChanged');
      });

      it('should be called when the context changes', () => {
        let panel = new LogNotebookPanel({ rendermime, clipboard, renderer });
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.methods = [];
        panel.context = context;
        expect(panel.methods).to.contain('onPathChanged');
      });

      it('should update the title label', () => {
        let panel = createPanel();
        panel.methods = [];
        panel.context.saveAs();
        expect(panel.methods).to.contain('onPathChanged');
        expect(panel.title.label).to.be('foo');
      });

    });

    describe('.Renderer', () => {

      describe('#createContent()', () => {

        it('should create a notebook widget', () => {
          let renderer = new CodeMirrorNotebookPanelRenderer();
          expect(renderer.createContent(rendermime)).to.be.a(Notebook);
        });

      });

      describe('#createToolbar()', () => {

        it('should create a notebook toolbar', () => {
          let renderer = new CodeMirrorNotebookPanelRenderer();
          expect(renderer.createToolbar()).to.be.a(Toolbar);
        });

      });

      describe('#createCompleter()', () => {

        it('should create a completer widget', () => {
          let renderer = new CodeMirrorNotebookPanelRenderer();
          expect(renderer.createCompleter()).to.be.a(CompleterWidget);
        });

      });

    });

    describe('.defaultRenderer', () => {

      it('should be an instance of a `Renderer`', () => {
        expect(CodeMirrorNotebookPanelRenderer.defaultRenderer).to.be.a(NotebookPanel.Renderer);
      });

    });

  });

});
