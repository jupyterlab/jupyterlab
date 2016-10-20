// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  INotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  NotebookPanel
} from '../../../../lib/notebook/notebook/panel';

import {
  NotebookWidgetFactory
} from '../../../../lib/notebook/notebook/widgetfactory';

import {
  Context
} from '../../../../lib/docregistry/context';

import {
  createNotebookContext, defaultRenderMime
} from '../../utils';


import {
  CodeMirrorNotebookPanelRenderer
} from '../../../../lib/notebook/codemirror/notebook/panel';


const rendermime = defaultRenderMime();
const clipboard = new MimeData();
const renderer = CodeMirrorNotebookPanelRenderer.defaultRenderer;
const contextPromise = createNotebookContext();


function createFactory(): NotebookWidgetFactory {
  return new NotebookWidgetFactory({
    name: 'notebook',
    fileExtensions: ['.ipynb'],
    rendermime,
    clipboard,
    renderer
  });
}


describe('notebook/notebook/widgetfactory', () => {

  let context: Context<INotebookModel>;

  beforeEach((done) => {
    contextPromise.then(c => {
      context = c;
      done();
    });
  });

  after(() => {
    context.kernel.shutdown();
  });

  describe('NotebookWidgetFactory', () => {

    describe('#constructor()', () => {

      it('should create a notebook widget factory', () => {
        let factory = createFactory();
        expect(factory).to.be.a(NotebookWidgetFactory);
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the factory has been disposed', () => {
        let factory = createFactory();
        expect(factory.isDisposed).to.be(false);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the factory', () => {
        let factory = createFactory();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let factory = createFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#createNew()', () => {

      it('should create a new `NotebookPanel` widget', () => {
        let factory = createFactory();
        let panel = factory.createNew(context);
        expect(panel).to.be.a(NotebookPanel);
      });

      it('should create a clone of the rendermime', () => {
        let factory = createFactory();
        let panel = factory.createNew(context);
        expect(panel.rendermime).to.not.be(rendermime);
      });

      it('should start a kernel if one is given', (done) => {
        let factory = createFactory();
        context.kernelChanged.connect((sender, kernel) => {
          expect(kernel.name).to.be(context.kernelspecs.default);
          done();
        });
        factory.createNew(context, { name: context.kernelspecs.default });
      });

      it('should start a kernel given the default kernel language', (done) => {
        let factory = createFactory();
        createNotebookContext().then(ctx => {
          ctx.kernelChanged.connect((sender, kernel) => {
            expect(kernel.name).to.be(ctx.kernelspecs.default);
            done();
          });
          factory.createNew(ctx);
        });
      });

      // it('should start a kernel based on default language of the model', () => {
      //   // TODO: inject other kernelspecs
      //   let cursor = context.model.getMetadata('language_info');
      //   cursor.setValue({ name: 'shell' });
      //   let factory = createFactory();
      //   let panel = factory.createNew(context);
      //   expect(panel.context.kernel.name).to.be('shell');
      // });

      it('should populate the default toolbar items', () => {
        let factory = createFactory();
        let panel = factory.createNew(context);
        let items = panel.toolbar.list();
        expect(items).to.contain('save');
        expect(items).to.contain('restart');
        expect(items).to.contain('kernelStatus');
      });

    });

  });

});
