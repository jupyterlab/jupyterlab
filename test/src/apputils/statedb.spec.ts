// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  StateDB
} from '@jupyterlab/apputils';


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

      let db = new StateDB({ namespace: 'test-namespace' });
      let key = 'foo:bar';
      let value = { qux: 'quux' };

      expect(localStorage.length).to.be(0);
      db.save(key, value)
        .then(() => { expect(localStorage).to.have.length(1); })
        .then(() => db.clear())
        .then(() => { expect(localStorage).to.be.empty(); })
        .then(done)
        .catch(done);
    });

    it('should only clear its own namespace', done => {
      let { localStorage } = window;
      localStorage.clear();

      let db1 = new StateDB({ namespace: 'test-namespace-1' });
      let db2 = new StateDB({ namespace: 'test-namespace-2' });

      expect(localStorage.length).to.be(0);
      db1.save('foo', { bar: null })
        .then(() => { expect(localStorage).to.have.length(1); })
        .then(() => db2.save('baz', { qux: null }))
        .then(() => { expect(localStorage).to.have.length(2); })
        .then(() => db1.clear())
        .then(() => { expect(localStorage).to.have.length(1); })
        .then(() => db2.clear())
        .then(() => { expect(localStorage).to.be.empty(); })
        .then(done)
        .catch(done);
    });

  });

  describe('#fetch()', () => {

    it('should fetch a stored key', done => {
      let { localStorage } = window;
      localStorage.clear();

      let db = new StateDB({ namespace: 'test-namespace' });
      let key = 'foo:bar';
      let value = { baz: 'qux' };

      expect(localStorage.length).to.be(0);
      db.save(key, value)
        .then(() => { expect(localStorage).to.have.length(1); })
        .then(() => db.fetch(key))
        .then(fetched => { expect(fetched).to.eql(value); })
        .then(() => db.clear())
        .then(done)
        .catch(done);
    });

    it('should resolve a nonexistent key fetch with null', done => {
      let { localStorage } = window;
      localStorage.clear();

      let db = new StateDB({ namespace: 'test-namespace' });
      let key = 'foo:bar';

      expect(localStorage.length).to.be(0);
      db.fetch(key)
        .then(fetched => { expect(fetched).to.be(null); })
        .then(done)
        .catch(done);
    });

  });

  describe('#fetchNamespace()', () => {

    it('should fetch a stored namespace', done => {
      let { localStorage } = window;
      localStorage.clear();

      let db = new StateDB({ namespace: 'test-namespace' });
      let keys = [
        'foo:bar',
        'foo:baz',
        'foo:qux',
        'abc:def',
        'abc:ghi',
        'abc:jkl'
      ];

      expect(localStorage.length).to.be(0);
      let promises = keys.map(key => db.save(key, { value: key }));
      Promise.all(promises)
        .then(() => { expect(localStorage).to.have.length(keys.length); })
        .then(() => db.fetchNamespace('foo'))
        .then(fetched => {
          expect(fetched.length).to.be(3);

          let sorted = fetched.sort((a, b) => a.id.localeCompare(b.id));

          expect(sorted[0].id).to.be(keys[0]);
          expect(sorted[1].id).to.be(keys[1]);
          expect(sorted[2].id).to.be(keys[2]);
        })
        .then(() => db.fetchNamespace('abc'))
        .then(fetched => {
          expect(fetched.length).to.be(3);

          let sorted = fetched.sort((a, b) => a.id.localeCompare(b.id));

          expect(sorted[0].id).to.be(keys[3]);
          expect(sorted[1].id).to.be(keys[4]);
          expect(sorted[2].id).to.be(keys[5]);
        })
        .then(() => db.clear())
        .then(done)
        .catch(done);
    });

  });

  describe('#remove()', () => {

    it('should remove a stored key', done => {
      let { localStorage } = window;
      localStorage.clear();

      let db = new StateDB({ namespace: 'test-namespace' });
      let key = 'foo:bar';
      let value = { baz: 'qux' };

      expect(localStorage.length).to.be(0);
      db.save(key, value)
        .then(() => { expect(localStorage).to.have.length(1); })
        .then(() => db.remove(key))
        .then(() => { expect(localStorage).to.be.empty(); })
        .then(done)
        .catch(done);
    });

  });

  describe('#save()', () => {

    it('should save a key and a value', done => {
      let { localStorage } = window;
      localStorage.clear();

      let db = new StateDB({ namespace: 'test-namespace' });
      let key = 'foo:bar';
      let value = { baz: 'qux' };

      expect(localStorage.length).to.be(0);
      db.save(key, value)
        .then(() => db.fetch(key))
        .then(fetched => { expect(fetched).to.eql(value); })
        .then(() => db.remove(key))
        .then(() => { expect(localStorage).to.be.empty(); })
        .then(done)
        .catch(done);
    });

  });

});
