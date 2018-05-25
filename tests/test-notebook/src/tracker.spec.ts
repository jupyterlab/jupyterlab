// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Cell
} from '@jupyterlab/cells';

import {
  Context
} from '@jupyterlab/docregistry';

import {
  INotebookModel, NotebookPanel, NotebookTracker
} from '@jupyterlab/notebook';

import {
  createNotebookContext
} from '../../utils';

import {
  DEFAULT_CONTENT, createNotebookPanel
} from '../../notebook-utils';


const namespace = 'notebook-tracker-test';


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
      context = await createNotebookContext();
    });

    afterEach(async () => {
      await context.session.shutdown();
      context.dispose();
    });

    describe('#constructor()', () => {

      it('should create a NotebookTracker', () => {
        let tracker = new NotebookTracker({ namespace });
        expect(tracker).to.be.a(NotebookTracker);
      });

    });

    describe('#activeCell', () => {

      it('should be `null` if there is no tracked notebook panel', () => {
        let tracker = new NotebookTracker({ namespace });
        expect(tracker.activeCell).to.be(null);
      });

      it('should be `null` if a tracked notebook has no active cell', () => {
        let tracker = new NotebookTracker({ namespace });
        let panel = createNotebookPanel(context);
        panel.content.model.cells.clear();
        tracker.add(panel);
        expect(tracker.activeCell).to.be(null);
      });

      it('should be the active cell if a tracked notebook has one', () => {
        let tracker = new NotebookTracker({ namespace });
        let panel = createNotebookPanel(context);
        tracker.add(panel);
        panel.content.model.fromJSON(DEFAULT_CONTENT);
        expect(tracker.activeCell).to.be.a(Cell);
        panel.dispose();
      });

    });

    describe('#activeCellChanged', () => {

      it('should emit a signal when the active cell changes', () => {
        let tracker = new NotebookTracker({ namespace });
        let panel = createNotebookPanel(context);
        let count = 0;
        tracker.activeCellChanged.connect(() => { count++; });
        panel.content.model.fromJSON(DEFAULT_CONTENT);
        tracker.add(panel);
        expect(count).to.be(1);
        panel.content.activeCellIndex = 1;
        expect(count).to.be(2);
        panel.dispose();
      });

    });

    describe('#onCurrentChanged()', () => {

      it('should be called when the active cell changes', () => {
        let tracker = new TestTracker({ namespace });
        let panel = createNotebookPanel(context);
        tracker.add(panel);
        expect(tracker.methods).to.contain('onCurrentChanged');
      });

    });

  });

});
