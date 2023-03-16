// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { JupyterServer } from '@jupyterlab/testing';
import {
  ExecutionIndicator,
  ExecutionIndicatorComponent,
  Notebook,
  NotebookActions,
  NotebookModel
} from '@jupyterlab/notebook';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
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
  source: ['import time\n', 'time.sleep(3.05)\n']
};

const killerCellModel = {
  cell_type: 'code',
  execution_count: 1,
  metadata: { tags: [] },
  outputs: [],
  source: ['import os\n', 'os.system(f"kill {os.getpid()}")\n']
};

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

const SESSION_SETUP_TIMEOUT = 30000;

describe('@jupyterlab/notebook', () => {
  let rendermime: IRenderMimeRegistry;

  describe('ExecutionIndicator', () => {
    let widget: Notebook;
    let sessionContext: ISessionContext;
    let ipySessionContext: ISessionContext;
    let indicator: ExecutionIndicator;

    async function createContext(options?: Partial<SessionContext.IOptions>) {
      const context = await createSessionContext(options);
      await context.initialize();
      await context.session?.kernel?.info;
      return context;
    }

    async function setupSessions() {
      [sessionContext, ipySessionContext] = await Promise.all([
        createContext(),
        createContext({ kernelPreference: { name: 'ipython' } })
      ]);
    }

    beforeAll(async () => {
      rendermime = utils.defaultRenderMime();

      await setupSessions();
    }, SESSION_SETUP_TIMEOUT);

    beforeEach(async () => {
      widget = new Notebook({
        rendermime,
        contentFactory: utils.createNotebookFactory(),
        mimeTypeService: utils.mimeTypeService,
        notebookConfig: {
          ...Notebook.defaultNotebookConfig,
          windowingMode: 'none'
        }
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
      widget.model?.dispose();
      widget.dispose();
      utils.clipboard.clear();
      indicator.model.dispose();
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

      it('should count correctly number of executed requests', async () => {
        let executed: Array<number> = [];

        indicator.model.stateChanged.connect(state => {
          executed.push(state.executionState(widget)!.scheduledCell.size);
        });

        await NotebookActions.run(widget, ipySessionContext);
        expect(executed).toEqual(expect.arrayContaining([3, 3, 3, 2, 2, 2, 0]));
      });

      it(
        'should reset to idle when kernel gets abruptly terminated',
        async () => {
          const model = new NotebookModel();
          const modelJson = {
            ...utils.DEFAULT_CONTENT,
            cells: [killerCellModel, slowCellModel]
          };

          model.fromJSON(modelJson);
          widget.model = model;

          widget.activeCellIndex = 0;
          for (let idx = 0; idx < widget.widgets.length; idx++) {
            widget.select(widget.widgets[idx]);
          }
          let scheduledTally: Array<number> = [];

          indicator.model.stateChanged.connect(state => {
            scheduledTally.push(
              state.executionState(widget)!.scheduledCell.size
            );
          });

          let completed = await NotebookActions.run(widget, ipySessionContext);
          expect(completed).toBe(false);

          expect(scheduledTally).toEqual(expect.arrayContaining([2, 0]));
          await setupSessions();
        },
        SESSION_SETUP_TIMEOUT
      );
    });
  });
  describe('testProgressCircle', () => {
    let displayOption: { showOnToolBar: boolean; showProgress: boolean };
    let defaultState: {
      interval: number;
      kernelStatus: ISessionContext.KernelDisplayStatus;
      executionStatus: string;
      needReset: boolean;
      scheduledCell: Set<string>;
      scheduledCellNumber: number;
      timeout: number;
      totalTime: number;
    };

    const EMPTY_CIRCLE = 'M 0 0 v -104 A 104 104 1 0 0 -0.0000 -104.0000 z';
    const HALF_FILLED_CIRCLE = 'M 0 0 v -104 A 104 104 1 0 0 0.0000 104.0000 z';
    const FILLED_CIRCLE = 'M 0 0 v -104 A 104 104 1 1 0 0.1815 -103.9998 z';

    beforeEach(() => {
      displayOption = { showOnToolBar: false, showProgress: true };
      defaultState = {
        interval: 0,
        kernelStatus: 'idle',
        executionStatus: 'idle',
        needReset: false,
        scheduledCell: new Set<string>(),
        scheduledCellNumber: 0,
        timeout: 0,
        totalTime: 0
      };
    });
    it('Should render an empty div with undefined state', () => {
      const element = (
        <ExecutionIndicatorComponent
          displayOption={displayOption}
          state={undefined}
          translator={undefined}
        />
      );
      const htmlElement = ReactDOMServer.renderToString(element);
      expect(htmlElement).toContain('<div></div>');
    });
    it('Should render a filled circle with 0/2 cell executed message', () => {
      defaultState.scheduledCellNumber = 2;
      defaultState.scheduledCell.add('foo');
      defaultState.scheduledCell.add('bar');
      defaultState.executionStatus = 'busy';
      defaultState.totalTime = 1;
      const element = (
        <ExecutionIndicatorComponent
          displayOption={displayOption}
          state={defaultState}
          translator={undefined}
        />
      );
      const htmlElement = ReactDOMServer.renderToString(element);
      expect(htmlElement).toContain(FILLED_CIRCLE);
      expect(htmlElement).toContain(`Executed 0/2 cells`);
    });

    it('Should render a half filled circle with 1/2 cell executed message', () => {
      defaultState.scheduledCellNumber = 2;
      defaultState.scheduledCell.add('foo');
      defaultState.executionStatus = 'busy';
      defaultState.totalTime = 1;
      const element = (
        <ExecutionIndicatorComponent
          displayOption={displayOption}
          state={defaultState}
          translator={undefined}
        />
      );
      const htmlElement = ReactDOMServer.renderToString(element);
      expect(htmlElement).toContain(HALF_FILLED_CIRCLE);
      expect(htmlElement).toContain(`Executed 1/2 cells`);
    });

    it('Should render an empty circle with 2 cells executed message', () => {
      defaultState.scheduledCellNumber = 2;
      defaultState.executionStatus = 'idle';
      defaultState.totalTime = 1;
      const element = (
        <ExecutionIndicatorComponent
          displayOption={displayOption}
          state={defaultState}
          translator={undefined}
        />
      );
      const htmlElement = ReactDOMServer.renderToString(element);
      expect(htmlElement).toContain(EMPTY_CIRCLE);
      expect(htmlElement).toContain(`Executed 2 cells`);
    });
  });
});
