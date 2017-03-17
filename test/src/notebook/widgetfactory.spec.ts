// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  INotebookModel
} from '@jupyterlab/notebook';

import {
  NotebookPanel
} from '@jupyterlab/notebook';

import {
  NotebookWidgetFactory
} from '@jupyterlab/notebook';

import {
  Context
} from '@jupyterlab/docregistry';

import {
  createNotebookContext
} from '../utils';

import {
  createNotebookPanelFactory, rendermime, mimeTypeService
} from './utils';


const contentFactory = createNotebookPanelFactory();


function createFactory(): NotebookWidgetFactory {
  return new NotebookWidgetFactory({
    name: 'notebook',
    fileExtensions: ['.ipynb'],
    rendermime,
    contentFactory,
    mimeTypeService
  });
}


describe('notebook/notebook/widgetfactory', () => {

  let context: Context<INotebookModel>;

  beforeEach(() => {
    context = createNotebookContext();
  });

  afterEach(() => {
    context.dispose();
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

      it('should populate the default toolbar items', () => {
        let factory = createFactory();
        let panel = factory.createNew(context);
        let items = toArray(panel.toolbar.names());
        expect(items).to.contain('save');
        expect(items).to.contain('restart');
        expect(items).to.contain('kernelStatus');
      });

    });

  });

});
