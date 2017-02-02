// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  SplitPanel
} from 'phosphor/lib/ui/splitpanel';

import {
  TabPanel
} from 'phosphor/lib/ui/tabpanel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
 CellTools, NotebookPanel, NotebookTracker
} from '../../../lib/notebook';

import {
  createNotebookPanel, populateNotebook
} from './utils';


describe('notebook/celltools', () => {

  let celltools: CellTools;
  let splitpanel: SplitPanel;
  let tabpanel: TabPanel;
  let tracker: NotebookTracker;
  let panel0: NotebookPanel;
  let panel1: NotebookPanel;

  beforeEach((done) => {
    tracker = new NotebookTracker({ namespace: 'notebook' });
    panel0 = createNotebookPanel();
    populateNotebook(panel0.notebook);
    panel1 = createNotebookPanel();
    populateNotebook(panel1.notebook);
    tracker.add(panel0);
    tracker.add(panel1);
    celltools = new CellTools({ tracker });
    tabpanel = new TabPanel();
    tabpanel.addWidget(panel0);
    tabpanel.addWidget(panel1);
    splitpanel = new SplitPanel();
    splitpanel.addWidget(celltools);
    splitpanel.addWidget(tabpanel);
    Widget.attach(splitpanel, document.body);
    tabpanel.currentIndex = 0;
    // Wait for posted messages.
    requestAnimationFrame(() => {
      done();
    });
  });

  afterEach(() => {
    splitpanel.dispose();
    tabpanel.dispose();
    celltools.dispose();
  });

  describe('CellTools', () => {

    describe('#constructor()', () => {

      it('should create a celltools object', () => {
        expect(celltools).to.be.a(CellTools);
      });

    });

    describe('#activeCellChanged', () => {

      it('should be emitted when the active cell changes', () => {
        let called = false;
        celltools.activeCellChanged.connect((sender, cell) => {
          expect(sender).to.be(tracker);
          expect(panel0.node.contains(cell.node)).to.be(true);
          called = true;
        });
        simulate(panel0.node, 'focus');
        expect(called).to.be(true);
      });

      it('should be emitted when the active notebook changes', () => {
        let called = false;
        simulate(panel0.node, 'focus');
        celltools.activeCellChanged.connect((sender, cell) => {
          expect(sender).to.be(tracker);
          expect(panel1.node.contains(cell.node)).to.be(true);
          called = true;
        });
        tabpanel.currentIndex = 1;
        simulate(panel1.node, 'focus');
        expect(called).to.be(true);
      });

    });

  });

});
