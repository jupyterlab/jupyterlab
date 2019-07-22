// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Context } from '@jupyterlab/docregistry';

import { INotebookModel, NotebookPanel, Notebook } from '@jupyterlab/notebook';

import { Toolbar } from '@jupyterlab/apputils';

import { initNotebookContext, NBTestUtils } from '@jupyterlab/testutils';

/**
 * Default data.
 */
const contentFactory = NBTestUtils.createNotebookPanelFactory();

describe('@jupyterlab/notebook', () => {
  describe('NotebookPanel', () => {
    let context: Context<INotebookModel>;

    beforeEach(async () => {
      context = await initNotebookContext();
    });

    afterEach(() => {
      context.dispose();
    });

    describe('#constructor()', () => {
      it('should create a notebook panel', () => {
        const content = NBTestUtils.createNotebook();
        const panel = new NotebookPanel({ context, content });
        expect(panel).to.be.an.instanceof(NotebookPanel);
      });

      it('should change notebook to edit mode if we have a single empty code cell', async () => {
        const panel = NBTestUtils.createNotebookPanel(context);
        const model = panel.content.model;
        expect(model).to.equal(context.model);
        await context.initialize(true);
        await context.ready;
        expect(panel.content.mode).to.equal('edit');
      });
    });

    describe('#toolbar', () => {
      it('should be the toolbar used by the widget', () => {
        const panel = NBTestUtils.createNotebookPanel(context);
        expect(panel.toolbar).to.be.an.instanceof(Toolbar);
      });
    });

    describe('#content', () => {
      it('should be the notebook content widget', () => {
        const panel = NBTestUtils.createNotebookPanel(context);
        expect(panel.content).to.be.an.instanceof(Notebook);
      });
    });

    describe('#context', () => {
      it('should get the document context for the widget', () => {
        const panel = NBTestUtils.createNotebookPanel(context);
        expect(panel.context).to.equal(context);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the widget', () => {
        const panel = NBTestUtils.createNotebookPanel(context);
        panel.dispose();
        expect(panel.isDisposed).to.equal(true);
      });

      it('should be safe to call more than once', () => {
        const panel = NBTestUtils.createNotebookPanel(context);
        panel.dispose();
        panel.dispose();
        expect(panel.isDisposed).to.equal(true);
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a new ContentFactory', () => {
          const factory = new NotebookPanel.ContentFactory({
            editorFactory: NBTestUtils.editorFactory
          });
          expect(factory).to.be.an.instanceof(NotebookPanel.ContentFactory);
        });
      });

      describe('#NBTestUtils.createNotebook()', () => {
        it('should create a notebook widget', () => {
          const options = {
            contentFactory: contentFactory,
            rendermime: NBTestUtils.defaultRenderMime(),
            mimeTypeService: NBTestUtils.mimeTypeService
          };
          expect(contentFactory.createNotebook(options)).to.be.an.instanceof(
            Notebook
          );
        });
      });
    });
  });
});
