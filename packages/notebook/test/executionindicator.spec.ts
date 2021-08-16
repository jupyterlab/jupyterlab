// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { createSessionContext } from '@jupyterlab/testutils';
import { JupyterServer } from '@jupyterlab/testutils/lib/start_jupyter_server';
import {
  ExecutionIndicator,
  Notebook,
  NotebookActions,
  NotebookModel
} from '../src';
import * as utils from './utils';

const fastCellModel = {
  cell_type: 'code',
  execution_count: 1,
  metadata: { tags: [] },
  outputs: [],
  source: ['print("hello")\n']
};

const slowCellModel = {
  cell_type: 'code',
  execution_count: 1,
  metadata: { tags: [] },
  outputs: [],
  source: ['import time\n', 'time.sleep(3)\n']
};

const server = new JupyterServer();

beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/notebook', () => {
  let rendermime: IRenderMimeRegistry;

  describe('ExecutionIndicator', () => {
    let widget: Notebook;
    let sessionContext: ISessionContext;
    let ipySessionContext: ISessionContext;
    let indicator: ExecutionIndicator;
    beforeAll(async function () {
      jest.setTimeout(20000);
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
    });

    beforeEach(async () => {
      widget = new Notebook({
        rendermime,
        contentFactory: utils.createNotebookFactory(),
        mimeTypeService: utils.mimeTypeService
      });
      const model = new NotebookModel();
      const modelJson = {
        ...utils.DEFAULT_CONTENT,
        cells: [fastCellModel, slowCellModel, slowCellModel, fastCellModel]
      };

      model.fromJSON(modelJson);

      widget.model = model;
      model.sharedModel.clearUndoHistory();

      widget.activeCellIndex = 0;
      for (let idx = 0; idx < widget.widgets.length; idx++) {
        widget.select(widget.widgets[idx]);
      }
      indicator = new ExecutionIndicator();
      indicator.model.attachNotebook({
        content: widget,
        context: ipySessionContext
      });
      await ipySessionContext.restartKernel();
    });

    afterEach(() => {
      widget.dispose();
      utils.clipboard.clear();
      indicator.dispose();
    });

    afterAll(async () => {
      await Promise.all([
        sessionContext.shutdown(),
        ipySessionContext.shutdown()
      ]);
    });

    describe('executedAllCell', () => {
      it('should count correctly number of scheduled cell', async () => {
        let scheduledCell: number | undefined = 0;

        indicator.model.stateChanged.connect(state => {
          scheduledCell = state.executionState(widget)!.scheduledCellNumber;
        });

        await NotebookActions.run(widget, ipySessionContext);
        expect(scheduledCell).toBe(4);
      });

      it('should count correctly elapsed time', async () => {
        let elapsedTime: number | undefined = 0;

        indicator.model.stateChanged.connect(state => {
          elapsedTime = state.executionState(widget)!.totalTime;
        });

        await NotebookActions.run(widget, ipySessionContext);
        expect(elapsedTime).toBeGreaterThanOrEqual(6);
      });

      it('should tick every second', async () => {
        let tick: Array<number> = [];

        indicator.model.stateChanged.connect(state => {
          tick.push(state.executionState(widget)!.totalTime);
        });

        await NotebookActions.run(widget, ipySessionContext);
        expect(tick).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 6]));
      });

      it('should count correctly number of executed cells', async () => {
        let executed: Array<number> = [];

        indicator.model.stateChanged.connect(state => {
          executed.push(state.executionState(widget)!.scheduledCell.size);
        });

        await NotebookActions.run(widget, ipySessionContext);
        expect(executed).toEqual(expect.arrayContaining([3, 3, 3, 2, 2, 2, 0]));
      });
    });
  });
});
