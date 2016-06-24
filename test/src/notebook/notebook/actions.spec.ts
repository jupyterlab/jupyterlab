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
    });

    afterEach(() => {
      widget.dispose();
      kernel.dispose();
    });

    describe('#splitCell()', () => {

      it('should split the active cell into two cells', () => {

      });

      it('should remove leading white space in the second cell', () => {

      });

      it('should clear the existing selection', () => {

      });

      it('should activate the second cell', () => {

      });

      it('should preserve the types of each cell', () => {

      });

      it('should create two empty cells if there is no content', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be undo-able', () => {

      });

    });

    describe('#mergeCells', () => {

      it('should merge the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be a no-op if only one cell is selected', () => {

      });

      it('should clear the existing selection', () => {

      });

      it('should be undo-able', () => {

      });

      it('should unrender a markdown cell', () => {

      });

      it('should preserve the cell type of the active cell', () => {

      });

    });

    describe('#deleteCells()', () => {

      it('should delete the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be undo-able', () => {

      });

    });

    describe('#insertAbove()', () => {

      it('should insert a code cell above the active cell', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be undo-able', () => {

      });

      it('should clear the existing selection', () => {

      });

      it('should be the new active cell', () => {

      });

    });

    describe('#insertBelow()', () => {

      it('should insert a code cell below the active cell', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be undo-able', () => {

      });

      it('should clear the existing selection', () => {

      });

      it('should be the new active cell', () => {

      });

    });

    describe('#changeCellType()', () => {

      it('should change the selected cell type(s)', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be undo-able', () => {

      });

      it('should clear the existing selection', () => {

      });

    });

    describe('#run()', () => {

      it('should run the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should maintain the existing selection', () => {

      });

    });

    describe('#runAndAdvance()', () => {

      it('should run the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should clear the existing selection', () => {

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

      it('should clear the existing selection', () => {

      });

    });

    describe('#selectAbove()', () => {

      it('should select the cell above the active cell', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should not wrap around to the bottom', () => {

      });

      it('should clear the existing selection', () => {

      });

    });

    describe('#selectBelow()', () => {

      it('should select the cell below the active cell', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should not wrap around to the top', () => {

      });

      it('should clear the existing selection', () => {

      });

    });

    describe('#extendSelectionAbove()', () => {

      it('should extend the selection to the cell above', () => {

      });

      it('should be a no-op if there is no model', () => {

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

      it('should clear the existing selection', () => {

      });

    });

    describe('#cut()', () => {

      it('should cut the selected cells to a clipboard', () => {

      });

      it('should be a no-op if there is no model', () => {

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

      it('should switch the widget to command mode', () => {

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

  });

});
