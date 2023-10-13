// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import { CodeCell } from '@jupyterlab/cells';
import {
  Notebook,
  NotebookActions,
  NotebookModel,
  StaticNotebook
} from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
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
  let rendermime: IRenderMimeRegistry;

  describe('NotebookActions', () => {
    let widget: Notebook;
    let sessionContext: ISessionContext;
    let ipySessionContext: ISessionContext;

    beforeAll(async function () {
      rendermime = utils.defaultRenderMime();

      async function createContext(options?: Partial<SessionContext.IOptions>) {
        const context = await createSessionContext(options);
        await context.initialize();
        await context.session?.kernel?.info;
        return context;
      }
      [sessionContext, ipySessionContext] = await Promise.all([
        createContext(),
        createContext({ kernelPreference: { name: 'ipython' } })
      ]);
    }, 30000);

    beforeEach(() => {
      widget = new Notebook({
        rendermime,
        contentFactory: utils.createNotebookFactory(),
        mimeTypeService: utils.mimeTypeService,
        notebookConfig: {
          ...StaticNotebook.defaultNotebookConfig,
          windowingMode: 'none'
        }
      });
      const model = new NotebookModel();
      model.fromJSON(utils.DEFAULT_CONTENT);
      widget.model = model;
      model.sharedModel.clearUndoHistory();

      widget.activeCellIndex = 0;
    });

    afterEach(() => {
      widget.model?.dispose();
      widget.dispose();
      utils.clipboard.clear();
    });

    afterAll(async () => {
      await Promise.all([
        sessionContext.shutdown(),
        ipySessionContext.shutdown()
      ]);
    });

    describe('#history', () => {
      it('should emit when Markdown and code cells are run', async () => {
        for (let i = 0; i < 12; i++) {
          let cell = widget.widgets[i] as CodeCell;
          let source = 'print(this is input ${i})';
          cell.model.sharedModel.setSource(source);
        }
        let emitted = 0;
        let failed = 0;
        NotebookActions.executed.connect((_, args) => {
          const { success } = args;
          emitted += 1;
          if (!success) {
            failed += 1;
          }
        });

        await NotebookActions.run(widget, sessionContext);
        expect(emitted).toBe(12);
        expect(failed).toBe(0);

        let activeCell = widget.widgets[-1];
        widget.select(activeCell);
        for (let i = 0; i < 12; i++) {
          await widget.history?.back(activeCell);
        }
        expect(activeCell.model.sharedModel.source).toBe(
          'print(this is input 0)'
        );
      });
    });
  });
});
