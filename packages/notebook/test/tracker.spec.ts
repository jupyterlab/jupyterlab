// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { Context } from '@jupyterlab/docregistry';
import { initNotebookContext } from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer } from '@jupyterlab/testing';
import {
  INotebookModel,
  NotebookPanel,
  NotebookTracker
} from '@jupyterlab/notebook';
import * as utils from './utils';

const namespace = 'notebook-tracker-test';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

class TestTracker extends NotebookTracker {
  methods: string[] = [];

  protected onCurrentChanged(widget: NotebookPanel): void {
    super.onCurrentChanged(widget);
    this.methods.push('onCurrentChanged');
  }
}

describe('@jupyterlab/notebook', () => {
  describe('NotebookTracker', () => {
    let context: Context<INotebookModel>;

    beforeEach(async () => {
      context = await initNotebookContext();
    });

    afterEach(() => {
      context.dispose();
    });

    describe('#constructor()', () => {
      it('should create a NotebookTracker', () => {
        const tracker = new NotebookTracker({ namespace });
        expect(tracker).toBeInstanceOf(NotebookTracker);
      });
    });

    describe('#activeCell', () => {
      it('should be `null` if there is no tracked notebook panel', () => {
        const tracker = new NotebookTracker({ namespace });
        expect(tracker.activeCell).toBeNull();
      });

      it('should be `null` if a tracked notebook has no active cell', () => {
        const tracker = new NotebookTracker({ namespace });
        const panel = utils.createNotebookPanel(context);
        panel.content.model!.sharedModel.clearUndoHistory();
        void tracker.add(panel);
        expect(tracker.activeCell).toBeNull();
      });

      it('should be the active cell if a tracked notebook has one', async () => {
        const tracker = new NotebookTracker({ namespace });
        const panel = utils.createNotebookPanel(context);
        await tracker.add(panel);
        panel.content.model!.fromJSON(utils.DEFAULT_CONTENT);
        expect(tracker.activeCell).toBeInstanceOf(Cell);
        panel.dispose();
      });
    });

    describe('#activeCellChanged', () => {
      it('should emit a signal when the active cell changes', async () => {
        const tracker = new NotebookTracker({ namespace });
        const panel = utils.createNotebookPanel(context);
        let count = 0;
        tracker.activeCellChanged.connect(() => {
          count++;
        });
        panel.content.model!.fromJSON(utils.DEFAULT_CONTENT);
        await tracker.add(panel);
        expect(count).toBe(1);
        panel.content.activeCellIndex = 1;
        expect(count).toBe(2);
        panel.dispose();
      });
    });

    describe('#onCurrentChanged()', () => {
      it('should be called when the active cell changes', async () => {
        const tracker = new TestTracker({ namespace });
        const panel = utils.createNotebookPanel(context);
        await tracker.add(panel);
        expect(tracker.methods).toEqual(
          expect.arrayContaining(['onCurrentChanged'])
        );
      });
    });
  });
});
