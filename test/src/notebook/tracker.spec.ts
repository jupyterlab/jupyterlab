// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
  BaseCellWidget
} from '../../../lib/notebook/cells';

import {
  NotebookPanel
} from '../../../lib/notebook/notebook/panel';

import {
  NotebookTracker
} from '../../../lib/notebook/tracker';

import {
  createNotebookContext, defaultRenderMime
} from '../utils';

import {
  DEFAULT_CONTENT, createNotebookPanelRenderer
} from './utils';


const NAMESPACE = 'notebook-tracker-test';


class TestTracker extends NotebookTracker {
  methods: string[] = [];

  protected onCurrentChanged(): void {
    super.onCurrentChanged();
    this.methods.push('onCurrentChanged');
  }
}


/**
 * Default notebook panel data.
 */
const rendermime = defaultRenderMime();
const clipboard = new MimeData();
const renderer = createNotebookPanelRenderer();


describe('notebook/tracker', () => {

  describe('NotebookTracker', () => {

    describe('#constructor()', () => {

      it('should create a NotebookTracker', () => {
        let tracker = new NotebookTracker({ namespace: NAMESPACE });
        expect(tracker).to.be.a(NotebookTracker);
      });

    });

    describe('#activeCell', () => {

      it('should be `null` if there is no tracked notebook panel', () => {
        let tracker = new NotebookTracker({ namespace: NAMESPACE });
        expect(tracker.activeCell).to.be(null);
      });

      it('should be `null` if a tracked notebook has no active cell', () => {
        let tracker = new NotebookTracker({ namespace: NAMESPACE });
        let panel = new NotebookPanel({ rendermime, clipboard, renderer});
        tracker.add(panel);
        expect(tracker.activeCell).to.be(null);
      });

      it('should be the active cell if a tracked notebook has one', () => {
        let tracker = new NotebookTracker({ namespace: NAMESPACE });
        let panel = new NotebookPanel({ rendermime, clipboard, renderer});
        tracker.add(panel);
        panel.context = createNotebookContext();
        panel.content.model.fromJSON(DEFAULT_CONTENT);
        expect(tracker.activeCell).to.be(null);
        Widget.attach(panel, document.body);
        simulate(panel.node, 'focus');
        expect(tracker.activeCell).to.be.a(BaseCellWidget);
        panel.dispose();
      });

    });

    describe('#activeCellChanged', () => {

      it('should emit a signal when the active cell changes', () => {
        let tracker = new NotebookTracker({ namespace: NAMESPACE });
        let panel = new NotebookPanel({ rendermime, clipboard, renderer });
        let count = 0;
        tracker.activeCellChanged.connect(() => { count++; });
        panel.context = createNotebookContext();
        panel.content.model.fromJSON(DEFAULT_CONTENT);
        tracker.add(panel);
        expect(count).to.be(0);
        Widget.attach(panel, document.body);
        simulate(panel.node, 'focus');
        expect(count).to.be(1);
        panel.content.activeCellIndex = 1;
        expect(count).to.be(2);
        panel.dispose();
      });

    });

    describe('#onCurrentChanged()', () => {

      it('should be called when the active cell changes', () => {
        let tracker = new TestTracker({ namespace: NAMESPACE });
        let panel = new NotebookPanel({ rendermime, clipboard, renderer});
        tracker.add(panel);
        panel.context = createNotebookContext();
        panel.content.model.fromJSON(DEFAULT_CONTENT);
        expect(tracker.methods).to.not.contain('onCurrentChanged');
        Widget.attach(panel, document.body);
        simulate(panel.node, 'focus');
        expect(tracker.methods).to.contain('onCurrentChanged');
        panel.dispose();
      });

    });

  });

});
