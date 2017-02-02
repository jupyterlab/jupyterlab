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
    tabpanel.addWidget(celltools);
    tabpanel.node.style.height = '800px';
    Widget.attach(tabpanel, document.body);
    tabpanel.currentIndex = 0;
    // Wait for posted messages.
    requestAnimationFrame(() => {
      done();
    });
  });

  afterEach(() => {
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
          expect(sender).to.be(celltools);
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
          expect(sender).to.be(celltools);
          expect(panel1.node.contains(cell.node)).to.be(true);
          called = true;
        });
        tabpanel.currentIndex = 1;
        simulate(panel1.node, 'focus');
        expect(called).to.be(true);
      });

    });

    describe('#selectionChanged', () => {

      it('should be emitted when the selection changes', () => {
        let called = false;
        simulate(panel0.node, 'focus');
        celltools.selectionChanged.connect((sender) => {
          expect(sender).to.be(celltools);
          called = true;
        });
        panel0.notebook.select(panel0.notebook.widgets.at(1));
        expect(called).to.be(true);
      });

    });

    describe('#metadataChanged', () => {

      it('should be emitted when the metadata changes', () => {
        let called = false;
        simulate(panel0.node, 'focus');
        celltools.metadataChanged.connect((sender, args) => {
          expect(sender).to.be(celltools);
          expect(args.name).to.be('foo');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue).to.be(1);
          called = true;
        });
        let cursor = celltools.activeCell.model.getMetadata('foo');
        cursor.setValue(1);
        expect(called).to.be(true);
      });

    });

    describe('#activeCell', () => {

      it('should be the active cell', () => {
        expect(celltools.activeCell).to.be(null);
        simulate(panel0.node, 'focus');
        expect(celltools.activeCell).to.be(panel0.notebook.activeCell);
        tabpanel.currentIndex = 1;
        simulate(panel1.node, 'focus');
        expect(celltools.activeCell).to.be(panel1.notebook.activeCell);
      });

    });

    describe('#selectedCells', () => {

      it('should be the currently selected cells', () => {
        expect(celltools.selectedCells.length).to.be(0);
        simulate(panel0.node, 'focus');
        expect(celltools.selectedCells).to.eql([panel0.notebook.activeCell]);
        tabpanel.currentIndex = 1;
        simulate(panel1.node, 'focus');
        expect(celltools.selectedCells).to.eql([panel1.notebook.activeCell]);
        panel1.notebook.select(panel1.notebook.widgets.at(1));
        expect(celltools.selectedCells.length).to.be(2);
      });

    });

    describe('#addItem()', () => {

      it('should add a cell tool item', () => {
        let widget = new Widget();
        celltools.addItem({ widget });
        widget.dispose();
      });

      it('should accept a rank', () => {
        let widget = new Widget();
        celltools.addItem({ widget, rank: 100 });
        widget.dispose();
      });

    });

  });

});
