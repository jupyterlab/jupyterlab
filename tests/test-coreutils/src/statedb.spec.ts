// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { StateDB } from '@jupyterlab/coreutils';

import { PromiseDelegate, ReadonlyJSONObject } from '@phosphor/coreutils';

describe('StateDB', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('#constructor()', () => {
    it('should create a state database', () => {
      const db = new StateDB();
      expect(db).to.be.an.instanceof(StateDB);
    });

    it('should allow an overwrite data transformation', async () => {
      const transform = new PromiseDelegate<StateDB.DataTransform>();
      const db = new StateDB({ transform: transform.promise });
      const prepopulate = new StateDB();
      const key = 'foo';
      const correct = 'bar';
      const incorrect = 'baz';
      const transformation: StateDB.DataTransform = {
        type: 'overwrite',
        contents: { [key]: correct }
      };

      // By sharing a namespace, the two databases will share data.
      await prepopulate.save(key, incorrect);
      let value = await prepopulate.fetch(key);
      expect(value).to.equal(incorrect);
      transform.resolve(transformation);
      await transform.promise;
      value = await db.fetch(key);
      expect(value).to.equal(correct);
      await db.clear();
    });

    it('should allow a merge data transformation', async () => {
      let transform = new PromiseDelegate<StateDB.DataTransform>();
      let db = new StateDB({ transform: transform.promise });
      let prepopulate = new StateDB();
      let key = 'baz';
      let value = 'qux';

      // By sharing a namespace, the two databases will share data.
      await prepopulate.save('foo', 'bar');
      transform.resolve({ type: 'merge', contents: { [key]: value } });
      let saved = await db.fetch('foo');
      expect(saved).to.equal('bar');
      saved = await db.fetch(key);
      expect(saved).to.equal(value);
      await db.clear();
    });
  });

  describe('#changed', () => {
    it('should emit changes when the database is updated', async () => {
      const db = new StateDB();
      const changes: StateDB.Change[] = [
        { id: 'foo', type: 'save' },
        { id: 'foo', type: 'remove' },
        { id: 'bar', type: 'save' },
        { id: 'bar', type: 'remove' }
      ];
      const recorded: StateDB.Change[] = [];

      db.changed.connect((_, change) => {
        recorded.push(change);
      });

      await db.save('foo', 0);
      await db.remove('foo');
      await db.save('bar', 1);
      await db.remove('bar');
      expect(recorded).to.deep.equal(changes);
      await db.clear();
    });
  });

  describe('#namespace', () => {
    it('should be the read-only internal namespace', () => {
      const db = new StateDB();
      expect(db.namespace).to.equal(namespace);
    });
  });

  describe('#clear()', () => {
    it('should empty the items in a state database', async () => {
      const { localStorage } = window;

      const db = new StateDB();
      const key = 'foo:bar';
      const value = { qux: 'quux' };

      expect(localStorage.length).to.equal(0);
      await db.save(key, value);
      expect(localStorage).to.have.length(1);
      await db.clear();
      expect(localStorage.length).to.equal(0);
    });

    it('should only clear its own namespace', async () => {
      const { localStorage } = window;

      const db1 = new StateDB();
      const db2 = new StateDB();

      expect(localStorage.length).to.equal(0);
      await db1.save('foo', { bar: null });
      expect(localStorage).to.have.length(1);
      await db2.save('baz', { qux: null });
      expect(localStorage).to.have.length(2);
      await db1.clear();
      expect(localStorage).to.have.length(1);
      await db2.clear();
      expect(localStorage.length).to.equal(0);
    });
  });

  describe('#fetch()', () => {
    it('should fetch a stored key', async () => {
      const { localStorage } = window;

      const db = new StateDB();
      const key = 'foo:bar';
      const value = { baz: 'qux' };

      expect(localStorage.length).to.equal(0);
      await db.save(key, value);
      expect(localStorage).to.have.length(1);
      const fetched = await db.fetch(key);
      expect(fetched).to.deep.equal(value);
      await db.clear();
    });

    it('should resolve a nonexistent key fetch with undefined', async () => {
      let { localStorage } = window;

      let db = new StateDB();
      let key = 'foo:bar';

      expect(localStorage.length).to.equal(0);
      const fetched = await db.fetch(key);
      expect(fetched).to.be.undefined;
    });
  });

  describe('#list()', () => {
    it('should fetch a stored namespace', async () => {
      const { localStorage } = window;

      const db = new StateDB();
      const keys = [
        'foo:bar',
        'foo:baz',
        'foo:qux',
        'abc:def',
        'abc:ghi',
        'abc:jkl'
      ];

      expect(localStorage.length).to.equal(0);
      const promises = keys.map(key => db.save(key, { value: key }));
      await Promise.all(promises);
      expect(localStorage).to.have.length(keys.length);
      let fetched = await db.list('foo');
      expect(fetched.ids.length).to.equal(3);
      expect(fetched.values.length).to.equal(3);

      let sorted = fetched.ids.sort((a, b) => a.localeCompare(b));
      expect(sorted[0]).to.equal(keys[0]);
      expect(sorted[1]).to.equal(keys[1]);
      expect(sorted[2]).to.equal(keys[2]);

      fetched = await db.list('abc');
      expect(fetched.ids.length).to.equal(3);
      expect(fetched.values.length).to.equal(3);

      sorted = fetched.ids.sort((a, b) => a.localeCompare(b));

      expect(sorted[0]).to.equal(keys[3]);
      expect(sorted[1]).to.equal(keys[4]);
      expect(sorted[2]).to.equal(keys[5]);

      await db.clear();
    });
  });

  describe('#remove()', () => {
    it('should remove a stored key', async () => {
      const { localStorage } = window;

      const db = new StateDB();
      const key = 'foo:bar';
      const value = { baz: 'qux' };

      expect(localStorage.length).to.equal(0);
      await db.save(key, value);
      expect(localStorage).to.have.length(1);
      await db.remove(key);
      expect(localStorage.length).to.equal(0);
    });
  });

  describe('#save()', () => {
    it('should save a key and a value', async () => {
      const { localStorage } = window;

      const db = new StateDB();
      const key = 'foo:bar';
      const value = { baz: 'qux' };

      expect(localStorage.length).to.equal(0);
      await db.save(key, value);
      const fetched = await db.fetch(key);
      expect(fetched).to.deep.equal(value);
      await db.remove(key);
      expect(localStorage.length).to.equal(0);
    });
  });

  describe('#toJSON()', () => {
    it('return the full contents of a state database', async () => {
      const { localStorage } = window;

      const db = new StateDB();
      const contents: ReadonlyJSONObject = {
        abc: 'def',
        ghi: 'jkl',
        mno: 1,
        pqr: {
          foo: { bar: { baz: 'qux' } }
        }
      };

      expect(localStorage.length).to.equal(0);
      await Promise.all(
        Object.keys(contents).map(key => db.save(key, contents[key]))
      );
      const serialized = await db.toJSON();
      expect(serialized).to.deep.equal(contents);
      await db.clear();
    });
  });
});
