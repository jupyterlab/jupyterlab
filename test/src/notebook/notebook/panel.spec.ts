// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  MimeData
} from 'phosphor-dragdrop';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  IDocumentContext
} from '../../../../lib/docregistry';

import {
  CellEditorWidget, ITextChange, ICompletionRequest
} from '../../../../lib/notebook/cells/editor';

import {
  CompletionWidget
} from '../../../../lib/notebook/completion';

import {
  INotebookModel, NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  NotebookPanel
} from '../../../../lib/notebook/notebook/panel';

import {
  NotebookToolbar
} from '../../../../lib/notebook/notebook/toolbar';

import {
  Notebook
} from '../../../../lib/notebook/notebook/widget';

import {
  MockContext
} from '../../docmanager/mockcontext';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';


/**
 * Default rendermime and clipboard instances.
 */
const rendermime = defaultRenderMime();
const clipboard = new MimeData();


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

  protected onContentStateChanged(sender: Notebook, args: IChangedArgs<any>): void {
    super.onContentStateChanged(sender, args);
    this.methods.push('onContentStateChanged');
  }

  protected onTextChanged(editor: CellEditorWidget, change: ITextChange): void {
    super.onTextChanged(editor, change);
    this.methods.push('onTextChanged');
  }

  protected onCompletionRequested(editor: CellEditorWidget, change: ICompletionRequest): void {
    super.onCompletionRequested(editor, change);
    this.methods.push('onCompletionRequested');
  }

  protected onCompletionSelected(widget: CompletionWidget, value: string): void {
    super.onCompletionSelected(widget, value);
    this.methods.push('onCompletionSelected');
  }
}


function createPanel(): LogNotebookPanel {
  let panel = new LogNotebookPanel({ rendermime, clipboard });
  let model = new NotebookModel();
  let context = new MockContext<NotebookModel>(model);
  panel.context = context;
  return panel;
}


describe('notebook/notebook/panel', () => {

  describe('NotebookPanel', () => {

    describe('#constructor()', () => {

      it('should create a notebook panel', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(panel).to.be.a(NotebookPanel);
      });


      it('should accept an optional render', () => {
        let renderer = new NotebookPanel.Renderer();
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.renderer).to.be(renderer);
      });

    });

    describe('#contextChanged', () => {

      it('should be emitted when the context on the panel changes', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
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
        let panel = new NotebookPanel({ rendermime, clipboard });
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

      it('should not be emitted when the kernel does not change', () => {
        let panel = createPanel();
        let called = false;
        panel.kernelChanged.connect(() => { called = true; });
        let context = new MockContext<INotebookModel>(panel.model);
        panel.context = context;
        expect(called).to.be(false);
      });

    });

    describe('#toolbar', () => {

      it('should be the toolbar used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(panel.toolbar).to.be.a(NotebookToolbar);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(() => { panel.toolbar = null; }).to.throwError();
      });

    });

    describe('#content', () => {

      it('should be the content area used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(panel.content).to.be.a(Notebook);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(() => { panel.content = null; }).to.throwError();
      });

    });

    describe('#kernel', () => {

      it('should be the current kernel used by the panel', () => {
        let panel = createPanel();
        expect(panel.kernel).to.be(null);
        panel.context.changeKernel({ name: 'python' });
        expect(panel.kernel.name).to.be('python');
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(() => { panel.kernel = null; }).to.throwError();
      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(panel.rendermime).to.be(rendermime);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(() => { panel.rendermime = null; }).to.throwError();
      });

    });

    describe('#renderer', () => {

      it('should be the renderer used by the widget', () => {
        let renderer = new NotebookPanel.Renderer();
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        expect(panel.renderer).to.be(renderer);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(() => { panel.renderer = null; });
      });

    });

    describe('#clipboard', () => {

      it('should be the clipboard instance used by the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(panel.clipboard).to.be(clipboard);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(() => { panel.clipboard = null; }).to.throwError();
      });

    });

    describe('#model', () => {

      it('should be the model for the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(panel.model).to.be(null);
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.context = context;
        expect(panel.model).to.be(model);
        expect(panel.content.model).to.be(model);
      });

      it('should be read-only', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(() => { panel.model = null; }).to.throwError();
      });

    });

    describe('#context', () => {

      it('should get the document context for the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        expect(panel.context).to.be(null);
      });

      it('should set the document context for the widget', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.context = context;
        expect(panel.context).to.be(context);
      });

      it('should emit the `contextChanged` signal', () => {
        let panel = new NotebookPanel({ rendermime, clipboard });
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
        let panel = new NotebookPanel({ rendermime, clipboard });
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        panel.context = context;
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

      // it('should be safe to call more than once', () => {
      //   let panel = new NotebookPanel({ rendermime, clipboard });
      //   panel.dispose();
      //   panel.dispose();
      //   expect(panel.isDisposed).to.be(true);
      // });

    });

    describe('#onContextChanged()', () => {

      it('should be called when the context changes', () => {
        //let panel = createPanel();

      });

    });

    describe('#onKernelChanged()', () => {

      it('should be called when the kernel changes', () => {

      });

    });

    describe('#onModelStateChanged()', () => {

      it('should be called when the model state changes', () => {

      });

    });

    describe('#onPathChanged()', () => {

      it('should be called when the path changes', () => {

      });

    });

    describe('#onContentStateChanged()', () => {

      it('should be called when the content state changes', () => {

      });

    });

    describe('#onTextChanged()', () => {

      it('should be called on a text changed signal from the current editor', () => {

      });

    });

    describe('#onCompletionRequested()', () => {

      it('should be called on a `completionRequested` signal from the current editor', () => {

      });

    });

    describe('#onCompletionSelected()', () => {

      it('should be called on a `completionSelected` signal from the completion widget', () => {

      });

    });

    describe('.Renderer', () => {

      describe('#createContent()', () => {

      });

      describe('#createToolbar()', () => {

      });

      describe('#createCompletion()', () => {

      });

    });

  });

});
