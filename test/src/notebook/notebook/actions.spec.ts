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

      it('should remove existing selections', () => {

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

      it('should merged the selected cells', () => {

      });

      it('should be a no-op if there is no model', () => {

      });

      it('should be a no-op if only one cell is selected', () => {

      });

      it('should remove existing selections', () => {

      });

      it('should be undo-able', () => {

      });

      it('should unrender a markdown cell', () => {

      });

      it('should preserve the cell type of the active cell', () => {

      });

    });

  });

});
