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

  describe('#maxLength', () => {

    it('should enforce the maximum length of a stored item', done => {
      let db = new StateDB({ namespace: 'test' });
      let key = 'test-key';
      let data = { a: (new Array<string>(db.maxLength)).join('A') };
      db.save(key, data)
        .then(() => { done('maxLength promise should have rejected'); })
        .catch(() => { done(); });
    });

  });

  describe('#namespace', () => {

    it('should be the read-only internal namespace', () => {
      let namespace = 'test-namespace';
      let db = new StateDB({ namespace });
      expect(db.namespace).to.be(namespace);
    });

  });

});
