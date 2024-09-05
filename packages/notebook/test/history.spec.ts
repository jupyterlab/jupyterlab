// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import { Notebook, NotebookActions, NotebookModel } from '@jupyterlab/notebook';
import { JupyterServer } from '@jupyterlab/testing';
import * as utils from './utils';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/notebook', () => {
  describe('NotebookActions', () => {
    let widget: Notebook;
    let sessionContext: ISessionContext;

    beforeAll(async function () {
      async function createContext(options?: Partial<SessionContext.IOptions>) {
        const context = await createSessionContext(options);
        await context.initialize();
        await context.session?.kernel?.info;
        return context;
      }
      sessionContext = await createContext({
        kernelPreference: { name: 'ipython' }
      });
    }, 30000);

    beforeEach(() => {
      widget = utils.createNotebook(sessionContext);
      const model = new NotebookModel();
      widget.model = model;
      widget.activeCellIndex = 0;
    });

    afterEach(() => {
      widget.model?.dispose();
      widget.dispose();
      utils.clipboard.clear();
    });

    afterAll(async () => {
      await Promise.all([sessionContext.shutdown()]);
    });

    describe('#history', () => {
      it('shouldnt break if there is no history', async () => {
        let activeCell = widget.widgets[0];
        widget.select(activeCell);
        let update = await widget.kernelHistory?.back(activeCell);
        widget.kernelHistory?.updateEditor(activeCell, update);
        expect(activeCell.model.sharedModel.getSource()).toBe('');
        update = await widget.kernelHistory?.forward(activeCell);
        widget.kernelHistory?.updateEditor(activeCell, update);
        expect(activeCell.model.sharedModel.getSource()).toBe('');
      });
      it('should iterate back through history', async () => {
        let emitted = 0;
        let failed = 0;
        NotebookActions.executed.connect((_, args) => {
          const { success } = args;
          emitted += 1;
          if (!success) {
            failed += 1;
          }
        });
        for (let i = 0; i < 15; i++) {
          let source = `print("this is input ${i}")`;
          if (widget.widgets[i]) {
            let activeCell = widget.widgets[i];
            widget.select(activeCell);
            activeCell.model.sharedModel.setSource(source);
          } else {
            widget.model!.sharedModel.insertCell(i, {
              cell_type: 'code',
              source: source
            });
          }
        }

        await NotebookActions.runAll(widget, sessionContext);
        expect(emitted).toBe(15);
        expect(failed).toBe(0);

        let activeCell = widget.widgets[widget.widgets.length - 1];
        widget.select(activeCell);

        for (let i = 0; i < 12; i++) {
          let update = await widget.kernelHistory?.back(activeCell);
          if (update) {
            widget.kernelHistory?.updateEditor(activeCell, update);
          }
        }

        expect(activeCell.model.sharedModel.getSource()).toBe(
          'print("this is input 2")'
        );
      });
    });
  });
});
