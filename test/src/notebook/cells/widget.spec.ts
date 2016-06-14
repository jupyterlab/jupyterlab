// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  BaseCellWidget, CellModel, InputAreaWidget
} from '../../../../lib/notebook/cells';

import {
  CellEditorWidget
} from '../../../../lib/notebook/cells/editor';


describe('jupyter-js-notebook', () => {

  describe('BaseCellWidget', () => {

    describe('.createCellEditor()', () => {

      it('should create a cell editor widget', () => {
        let editor = BaseCellWidget.createCellEditor(new CellModel());
        expect(editor).to.be.a(CellEditorWidget);
      });

    });

    describe('.createInputArea()', () => {

      it('should create an input area widget', () => {
        let editor = BaseCellWidget.createCellEditor(new CellModel());
        let input = BaseCellWidget.createInputArea(editor);
        expect(input).to.be.a(InputAreaWidget);
      });

    });

    describe('#constructor()', () => {

      it('should create a base cell widget', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(widget).to.be.a(BaseCellWidget);
      });

    });

  });



});
