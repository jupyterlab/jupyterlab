// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  StateDB
} from '@jupyterlab/coreutils';

import {
  PromiseDelegate, ReadonlyJSONObject
} from '@phosphor/coreutils';


describe('StateDB', () => {

  beforeEach(() => { window.localStorage.clear(); });

  describe('#constructor()', () => {

    it('should create a state database', () => {
      let db = new StateDB({ namespace: 'test' });
      expect(db).to.be.a(StateDB);
    });

    it('should allow an overwrite data transformation', done => {
      let transform = new PromiseDelegate<StateDB.DataTransform>();
      let db = new StateDB({ namespace: 'test', transform: transform.promise });
      let prepopulate = new StateDB({ namespace: 'test' });
      let key = 'foo';
      let correct = 'bar';
      let incorrect = 'baz';
      let transformation: StateDB.DataTransform = {
        type: 'overwrite',
        contents: { [key]: correct }
      };

      // By sharing a namespace, the two databases will share data.
      prepopulate.save(key, incorrect)
        .then(() => prepopulate.fetch(key))
        .then(value => { expect(value).to.be(incorrect); })
        .then(() => { transform.resolve(transformation); })
        .then(() => db.fetch(key))
        .then(value => { expect(value).to.be(correct); })
        .then(() => db.clear())
        .then(done)
        .catch(done);
    });

    it('should allow a merge data transformation', done => {
      let transform = new PromiseDelegate<StateDB.DataTransform>();
      let db = new StateDB({ namespace: 'test', transform: transform.promise });
      let prepopulate = new StateDB({ namespace: 'test' });
      let key = 'baz';
      let value = 'qux';

      // By sharing a namespace, the two databases will share data.
      prepopulate.save('foo', 'bar')
        .then(() => db.fetch('foo'))
        .then(saved => { expect(saved).to.be('bar'); })
        .then(() => db.fetch(key))
        .then(saved => { expect(saved).to.be(value); })
        .then(() => db.clear())
        .then(done)
        .catch(done);
      transform.resolve({ type: 'merge', contents: { [key]: value } });
    });

  });

  describe('#changed', () => {

    it('should emit changes when the database is updated', done => {
      let namespace = 'test-namespace';
      let db = new StateDB({ namespace });
      let changes: StateDB.Change[] = [
        { id: 'foo', type: 'save' },
        { id: 'foo', type: 'remove' },
        { id: 'bar', type: 'save' },
        { id: 'bar', type: 'remove' }
      ];
      let recorded: StateDB.Change[] = [];

      db.changed.connect((sender, change) => { recorded.push(change); });

      db.save('foo', 0)
        .then(() => db.remove('foo'))
        .then(() => db.save('bar', 1))
        .then(() => db.remove('bar'))
        .then(() => { expect(recorded).to.eql(changes); })
        .then(() => db.clear())
        .then(done)
        .catch(done);
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

    it('should resolve a nonexistent key fetch with undefined', done => {
      let { localStorage } = window;

      let db = new StateDB({ namespace: 'test-namespace' });
      let key = 'foo:bar';

      expect(localStorage.length).to.be(0);
      db.fetch(key)
        .then(fetched => { expect(fetched).to.be(undefined); })
        .then(done)
        .catch(done);
    });

  });

  describe('#fetchNamespace()', () => {

    it('should fetch a stored namespace', done => {
      let { localStorage } = window;

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

  describe('#toJSON()', () => {

    it('return the full contents of a state database', done => {
      let { localStorage } = window;

      let db = new StateDB({ namespace: 'test-namespace' });
      let contents: ReadonlyJSONObject = {
        abc: 'def',
        ghi: 'jkl',
        mno: 1,
        pqr: {
          foo: { bar: { baz: 'qux' } }
        }
      };

      expect(localStorage.length).to.be(0);
      Promise.all(Object.keys(contents).map(key => db.save(key, contents[key])))
        .then(() => db.toJSON())
        .then(serialized => { expect(serialized).to.eql(contents); })
        .then(() => db.clear())
        .then(done)
        .catch(done);
    });

  });

});
