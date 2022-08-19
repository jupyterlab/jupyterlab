// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { StateDB } from '@jupyterlab/statedb';
import { PromiseDelegate, ReadonlyJSONObject } from '@lumino/coreutils';

describe('StateDB', () => {
  describe('#constructor()', () => {
    it('should create a state database', () => {
      const db = new StateDB();
      expect(db).toBeInstanceOf(StateDB);
    });

    it('should allow an overwrite data transformation', async () => {
      const connector = new StateDB.Connector();
      const key = 'foo';
      const correct = 'bar';
      const incorrect = 'baz';

      expect(await connector.fetch(key)).toBeUndefined();
      await connector.save(key, `{ "v": "${incorrect}"}`);
      expect(JSON.parse(await connector.fetch(key)).v).toBe(incorrect);

      const transform = new PromiseDelegate<StateDB.DataTransform>();
      const db = new StateDB({ connector, transform: transform.promise });
      const transformation: StateDB.DataTransform = {
        type: 'overwrite',
        contents: { [key]: correct }
      };

      transform.resolve(transformation);
      await transform.promise;
      expect(await db.fetch(key)).toBe(correct);
      expect(JSON.parse(await connector.fetch(key)).v).toBe(correct);
    });

    it('should allow a merge data transformation', async () => {
      const connector = new StateDB.Connector();
      const k1 = 'foo';
      const v1 = 'bar';
      const k2 = 'baz';
      const v2 = 'qux';

      expect(await connector.fetch(k1)).toBeUndefined();
      expect(await connector.fetch(k2)).toBeUndefined();
      await connector.save(k1, `{ "v": "${v1}"}`);
      expect(JSON.parse(await connector.fetch(k1)).v).toBe(v1);

      const transform = new PromiseDelegate<StateDB.DataTransform>();
      const db = new StateDB({ connector, transform: transform.promise });
      const transformation: StateDB.DataTransform = {
        type: 'merge',
        contents: { [k2]: v2 }
      };

      transform.resolve(transformation);
      await transform.promise;
      expect(await db.fetch(k1)).toBe(v1);
      expect(await db.fetch(k2)).toBe(v2);
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
      expect(recorded).toEqual(changes);
    });
  });

  describe('#clear()', () => {
    it('should empty the items in a state database', async () => {
      const connector = new StateDB.Connector();
      const db = new StateDB({ connector });

      expect((await connector.list()).ids).toHaveLength(0);
      await db.save('foo', 'bar');
      expect((await connector.list()).ids).toHaveLength(1);
      await db.clear();
      expect((await connector.list()).ids).toHaveLength(0);
    });
  });

  describe('#fetch()', () => {
    it('should fetch a stored key', async () => {
      const db = new StateDB();
      const key = 'foo:bar';
      const value = { baz: 'qux' };

      expect(await db.fetch(key)).toBeUndefined();
      await db.save(key, value);
      expect(await db.fetch(key)).toEqual(value);
    });
  });

  describe('#list()', () => {
    it('should fetch a stored namespace', async () => {
      const db = new StateDB();
      const keys = [
        'foo:bar',
        'foo:baz',
        'foo:qux',
        'abc:def',
        'abc:ghi',
        'abc:jkl',
        'foo-two:bar',
        'foo-two:baz',
        'foo-two:qux'
      ];

      await Promise.all(keys.map(key => db.save(key, { value: key })));

      let fetched = await db.list('foo');
      expect(fetched.ids.length).toBe(3);
      expect(fetched.values.length).toBe(3);

      let sorted = fetched.ids.sort((a, b) => a.localeCompare(b));
      expect(sorted[0]).toBe(keys[0]);
      expect(sorted[1]).toBe(keys[1]);
      expect(sorted[2]).toBe(keys[2]);

      fetched = await db.list('abc');
      expect(fetched.ids.length).toBe(3);
      expect(fetched.values.length).toBe(3);

      sorted = fetched.ids.sort((a, b) => a.localeCompare(b));
      expect(sorted[0]).toBe(keys[3]);
      expect(sorted[1]).toBe(keys[4]);
      expect(sorted[2]).toBe(keys[5]);
    });
  });

  describe('#remove()', () => {
    it('should remove a stored key', async () => {
      const db = new StateDB();
      const key = 'foo:bar';
      const value = { baz: 'qux' };

      expect(await db.fetch(key)).toBeUndefined();
      await db.save(key, value);
      expect(await db.fetch(key)).toEqual(value);
      await db.remove(key);
      expect(await db.fetch(key)).toBeUndefined();
    });
  });

  describe('#save()', () => {
    it('should save a key and a value', async () => {
      const db = new StateDB();
      const key = 'foo:bar';
      const value = { baz: 'qux' };

      await db.save(key, value);
      expect(await db.fetch(key)).toEqual(value);
    });
  });

  describe('#toJSON()', () => {
    it('return the full contents of a state database', async () => {
      const db = new StateDB();
      const contents: ReadonlyJSONObject = {
        abc: 'def',
        ghi: 'jkl',
        mno: 1,
        pqr: {
          foo: { bar: { baz: 'qux' } }
        }
      };

      await Promise.all(
        Object.keys(contents).map(key => db.save(key, contents[key]))
      );
      const serialized = await db.toJSON();
      expect(serialized).toEqual(contents);
    });
  });
});
