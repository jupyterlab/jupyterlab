// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IKernel
} from 'jupyter-js-services';

import {
  MockKernel, ERROR_INPUT
} from 'jupyter-js-services/lib/mockkernel';

import {
  MimeData
} from 'phosphor-dragdrop';

import {
  CodeCellWidget, MarkdownCellWidget, RawCellWidget
} from '../../../../lib/notebook/cells/widget';

import {
 NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  NotebookActions, JUPYTER_CELL_MIME
} from '../../../../lib/notebook/notebook/actions';

import {
  Notebook
} from '../../../../lib/notebook/notebook/widget';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';

import {
  DEFAULT_CONTENT
} from '../utils';


const clipboard = new MimeData();


describe('notebook/notebook/actions', () => {

  describe('NotebookActions', () => {

    let widget: Notebook;
    let kernel: IKernel;

    beforeEach(() => {
      widget = new Notebook({ rendermime: defaultRenderMime() });
      let model = new NotebookModel();
      model.fromJSON(DEFAULT_CONTENT);
      widget.model = model;

      kernel = new MockKernel({ name: 'python' });
      widget.activeCellIndex = 0;
    });

    afterEach(() => {
      widget.dispose();
      kernel.dispose();
      clipboard.clear();
    });

    describe('#splitCell()', () => {

      it('should split the active cell into two cells', () => {
        let cell = widget.activeCell;
        let source = 'thisisasamplestringwithnospaces';
        cell.model.source = source;
        let index = widget.activeCellIndex;
        cell.editor.setCursorPosition(10);
        NotebookActions.splitCell(widget);
        let cells = widget.model.cells;
        let newSource = cells.get(index).source + cells.get(index + 1).source;
        expect(newSource).to.be(source);
      });

      it('should remove leading white space in the second cell', () => {
        let cell = widget.activeCell;
        let source = 'this\n\n   is a test';
        cell.model.source = source;
        cell.editor.setCursorPosition(4);
        NotebookActions.splitCell(widget);
        expect(widget.activeCell.model.source).to.be('is a test');
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          widget.select(widget.childAt(i));
        }
        NotebookActions.splitCell(widget);
        for (let i = 0; i < widget.childCount(); i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.childAt(i))).to.be(false);
        }
      });

      it('should activate the second cell', () => {
        NotebookActions.splitCell(widget);
        expect(widget.activeCellIndex).to.be(1);
      });

      it('should preserve the types of each cell', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        NotebookActions.splitCell(widget);
        expect(widget.activeCell).to.be.a(MarkdownCellWidget);
        let prev = widget.childAt(0);
        expect(prev).to.be.a(MarkdownCellWidget);
      });

      it('should create two empty cells if there is no content', () => {
        widget.activeCell.model.source = '';
        NotebookActions.splitCell(widget);
        expect(widget.activeCell.model.source).to.be('');
        let prev = widget.childAt(0);
        expect(prev.model.source).to.be('');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.splitCell(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.splitCell(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.splitCell(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        let source = widget.activeCell.model.source;
        let count = widget.childCount();
        NotebookActions.splitCell(widget);
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count);
        let cell = widget.childAt(0);
        expect(cell.model.source).to.be(source);
      });

    });

    describe('#mergeCells', () => {

      it('should merge the selected cells', () => {
        let source = widget.activeCell.model.source + '\n\n';
        let next = widget.childAt(1);
        source += next.model.source;
        widget.select(next);
        let count = widget.childCount();
        NotebookActions.mergeCells(widget);
        expect(widget.childCount()).to.be(count - 1);
        expect(widget.activeCell.model.source).to.be(source);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should select the next cell if there is only one cell selected', () => {
        let source = widget.activeCell.model.source + '\n\n';
        let next = widget.childAt(1);
        source += next.model.source;
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell.model.source).to.be(source);
      });

      it('should clear the outputs of a code cell', () => {
        NotebookActions.mergeCells(widget);
        let cell = widget.activeCell as CodeCellWidget;
        expect(cell.model.outputs.length).to.be(0);
      });

      it('should preserve the widget mode', () => {
        widget.mode = 'edit';
        NotebookActions.mergeCells(widget);
        expect(widget.mode).to.be('edit');
        widget.mode = 'command';
        NotebookActions.mergeCells(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be undo-able', () => {
        let source = widget.activeCell.model.source;
        let count = widget.childCount();
        NotebookActions.mergeCells(widget);
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count);
        let cell = widget.childAt(0);
        expect(cell.model.source).to.be(source);
      });

      it('should unrender a markdown cell', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        let cell = widget.activeCell as MarkdownCellWidget;
        cell.rendered = true;
        NotebookActions.mergeCells(widget);
        cell = widget.activeCell as MarkdownCellWidget;
        expect(cell.rendered).to.be(false);
      });

      it('should preserve the cell type of the active cell', () => {
        NotebookActions.changeCellType(widget, 'raw');
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell).to.be.a(RawCellWidget);
      });

    });

    describe('#deleteCells()', () => {

      it('should delete the selected cells', () => {
        let next = widget.childAt(1);
        widget.select(next);
        let count = widget.childCount();
        NotebookActions.deleteCells(widget);
        expect(widget.childCount()).to.be(count - 2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.deleteCells(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should switch to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.deleteCells(widget);
        expect(widget.mode).to.be('command');
      });

      it('should activate the cell after the last selected cell', () => {
        widget.activeCellIndex = 4;
        let prev = widget.childAt(2);
        widget.select(prev);
        NotebookActions.deleteCells(widget);
        expect(widget.activeCellIndex).to.be(3);
      });

      it('should select the previous cell if the last cell is deleted', () => {
        widget.select(widget.childAt(widget.childCount() - 1));
        NotebookActions.deleteCells(widget);
        expect(widget.activeCellIndex).to.be(widget.childCount() - 1);
      });

      it('should add a code cell if all cells are deleted', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          widget.select(widget.childAt(i));
        }
        NotebookActions.deleteCells(widget);
        expect(widget.childCount()).to.be(1);
        expect(widget.activeCell).to.be.a(CodeCellWidget);
      });

      it('should be undo-able', () => {
        let next = widget.childAt(1);
        widget.select(next);
        let source = widget.activeCell.model.source;
        let count = widget.childCount();
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count);
        let cell = widget.childAt(0);
        expect(cell.model.source).to.be(source);
      });

    });

    describe('#insertAbove()', () => {

      it('should insert a code cell above the active cell', () => {
        let count = widget.childCount();
        NotebookActions.insertAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
        expect(widget.childCount()).to.be(count + 1);
        expect(widget.activeCell).to.be.a(CodeCellWidget);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.insertAbove(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should widget mode should be preserved', () => {
        NotebookActions.insertAbove(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.insertAbove(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        let count = widget.childCount();
        NotebookActions.insertAbove(widget);
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          widget.select(widget.childAt(i));
        }
        NotebookActions.insertAbove(widget);
        for (let i = 0; i < widget.childCount(); i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.childAt(i))).to.be(false);
        }
      });

      it('should be the new active cell', () => {
        NotebookActions.insertAbove(widget);
        expect(widget.activeCell.model.source).to.be('');
      });

    });

    describe('#insertBelow()', () => {

      it('should insert a code cell below the active cell', () => {
        let count = widget.childCount();
        NotebookActions.insertBelow(widget);
        expect(widget.activeCellIndex).to.be(1);
        expect(widget.childCount()).to.be(count + 1);
        expect(widget.activeCell).to.be.a(CodeCellWidget);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.insertBelow(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should widget mode should be preserved', () => {
        NotebookActions.insertBelow(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.insertBelow(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        let count = widget.childCount();
        NotebookActions.insertBelow(widget);
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          widget.select(widget.childAt(i));
        }
        NotebookActions.insertBelow(widget);
        for (let i = 0; i < widget.childCount(); i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.childAt(i))).to.be(false);
        }
      });

      it('should be the new active cell', () => {
        NotebookActions.insertBelow(widget);
        expect(widget.activeCell.model.source).to.be('');
      });

    });

    describe('#changeCellType()', () => {

      it('should change the selected cell type(s)', () => {
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.changeCellType(widget, 'raw');
        expect(widget.activeCell).to.be.a(RawCellWidget);
        next = widget.childAt(widget.activeCellIndex + 1);
        expect(next).to.be.a(RawCellWidget);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.changeCellType(widget, 'code');
        expect(widget.activeCell).to.be(void 0);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.changeCellType(widget, 'code');
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.changeCellType(widget, 'raw');
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        NotebookActions.changeCellType(widget, 'raw');
        NotebookActions.undo(widget);
        let cell = widget.childAt(0);
        expect(cell).to.be.a(CodeCellWidget);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          widget.select(widget.childAt(i));
        }
        NotebookActions.changeCellType(widget, 'raw');
        for (let i = 0; i < widget.childCount(); i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.childAt(i))).to.be(false);
        }
      });

      it('should unrender markdown cells', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        let cell = widget.activeCell as MarkdownCellWidget;
        expect(cell.rendered).to.be(false);
      });

    });

    describe('#run()', () => {

      it('should run the selected cells', (done) => {
        let next = widget.childAt(1) as MarkdownCellWidget;
        widget.select(next);
        let cell = widget.activeCell as CodeCellWidget;
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.run(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
          done();
        });
      });

      it('should be a no-op if there is no model', (done) => {
        widget.model = null;
        NotebookActions.run(widget, kernel).then(result => {
          expect(result).to.be(false);
          done();
        });
      });

      it('should activate the last selected cell', (done) => {
        let other = widget.childAt(2);
        widget.select(other);
        NotebookActions.run(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.activeCell).to.be(other);
          done();
        });
      });

      it('should clear the selection', (done) => {
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.run(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.isSelected(widget.childAt(0))).to.be(false);
          done();
        });
      });

      it('should change to command mode', (done) => {
        widget.mode = 'edit';
        NotebookActions.run(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.mode).to.be('command');
          done();
        });
      });

      it('should handle no kernel', (done) => {
        NotebookActions.run(widget, null).then(result => {
          expect(result).to.be(true);
          let cell = widget.activeCell as CodeCellWidget;
          expect(cell.model.executionCount).to.be(null);
          done();
        });
      });

      it('should stop executing code cells on an error', (done) => {
        let cell = widget.model.factory.createCodeCell();
        cell.source = ERROR_INPUT;
        widget.model.cells.insert(2, cell);
        widget.select(widget.childAt(2));
        cell = widget.model.factory.createCodeCell();
        widget.model.cells.add(cell);
        widget.select(widget.childAt(widget.childCount() - 1));
        NotebookActions.run(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          done();
        });
      });

      it('should render all markdown cells on an error', () => {
        let cell = widget.model.factory.createMarkdownCell();
        widget.model.cells.add(cell);
        let child = widget.childAt(widget.childCount() - 1) as MarkdownCellWidget;
        child.rendered = false;
        widget.select(child);
        widget.activeCell.model.source = ERROR_INPUT;
        NotebookActions.run(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(child.rendered).to.be(true);
        });
      });

    });

    describe('#runAndAdvance()', () => {

      it('should run the selected cells ', (done) => {
        let next = widget.childAt(1) as MarkdownCellWidget;
        widget.select(next);
        let cell = widget.activeCell as CodeCellWidget;
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
          done();
        });
      });

      it('should be a no-op if there is no model', (done) => {
        widget.model = null;
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(false);
          done();
        });
      });

      it('should clear the existing selection', (done) => {
        let next = widget.childAt(2);
        widget.select(next);
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.isSelected(widget.childAt(0))).to.be(false);
          done();
        });
      });

      it('should change to command mode', (done) => {
        widget.mode = 'edit';
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.mode).to.be('command');
          done();
        });
      });

      it('should activate the cell after the last selected cell', (done) => {
        let next = widget.childAt(3) as MarkdownCellWidget;
        widget.select(next);
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.activeCellIndex).to.be(4);
          done();
        });
      });

      it('should create a new code cell in edit mode if necessary', (done) => {
        let count = widget.childCount();
        widget.activeCellIndex = count - 1;
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.childCount()).to.be(count + 1);
          expect(widget.activeCell).to.be.a(CodeCellWidget);
          expect(widget.mode).to.be('edit');
          done();
        });
      });

      it('should allow an undo of the new cell', (done) => {
        let count = widget.childCount();
        widget.activeCellIndex = count - 1;
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(true);
          NotebookActions.undo(widget);
          expect(widget.childCount()).to.be(count);
          done();
        });
      });

      it('should stop executing code cells on an error', (done) => {
        widget.activeCell.model.source = ERROR_INPUT;
        let cell = widget.model.factory.createCodeCell();
        widget.model.cells.add(cell);
        widget.select(widget.childAt(widget.childCount() - 1));
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          done();
        });
      });

      it('should render all markdown cells on an error', (done) => {
        widget.activeCell.model.source = ERROR_INPUT;
        let cell = widget.childAt(1) as MarkdownCellWidget;
        cell.rendered = false;
        widget.select(cell);
        NotebookActions.runAndAdvance(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(cell.rendered).to.be(true);
          expect(widget.activeCellIndex).to.be(2);
          done();
        });
      });

    });

    describe('#runAndInsert()', () => {

      it('should run the selected cells ', (done) => {
        let next = widget.childAt(1) as MarkdownCellWidget;
        widget.select(next);
        let cell = widget.activeCell as CodeCellWidget;
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.runAndInsert(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
          done();
        });
      });

      it('should be a no-op if there is no model', (done) => {
        widget.model = null;
        NotebookActions.runAndInsert(widget, kernel).then(result => {
          expect(result).to.be(false);
          done();
        });
      });

      it('should clear the existing selection', (done) => {
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.runAndInsert(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.isSelected(widget.childAt(0))).to.be(false);
          done();
        });
      });

      it('should insert a new code cell in edit mode after the last selected cell', (done) => {
        let next = widget.childAt(2);
        widget.select(next);
        let count = widget.childCount();
        NotebookActions.runAndInsert(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.activeCell).to.be.a(CodeCellWidget);
          expect(widget.mode).to.be('edit');
          expect(widget.childCount()).to.be(count + 1);
          done();
        });
      });

      it('should allow an undo of the cell insert', (done) => {
        let next = widget.childAt(2);
        widget.select(next);
        let count = widget.childCount();
        NotebookActions.runAndInsert(widget, kernel).then(result => {
          expect(result).to.be(true);
          NotebookActions.undo(widget);
          expect(widget.childCount()).to.be(count);
          done();
        });
      });

      it('should stop executing code cells on an error', (done) => {
        widget.activeCell.model.source = ERROR_INPUT;
        let cell = widget.model.factory.createCodeCell();
        widget.model.cells.add(cell);
        widget.select(widget.childAt(widget.childCount() - 1));
        NotebookActions.runAndInsert(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          done();
        });
      });

      it('should render all markdown cells on an error', (done) => {
        widget.activeCell.model.source = ERROR_INPUT;
        let cell = widget.childAt(1) as MarkdownCellWidget;
        cell.rendered = false;
        widget.select(cell);
        NotebookActions.runAndInsert(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(cell.rendered).to.be(true);
          expect(widget.activeCellIndex).to.be(2);
          done();
        });
      });

    });

    describe('#runAll()', () => {

      it('should run all of the cells in the notebok', (done) => {
        let next = widget.childAt(1) as MarkdownCellWidget;
        let cell = widget.activeCell as CodeCellWidget;
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.runAll(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
          done();
        });
      });

      it('should be a no-op if there is no model', (done) => {
        widget.model = null;
        NotebookActions.runAll(widget, kernel).then(result => {
          expect(result).to.be(false);
          done();
        });
      });

      it('should change to command mode', (done) => {
        widget.mode = 'edit';
        NotebookActions.runAll(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.mode).to.be('command');
          done();
        });
      });

      it('should clear the existing selection', (done) => {
        let next = widget.childAt(2);
        widget.select(next);
        NotebookActions.runAll(widget, kernel).then(result => {
          expect(result).to.be(true);
          expect(widget.isSelected(widget.childAt(2))).to.be(false);
          done();
        });
      });

      it('should activate the last cell', (done) => {
        NotebookActions.runAll(widget, kernel).then(result => {
          expect(widget.activeCellIndex).to.be(widget.childCount() - 1);
          done();
        });
      });

      it('should stop executing code cells on an error', (done) => {
        widget.activeCell.model.source = ERROR_INPUT;
        let cell = widget.model.factory.createCodeCell();
        widget.model.cells.add(cell);
        NotebookActions.runAll(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          expect(widget.activeCellIndex).to.be(widget.childCount() - 1);
          done();
        });
      });

      it('should render all markdown cells on an error', (done) => {
        widget.activeCell.model.source = ERROR_INPUT;
        let cell = widget.childAt(1) as MarkdownCellWidget;
        cell.rendered = false;
        NotebookActions.runAll(widget, kernel).then(result => {
          expect(result).to.be(false);
          expect(cell.rendered).to.be(true);
          done();
        });
      });

    });

    describe('#selectAbove()', () => {

      it('should select the cell above the active cell', () => {
        widget.activeCellIndex = 1;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should not wrap around to the bottom', () => {
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should preserve the mode', () => {
        widget.activeCellIndex = 2;
        NotebookActions.selectAbove(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.selectAbove(widget);
        expect(widget.mode).to.be('edit');
      });

    });

    describe('#selectBelow()', () => {

      it('should select the cell below the active cell', () => {
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).to.be(1);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should not wrap around to the top', () => {
        widget.activeCellIndex = widget.childCount() - 1;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).to.not.be(0);
      });

      it('should preserve the mode', () => {
        widget.activeCellIndex = 2;
        NotebookActions.selectBelow(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.selectBelow(widget);
        expect(widget.mode).to.be('edit');
      });

    });

    describe('#extendSelectionAbove()', () => {

      it('should extend the selection to the cell above', () => {
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.isSelected(widget.childAt(0))).to.be(true);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.mode).to.be('command');
      });

      it('should not wrap around to the bottom', () => {
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
        let last = widget.childAt(widget.childCount() - 1);
        expect(widget.isSelected(last)).to.be(false);
      });

      it('should activate the cell', () => {
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
      });

    });

    describe('#extendSelectionBelow()', () => {

      it('should extend the selection to the cell below', () => {
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.isSelected(widget.childAt(0))).to.be(true);
        expect(widget.isSelected(widget.childAt(1))).to.be(true);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.mode).to.be('command');
      });

      it('should not wrap around to the bottom', () => {
        let last = widget.childCount() - 1;
        widget.activeCellIndex = last;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).to.be(last);
        expect(widget.isSelected(widget.childAt(0))).to.be(false);
      });

      it('should activate the cell', () => {
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).to.be(1);
      });

    });

    describe('#copy()', () => {

      it('should copy the selected cells to a clipboard', () => {
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.copy(widget, clipboard);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(true);
        let data = clipboard.getData(JUPYTER_CELL_MIME);
        expect(data.length).to.be(2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.copy(widget, clipboard);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(false);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.copy(widget, clipboard);
        expect(widget.mode).to.be('command');
      });

    });

    describe('#cut()', () => {

      it('should cut the selected cells to a clipboard', () => {
        let next = widget.childAt(1);
        widget.select(next);
        let count = widget.childCount();
        NotebookActions.cut(widget, clipboard);
        expect(widget.childCount()).to.be(count - 2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.cut(widget, clipboard);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(false);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.cut(widget, clipboard);
        expect(widget.mode).to.be('command');
      });

      it('should be undo-able', () => {
        let source = widget.activeCell.model.source;
        NotebookActions.cut(widget, clipboard);
        NotebookActions.undo(widget);
        expect(widget.childAt(0).model.source).to.be(source);
      });

      it('should add a new code cell if all cells were cut', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          widget.select(widget.childAt(i));
        }
        NotebookActions.cut(widget, clipboard);
        expect(widget.childCount()).to.be(1);
        expect(widget.activeCell).to.be.a(CodeCellWidget);
      });

    });

    describe('#paste()', () => {

      it('should paste cells from a clipboard', () => {
        let source = widget.activeCell.model.source;
        let next = widget.childAt(1);
        widget.select(next);
        let count = widget.childCount();
        NotebookActions.cut(widget, clipboard);
        widget.activeCellIndex = 1;
        NotebookActions.paste(widget, clipboard);
        expect(widget.childCount()).to.be(count);
        expect(widget.childAt(1).model.source).to.be(source);
      });

      it('should be a no-op if there is no model', () => {
        NotebookActions.copy(widget, clipboard);
        widget.model = null;
        NotebookActions.paste(widget, clipboard);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should be a no-op if there is no cell data on the clipboard', () => {
        let count = widget.childCount();
        NotebookActions.paste(widget, clipboard);
        expect(widget.childCount()).to.be(count);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.cut(widget, clipboard);
        NotebookActions.paste(widget, clipboard);
        expect(widget.mode).to.be('command');
      });

      it('should be undo-able', () => {
        let next = widget.childAt(1);
        widget.select(next);
        let count = widget.childCount();
        NotebookActions.cut(widget, clipboard);
        widget.activeCellIndex = 1;
        NotebookActions.paste(widget, clipboard);
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count - 2);
      });

    });

    describe('#undo()', () => {

      it('should undo a cell action', () => {
        let count = widget.childCount();
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count);
      });

      it('should switch the widget to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.undo(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.undo(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should be a no-op if there are no cell actions to undo', () => {
        let count = widget.childCount();
        NotebookActions.deleteCells(widget);
        widget.model.cells.clearUndo();
        NotebookActions.undo(widget);
        expect(widget.childCount()).to.be(count - 1);
      });

    });

    describe('#redo()', () => {

      it('should redo a cell action', () => {
        let count = widget.childCount();
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        NotebookActions.redo(widget);
        expect(widget.childCount()).to.be(count - 2);
      });

      it('should switch the widget to command mode', () => {
        NotebookActions.undo(widget);
        widget.mode = 'edit';
        NotebookActions.redo(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be a no-op if there is no model', () => {
        NotebookActions.undo(widget);
        widget.model = null;
        NotebookActions.redo(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should be a no-op if there are no cell actions to redo', () => {
        let count = widget.childCount();
        NotebookActions.redo(widget);
        expect(widget.childCount()).to.be(count);
      });

    });

    describe('#toggleLineNumbers()', () => {

      it('should toggle line numbers on the selected cells', () => {
        let state = widget.activeCell.editor.lineNumbers;
        NotebookActions.toggleLineNumbers(widget);
        expect(widget.activeCell.editor.lineNumbers).to.be(!state);
      });

      it('should be based on the state of the active cell', () => {
        let state = widget.activeCell.editor.lineNumbers;
        let next = widget.childAt(1);
        next.editor.lineNumbers = !state;
        widget.select(next);
        NotebookActions.toggleLineNumbers(widget);
        expect(widget.childAt(0).editor.lineNumbers).to.be(!state);
        expect(widget.childAt(1).editor.lineNumbers).to.be(!state);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.toggleLineNumbers(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.toggleLineNumbers(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.toggleLineNumbers(widget);
        expect(widget.activeCellIndex).to.be(-1)
      });

    });

    describe('#toggleAllLineNumbers()', () => {

      it('should toggle line numbers on all cells', () => {
        let state = widget.activeCell.editor.lineNumbers;
        NotebookActions.toggleAllLineNumbers(widget);
        for (let i = 0; i < widget.childCount(); i++) {
          expect(widget.childAt(i).editor.lineNumbers).to.be(!state);
        }
      });

      it('should be based on the state of the active cell', () => {
        let state = widget.activeCell.editor.lineNumbers;
        for (let i = 1; i < widget.childCount(); i++) {
          widget.childAt(i).editor.lineNumbers = !state;
        }
        NotebookActions.toggleAllLineNumbers(widget);
        for (let i = 0; i < widget.childCount(); i++) {
          expect(widget.childAt(i).editor.lineNumbers).to.be(!state);
        }
      });

      it('should preserve the widget mode', () => {
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

    });

    describe('#clearOutputs()', () => {

      it('should clear the outputs on the selected cells', () => {
        // Select the next code cell that has outputs.
        let index = 0;
        for (let i = 1; i < widget.childCount(); i++) {
          let cell = widget.childAt(i);
          if (cell instanceof CodeCellWidget && cell.model.outputs.length) {
            widget.select(cell);
            index = i;
            break;
          }
        }
        NotebookActions.clearOutputs(widget);
        let cell = widget.childAt(0) as CodeCellWidget;
        expect(cell.model.outputs.length).to.be(0);
        cell = widget.childAt(index) as CodeCellWidget;
        expect(cell.model.outputs.length).to.be(0);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.clearOutputs(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.clearOutputs(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.clearOutputs(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

    });

    describe('#clearAllOutputs()', () => {

      it('should clear the outputs on all cells', () => {
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.clearAllOutputs(widget);
        for (let i = 0; i < widget.childCount(); i++) {
          let cell = widget.childAt(i);
          if (cell instanceof CodeCellWidget) {
            expect(cell.model.outputs.length).to.be(0);
          }
        }
      });

      it('should preserve the widget mode', () => {
        NotebookActions.clearAllOutputs(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.clearAllOutputs(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.clearAllOutputs(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

    });

    describe('#setMarkdownHeader()', () => {

      it('should set the markdown header level of selected cells', () => {
        let next = widget.childAt(1);
        widget.select(next);
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell.model.source.slice(0, 3)).to.be('## ');
        expect(next.model.source.slice(0, 3)).to.be('## ');
      });

      it('should convert the cells to markdown type', () => {
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell).to.be.a(MarkdownCellWidget);
      });

      it('should be clamped between 1 and 6', () => {
        NotebookActions.setMarkdownHeader(widget, -1);
        expect(widget.activeCell.model.source.slice(0, 2)).to.be('# ');
        NotebookActions.setMarkdownHeader(widget, 10);
        expect(widget.activeCell.model.source.slice(0, 7)).to.be('###### ');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.setMarkdownHeader(widget, 1);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should replace an existing header', () => {
        widget.activeCell.model.source = '# foo';
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell.model.source).to.be('## foo');
      });

      it('should replace leading white space', () => {
        widget.activeCell.model.source = '      foo';
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell.model.source).to.be('## foo');
      });

      it('should unrender the cells', () => {
        NotebookActions.setMarkdownHeader(widget, 1);
        expect((widget.activeCell as MarkdownCellWidget).rendered).to.be(false);
      });

    });

  });

});
