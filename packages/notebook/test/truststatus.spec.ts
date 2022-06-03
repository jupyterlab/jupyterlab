// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CellModel } from '@jupyterlab/cells';
import { Context } from '@jupyterlab/docregistry';
import {
  INotebookModel,
  NotebookPanel,
  NotebookTrustStatus
} from '@jupyterlab/notebook';
import { initNotebookContext } from '@jupyterlab/testutils';
import { JupyterServer } from '@jupyterlab/testutils/lib/start_jupyter_server';

import * as utils from './utils';

const server = new JupyterServer();
beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/notebook', () => {
  describe('truststatus', () => {
    describe('NotebookTrustStatus.Model', () => {
      let model: NotebookTrustStatus.Model;
      let context: Context<INotebookModel>;
      let panel: NotebookPanel;
      beforeEach(async () => {
        model = new NotebookTrustStatus.Model();
        context = await initNotebookContext();
        const content = utils.createNotebook();
        panel = new NotebookPanel({ context, content });
      });
      afterEach(() => {
        model.dispose();
        // context.dispose();
      });
      describe('#notebook', () => {
        it('should set the notebook', () => {
          model.notebook = panel;
          expect(model.notebook).toBe(panel);
          expect(model.totalCells).toBe(1);
          expect(model.trustedCells).toBe(0);
        });
      });
      describe('#trustCell', () => {
        it('should trust the cells in passed argument', () => {
          const args = { type: 'add', newValues: [{ trusted: false }] } as any;
          model.trustCell(undefined as any, args);
          expect(args.newValues[0].trusted).toBe(true);
        });
      });
      describe('#toggleTrustNotebook', () => {
        it('should toggle the trust the notebook', () => {
          model.notebook = panel;

          model.toggleTrustNotebook(true);
          expect(model.trustedCells).toBe(1);

          model.toggleTrustNotebook(false);
          expect(model.trustedCells).toBe(0);
        });
      });
      describe('#alwaysTrustNotebook', () => {
        it('should trust the cells added to notebook', () => {
          model.notebook = panel;
          model.alwaysTrustNotebook();
          const cellModel = new CellModel({});

          expect(cellModel.trusted).toBe(false);
          panel.content.model!.cells.push(cellModel);
          expect(cellModel.trusted).toBe(true);
        });
      });
    });
  });
});
