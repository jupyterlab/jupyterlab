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

  describe('#clear()', () => {

    it('should empty the items in a state database', done => {
      let { localStorage } = window;
      localStorage.clear();

      let namespace = 'test-namespace';
      let db = new StateDB({ namespace });

      expect(localStorage.length).to.be(0);
      db.save('foo', { bar: null })
        .then(() => { expect(localStorage.length).greaterThan(0); })
        .then(() => db.clear())
        .then(() => { expect(localStorage.length).to.be(0); })
        .then(done)
        .catch(done);
    });

    it('should only clear its own namespace', done => {
      let { localStorage } = window;
      localStorage.clear();

      let n1 = 'test-namespace-1';
      let n2 = 'test-namespace-3';
      let db1 = new StateDB({ namespace: n1 });
      let db2 = new StateDB({ namespace: n2 });

      expect(localStorage.length).to.be(0);
      db1.save('foo', { bar: null })
        .then(() => db2.save('baz', { qux: null }))
        .then(() => { expect(localStorage.length).greaterThan(0); })
        .then(() => db1.clear())
        .then(() => { expect(localStorage.length).greaterThan(0); })
        .then(() => db2.clear())
        .then(() => { expect(localStorage.length).to.be(0); })
        .then(done)
        .catch(done);
    });

  });

});
