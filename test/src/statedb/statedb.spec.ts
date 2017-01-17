// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  StateDB
} from '../../../lib/statedb/statedb';


describe('StateDB', () => {

  describe('#constructor()', () => {

    it('should create a state database', () => {
      let db = new StateDB({ namespace: 'test' });
      expect(db).to.be.a(StateDB);
    });

  });

});
