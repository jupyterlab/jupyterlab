// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  IChangedArgs
} from '@jupyterlab/coreutils';

import {
  DocumentRegistry, Context
} from '@jupyterlab/docregistry';

import {
  INotebookModel, NotebookPanel, Notebook
} from '@jupyterlab/notebook';

import {
  Toolbar
} from '@jupyterlab/apputils';

import {
  createNotebookContext
} from '../utils';

import {
  DEFAULT_CONTENT, createNotebookPanelFactory, rendermime,
  mimeTypeService, editorFactory
} from './utils';


/**
 * Default data.
 */
const contentFactory = createNotebookPanelFactory();
const options = { rendermime, mimeTypeService, contentFactory };


class LogNotebookPanel extends NotebookPanel {

  methods: string[] = [];

  protected onContextChanged(oldValue: DocumentRegistry.IContext<INotebookModel>, newValue: DocumentRegistry.IContext<INotebookModel>): void {
    super.onContextChanged(oldValue, newValue);
    this.methods.push('onContextChanged');
  }

  protected onModelStateChanged(sender: INotebookModel, args: IChangedArgs<any>): void {
    super.onModelStateChanged(sender, args);
    this.methods.push('onModelStateChanged');
  }

  protected onPathChanged(sender: DocumentRegistry.IContext<INotebookModel>, path: string): void {
    super.onPathChanged(sender, path);
    this.methods.push('onPathChanged');
  }
}


function createPanel(context: Context<INotebookModel>): LogNotebookPanel {
  let panel = new LogNotebookPanel(options);
  context.model.fromJSON(DEFAULT_CONTENT);
  panel.context = context;
  return panel;
}


