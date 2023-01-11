// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Context } from '@jupyterlab/docregistry';
import { initNotebookContext } from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer } from '@jupyterlab/testing';
import { Toolbar } from '@jupyterlab/ui-components';
import { INotebookModel, Notebook, NotebookPanel } from '@jupyterlab/notebook';
import * as utils from './utils';

/**
 * Default data.
 */
const contentFactory = utils.createNotebookPanelFactory();

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

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
        const content = utils.createNotebook();
        const panel = new NotebookPanel({ context, content });
        expect(panel).toBeInstanceOf(NotebookPanel);
      });

      it('should change notebook to edit mode if we have a single empty code cell', async () => {
        const panel = utils.createNotebookPanel(context);
        const model = panel.content.model;
        expect(model).toBe(context.model);
        await context.initialize(true);
        await context.ready;
        expect(panel.content.mode).toBe('edit');
      });
    });

    describe('#toolbar', () => {
      it('should be the toolbar used by the widget', () => {
        const panel = utils.createNotebookPanel(context);
        expect(panel.toolbar).toBeInstanceOf(Toolbar);
      });
    });

    describe('#content', () => {
      it('should be the notebook content widget', () => {
        const panel = utils.createNotebookPanel(context);
        expect(panel.content).toBeInstanceOf(Notebook);
      });
    });

    describe('#context', () => {
      it('should get the document context for the widget', () => {
        const panel = utils.createNotebookPanel(context);
        expect(panel.context).toBe(context);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the widget', () => {
        const panel = utils.createNotebookPanel(context);
        panel.dispose();
        expect(panel.isDisposed).toBe(true);
      });

      it('should be safe to call more than once', () => {
        const panel = utils.createNotebookPanel(context);
        panel.dispose();
        panel.dispose();
        expect(panel.isDisposed).toBe(true);
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a new ContentFactory', () => {
          const factory = new NotebookPanel.ContentFactory({
            editorFactory: utils.editorFactory
          });
          expect(factory).toBeInstanceOf(NotebookPanel.ContentFactory);
        });
      });

      describe('#NBTestUtils.createNotebook()', () => {
        it('should create a notebook widget', () => {
          const options = {
            contentFactory: contentFactory,
            rendermime: utils.defaultRenderMime(),
            mimeTypeService: utils.mimeTypeService
          };
          expect(contentFactory.createNotebook(options)).toBeInstanceOf(
            Notebook
          );
        });
      });
    });
  });
});
