// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ForeignHandler
} from '../../../lib/console/foreign';


describe('console/foreign', () => {

  describe('ForeignHandler', () => {

    describe('#constructor()', () => {

      it('should create a new foreign handler', () => {
        let options: ForeignHandler.IOptions = {
          kernel: null,
          parent: null,
          renderer: { createCell: () => null }
        };
        let handler = new ForeignHandler(options);
        expect(handler).to.be.a(ForeignHandler);
      });

    });

  });

});
