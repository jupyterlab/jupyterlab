// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  DSVModel
} from '@jupyterlab/csvviewer';

describe('csvviewer/model', () => {

  describe('DSVModel', () => {

    describe('#constructor()', () => {

      it('should instantiate a `DSVModel`', () => {
        let d = new DSVModel({data: '1,2,3\n4,5,6\n', delimiter: ','});
        expect(d.rowCount('column-header')).to.be(1);
        expect(d.rowCount('body')).to.be(1);
        expect(d.columnCount('row-header')).to.be(1);
        expect(d.columnCount('body')).to.be(3);
        expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['1', '2', '3']);
        expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['4', '5', '6']);
      });

    });

  });

});
