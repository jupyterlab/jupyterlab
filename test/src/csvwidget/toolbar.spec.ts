// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CSVToolbar
} from '../../../lib/csvwidget/toolbar';


describe('csvwidget/table', () => {

  describe('CSVToolbar', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVToolbar`', () => {
        let toolbar = new CSVToolbar();
        expect(toolbar).to.be.a(CSVToolbar);
        expect(toolbar.node.classList).to.contain('jp-CSVToolbar');
      });

    });

  });

});
