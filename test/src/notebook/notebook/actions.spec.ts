// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IKernel
} from 'jupyter-js-services';

import {
  MockKernel
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
  NotebookActions
} from '../../../../lib/notebook/notebook/actions';

import {
  Notebook
} from '../../../../lib/notebook/notebook/widget';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';

import {
  acceptDialog, dismissDialog, KERNELSPECS, getKernelInfo
} from '../../utils';

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
      (kernel as MockKernel).setKernelInfo(getKernelInfo('python'));
      let spec = KERNELSPECS.kernelspecs['python'].spec;
      (kernel as MockKernel).setKernelSpec(spec);
      widget.activeCellIndex = 0;
    });

    afterEach(() => {
      widget.dispose();
      kernel.dispose();
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

      it('should activate the cell before the first selected cell', () => {
        widget.activeCellIndex = 4;
        let prev = widget.childAt(2);
        widget.select(prev);
        NotebookActions.deleteCells(widget);
        expect(widget.activeCellIndex).to.be(1);
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

      it('should run the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should maintain the existing selection', () => {

      });

      it('should change to command mode', () => {

      });

    });

    describe('#runAndAdvance()', () => {

      it('should run the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should clear the existing selection', () => {

      });

      it('should change to command mode', () => {

      });

      it('should activate the cell after the last selected cell', () => {

      });

      it('should create a new code cell in edit mode if necessary', () => {

      });

      it('should allow an undo of the new cell', () => {

      });

    });

    describe('#runAndInsert()', () => {

      it('should run the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should change to command mode', () => {

      });

      it('should clear the existing selection', () => {

      });

      it('should have an undo-able cell insert', () => {

      });

    });

    describe('#runAll()', () => {

      it('should run the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should change to command mode', () => {

      });

      it('should clear the existing selection', () => {

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
        expect(widget.activeCellIndex).to.be(1);
        expect(widget.isSelected(widget.childAt(0))).to.be(true);
      });

      it('should be a no-op if there is no model', () => {

      });

      it('should change to command mode', () => {

      });

      it('should not wrap around to the bottom', () => {

      });

      it('should activate the cell', () => {

      });

    });

    describe('#extendSelectionBelow()', () => {

      it('should extend the selection to the cell below', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should change to command mode', () => {

      });

      it('should not wrap around to the top', () => {

      });

      it('should activate the cell', () => {

      });

    });

    describe('#copy()', () => {

      it('should copy the selected cells to a clipboard', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should change to command mode', () => {

      });

    });

    describe('#cut()', () => {

      it('should cut the selected cells to a clipboard', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should change to command mode', () => {

      });

      it('should be undo-able', () => {

      });

    });

    describe('#paste()', () => {

      it('should paste cells from a clipboard', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be a no-op if there is no cell data on the clipboard', () => {

      });

      it('should change to command mode', () => {

      });

      it('should be undo-able', () => {

      });

    });

    describe('#undo()', () => {

      it('should undo a cell action', () => {

      });

      it('should switch the widget to command mode', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be a no-op if there are no cell actions to undo', () => {

      });

    });

    describe('#redo()', () => {

      it('should redo a cell action', () => {

      });

      it('should switch the widget to command mode', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be a no-op if there are no cell actions to redo', () => {

      });

    });

    describe('#toggeLineNumbers()', () => {

      it('should toggle line numbers on the selected cells', () => {

      });

      it('should be based on the state of the active cell', () => {

      });

      it('should preserve the widget mode', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

    });

    describe('#toggleAllLineNumbers()', () => {

      it('should toggle line numbers on all cells', () => {

      });

      it('should be based on the state of the active cell', () => {

      });

      it('should preserve the widget mode', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

    });

    describe('#clearOutputs()', () => {

      it('should clear the outputs on the selected cells', () => {

      });

      it('should switch the widget to command mode', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

    });

    describe('#clearAllOutputs()', () => {

      it('should clear the outputs on all cells', () => {

      });

      it('should switch the widget to command mode', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

    });

  });

});