describe('notebook/notebook/panel', () => {

  let context: Context<INotebookModel>;
  let manager: ServiceManager.IManager;

  before((done) => {
    manager = new ServiceManager();
    manager.ready.then(done, done);
  });

  beforeEach(() => {
    context = createNotebookContext('', manager);
  });

  afterEach(() => {
    context.dispose();
  });

  after(() => {
    manager.dispose();
  });

  describe('NotebookPanel', () => {

    describe('#constructor()', () => {

      it('should create a notebook panel', () => {
        let panel = new NotebookPanel(options);
        expect(panel).to.be.a(NotebookPanel);
      });


      it('should accept an optional content factory', () => {
        let newFactory = createNotebookPanelFactory();
        let panel = new NotebookPanel({
          mimeTypeService, rendermime, contentFactory: newFactory
        });
        expect(panel.contentFactory).to.be(newFactory);
      });

    });

    describe('#contextChanged', () => {

      it('should be emitted when the context on the panel changes', () => {
        let panel = new NotebookPanel(options);
        let called = false;
        panel.contextChanged.connect((sender, args) => {
          expect(sender).to.be(panel);
          expect(args).to.be(void 0);
          called = true;
        });
        panel.context = context;
        expect(called).to.be(true);
      });

      it('should not be emitted if the context does not change', () => {
        let panel = new NotebookPanel(options);
        let called = false;
        panel.context = context;
        panel.contextChanged.connect(() => { called = true; });
        panel.context = context;
        expect(called).to.be(false);
      });

    });

    describe('#kernelChanged', () => {

      it('should be emitted when the kernel on the panel changes', (done) => {
        let panel = createPanel(context);
        panel.kernelChanged.connect((sender, args) => {
          expect(sender).to.be(panel);
          expect(args.name).to.be.ok();
          done();
        });
        panel.context.save().then(() => {
          return panel.context.startDefaultKernel();
        }).catch(done);
      });

    });

    describe('#toolbar', () => {

      it('should be the toolbar used by the widget', () => {
        let panel = new NotebookPanel(options);
        expect(panel.toolbar).to.be.a(Toolbar);
      });

    });

    describe('#content', () => {

      it('should be the content area used by the widget', () => {
        let panel = new NotebookPanel(options);
        expect(panel.notebook).to.be.a(Notebook);
      });

    });

    describe('#kernel', () => {

      it('should be the current kernel used by the panel', (done) => {
        let panel = createPanel(context);
        context.save().then(() => {
          return context.startDefaultKernel();
        }).catch(done);
        context.kernelChanged.connect(() => {
          expect(panel.kernel.name).to.be.ok();
          done();
        });
      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let panel = new NotebookPanel(options);
        expect(panel.rendermime).to.be(rendermime);
      });

    });

    describe('#contentFactory', () => {

      it('should be the contentFactory used by the widget', () => {
        let r = createNotebookPanelFactory();
        let panel = new NotebookPanel({
          mimeTypeService, rendermime, contentFactory: r });
        expect(panel.contentFactory).to.be(r);
      });

    });

    describe('#model', () => {

      it('should be the model for the widget', () => {
        let panel = new NotebookPanel(options);
        expect(panel.model).to.be(null);
        panel.context = context;
        expect(panel.model).to.be(context.model);
        expect(panel.notebook.model).to.be(context.model);
      });

    });

    describe('#context', () => {

      it('should get the document context for the widget', () => {
        let panel = new NotebookPanel(options);
        expect(panel.context).to.be(null);
      });

      it('should set the document context for the widget', () => {
        let panel = new NotebookPanel(options);
        panel.context = context;
        expect(panel.context).to.be(context);
      });

      it('should emit the `contextChanged` signal', () => {
        let panel = new NotebookPanel(options);
        let called = false;
        panel.contextChanged.connect(() => { called = true; });
        panel.context = context;
        expect(called).to.be(true);
      });


      it('should initialize the model state', (done) => {
        let panel = new LogNotebookPanel(options);
        let model = context.model;
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.cells.canUndo).to.be(true);
        panel.context = context;
        context.ready.then(() => {
          expect(model.cells.canUndo).to.be(false);
          done();
        });
        context.save();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        let panel = new NotebookPanel(options);
        panel.context = context;
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        let panel = new NotebookPanel(options);
        panel.dispose();
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

    });

    describe('#onContextChanged()', () => {

      it('should be called when the context changes', () => {
        let panel = new LogNotebookPanel(options);
        panel.methods = [];
        panel.context = context;
        expect(panel.methods).to.contain('onContextChanged');
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should be called when the model state changes', () => {
        let panel = createPanel(context);
        panel.methods = [];
        panel.model.dirty = false;
        expect(panel.methods).to.contain('onModelStateChanged');
      });

      it('should update the title className based on the dirty state', () => {
        let panel = createPanel(context);
        panel.model.dirty = true;
        expect(panel.title.className).to.contain('jp-mod-dirty');
        panel.model.dirty = false;
        expect(panel.title.className).to.not.contain('jp-mod-dirty');
      });

    });

    describe('#onPathChanged()', () => {

      it('should be called when the path changes', (done) => {
        let panel = createPanel(context);
        panel.methods = [];
        context.save().then(() => {
          return manager.contents.rename(context.path, 'foo.ipynb');
        }).catch(done);
        context.pathChanged.connect(() => {
          expect(panel.methods).to.contain('onPathChanged');
          done();
        });
      });

      it('should be called when the context changes', () => {
        let panel = new LogNotebookPanel(options);
        panel.methods = [];
        panel.context = context;
        expect(panel.methods).to.contain('onPathChanged');
      });

      it('should update the title label', () => {
        let panel = createPanel(context);
        expect(panel.title.label).to.be(context.path);
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a new ContentFactory', () => {
          let factory = new NotebookPanel.ContentFactory({ editorFactory });
          expect(factory).to.be.a(NotebookPanel.ContentFactory);
        });

      });

      describe('#notebookContentFactory', () => {

        it('should be the content factory for notebook widgets', () => {
          expect(contentFactory.notebookContentFactory).to.be.a(Notebook.ContentFactory);
        });

      });

      describe('#createNotebook()', () => {

        it('should create a notebook widget', () => {
          let options = {
            contentFactory: contentFactory.notebookContentFactory,
            rendermime,
            mimeTypeService
          };
          expect(contentFactory.createNotebook(options)).to.be.a(Notebook);
        });

      });

      describe('#createToolbar()', () => {

        it('should create a notebook toolbar', () => {
          expect(contentFactory.createToolbar()).to.be.a(Toolbar);
        });

      });

    });

  });

});
