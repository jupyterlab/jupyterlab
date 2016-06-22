// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CellModel
} from '../../../../lib/notebook/cells';

import {
  CellEditorWidget
} from '../../../../lib/notebook/cells/editor';


describe('notebook/cells/editor', () => {

  describe('CellEditorWidget', () => {

    describe('#constructor()', () => {

      it('should create a cell editor widget', () => {
        let model = new CellEditorWidget(new CellModel());
        expect(model).to.be.a(CellEditorWidget);
      });

    });

  });

});
