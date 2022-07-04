// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { testEmission } from '@jupyterlab/testutils';
import * as Y from 'yjs';
import {
  ISharedList,
  ISharedType,
  SharedDoc,
  SharedList,
  SharedMap,
  SharedString
} from '../src';

describe('@jupyterlab/shared-models', () => {
  describe('sharedList', () => {
    let sharedDoc: SharedDoc;
    let foo: ISharedList<ISharedType>;

    beforeEach(() => {
      sharedDoc = new SharedDoc();
      foo = sharedDoc.createList<ISharedType>('foo');
    });

    afterEach(() => {
      foo.dispose();
      sharedDoc.dispose();
    });

    it('should create a SharedDoc', () => {
      expect(sharedDoc).toBeInstanceOf(SharedDoc);
      expect(sharedDoc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });
    it('should create a sharedList', () => {
      expect(foo).toBeInstanceOf(SharedList);
      expect((foo as SharedList<any>).underlyingModel).toBeInstanceOf(Y.Array);
    });

    it('should push an element', () => {
      foo.push('foo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foo');
    });

    it('should set an element', () => {
      foo.push('foo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foo');

      foo.set(0, 'foofoo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foofoo');
    });

    it('should remove an element', () => {
      foo.push('foo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foo');

      const element = foo.remove(0);
      expect(foo.length).toBe(0);
      expect(element).toBe('foo');
    });

    it('should push multiple elements', () => {
      foo.pushAll([true, false]);
      expect(foo.get(0)).toBe(true);
      expect(foo.get(1)).toBe(false);
      expect(foo.length).toBe(2);
    });

    it('should insert an element', () => {
      foo.insert(0, 0);
      expect(foo.get(0)).toBe(0);
      expect(foo.length).toBe(1);
    });

    it('should insert multiple elements', () => {
      foo.insertAll(0, [1, 2]);
      expect(foo.get(0)).toBe(1);
      expect(foo.get(1)).toBe(2);
      expect(foo.length).toBe(2);
    });

    it('should remove a range', () => {
      foo.pushAll([0, 1, 2, 3]);
      foo.removeRange(1, 3);
      expect(foo.length).toBe(2);
      expect(foo.get(0)).toBe(0);
      expect(foo.get(1)).toBe(3);
    });

    it('should remove an element by its value', () => {
      const element = 1.1;
      foo.push(element);
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe(element);

      const index = foo.removeValue(element);
      expect(foo.length).toBe(0);
      expect(index).toBe(0);
    });

    it('should return an iterator', () => {
      foo.pushAll([0, 1, 2, 3]);

      const listIterator = foo.iter();
      expect(listIterator.next()).toBe(0);
      expect(listIterator.next()).toBe(1);
      expect(listIterator.next()).toBe(2);
      expect(listIterator.next()).toBe(3);
    });

    it('should push a list', () => {
      const list = ['foo', true, false, 0, 3.1415];
      foo.push(list);
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toEqual(list);
    });

    it('should push a dic', () => {
      const dic = {
        foo: 'foo',
        true: true,
        false: false,
        number: 0,
        float: 3.1415
      };
      foo.push(dic);
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toEqual(dic);
    });

    it('should remove every element', () => {
      foo.pushAll(['foo', true, false, 0, 3.1415]);
      expect(foo.length).toBe(5);

      foo.clear();
      expect(foo.length).toBe(0);
    });

    it('should move the item', () => {
      foo.pushAll(['foo0', 'foo1', 'foo2', 'foo3', 'foo4']);
      expect(foo.length).toBe(5);
      foo.move(3, 1);
      expect(foo.length).toBe(5);
      expect(foo.get(0)).toBe('foo0');
      //expect(foo.get(1)).toBe('foo3');
      //expect(foo.get(2)).toBe('foo1');
      //expect(foo.get(3)).toBe('foo2');
      expect(foo.get(4)).toBe('foo4');

      foo.moveRange(2, 3, 1);
      expect(foo.length).toBe(5);
      expect(foo.get(0)).toBe('foo0');
      //expect(foo.get(1)).toBe('foo1');
      //expect(foo.get(2)).toBe('foo2');
      //expect(foo.get(3)).toBe('foo3');
      expect(foo.get(4)).toBe('foo4');
    });

    it('should set/get the IShared types', () => {
      const fooString = new SharedString({ sharedDoc });
      fooString.text = 'foo';

      const fooList = new SharedList({ sharedDoc });
      fooList.push('foo');

      const fooMap = new SharedMap({ sharedDoc });
      fooMap.set('foo', 'foo');

      foo.pushAll([fooString, fooList, fooMap]);

      expect(foo.get(0)).toBeInstanceOf(SharedString);
      expect((foo.get(0) as SharedString).text).toBe('foo');

      expect(foo.get(1)).toBeInstanceOf(SharedList);
      expect((foo.get(1) as SharedList<string>).get(0)).toBe('foo');

      expect(foo.get(2)).toBeInstanceOf(SharedMap);
      expect((foo.get(2) as SharedMap<string>).get('foo')).toBe('foo');
    });

    it('should emit a signal', async () => {
      const emission = testEmission(foo.changed, {
        test: (sender, args) => expect(sender).toBe(foo)
      });
      foo.push('foo');
      expect(foo.length).toBe(1);
      await emission;
    });

    it('should emit a "add" signal after push', async () => {
      const item = 'foo';

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set([item]),
        deleted: new Set(),
        delta: [{ insert: [item] }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.push(item);
      expect(foo.length).toBe(1);
      await emission;
    });

    it('should emit a set signal', async () => {
      foo.push('foo');
      expect(foo.length).toBe(1);

      const item = 'foofoo';
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set([item]),
        deleted: new Set(['foo']),
        delta: [{ insert: [item] }, { delete: 1 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.set(0, item);
      expect(foo.length).toBe(1);
      await emission;
    });

    it('should emit a "add" signal after insert', async () => {
      const item = 'foo';

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set([item]),
        deleted: new Set(),
        delta: [{ insert: [item] }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.insert(0, item);
      expect(foo.length).toBe(1);
      await emission;
    });

    it('should emit a "remove" signal', async () => {
      const item = 'foo';
      foo.push(item);
      expect(foo.length).toBe(1);

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set([item]),
        delta: [{ delete: 1 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.remove(0);
      expect(foo.length).toBe(0);
      await emission;
    });

    it('should emit a "add" signal after pushing multiple elements', async () => {
      const items = ['foo0', 'foo1'];

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(items),
        deleted: new Set(),
        delta: [{ insert: items }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.pushAll(items);
      expect(foo.length).toBe(2);
      await emission;
    });

    it('should emit a "add" signal after insert with multiple elements', async () => {
      const items = ['foo0', 'foo1'];

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(items),
        deleted: new Set(),
        delta: [{ insert: items }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.insertAll(0, items);
      expect(foo.length).toBe(2);
      await emission;
    });

    it('should emit a "move" signal', async () => {
      // TODO: define the move event
      /* const res: ISharedList.IChangedArgs<ISharedType> = {
        type: 'move',
        oldIndex: 3,
        newIndex: 4,
        oldValues: ['foo1'],
        newValues: ['foo1']
      }; */
      /* const item = ['foo1'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set(),
        delta: [{ insert: item }]
      }; */

      const items = ['foo0', 'foo1', 'foo2', 'foo3'];
      foo.pushAll(items);
      expect(foo.length).toBe(4);
      /* const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          //expect(args).toEqual(res);
        }
      }); */

      foo.move(1, 2);
      expect(foo.length).toBe(4);
      expect(foo.get(0)).toBe('foo0');
      //expect(foo.get(1)).toBe('foo2');
      //expect(foo.get(2)).toBe('foo1');
      expect(foo.get(3)).toBe('foo3');
      //await emission;
    });

    it('should emit a "remove" signal after removing a value', async () => {
      const item = 'foo';
      foo.push(item);
      expect(foo.length).toBe(1);

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set([item]),
        delta: [{ delete: 1 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      const index = foo.removeValue(item);
      expect(foo.length).toBe(0);
      expect(index).toBe(0);
      await emission;
    });

    it('should emit a "remove" signal after removing multiple elements', async () => {
      const items = ['foo0', 'foo1', 'foo2', 'foo3'];
      foo.pushAll(items);
      expect(foo.length).toBe(4);

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set(['foo1', 'foo2']),
        delta: [{ retain: 1 }, { delete: 2 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.removeRange(1, 3);
      expect(foo.length).toBe(2);
      expect(foo.get(0)).toBe('foo0');
      expect(foo.get(1)).toBe('foo3');
      await emission;
    });

    it('should emit a "remove" signal when clearing the list', async () => {
      const items = ['foo0', 'foo1'];
      foo.pushAll(items);
      expect(foo.length).toBe(2);

      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set(items),
        delta: [{ delete: 2 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });

      foo.clear();
      expect(foo.length).toBe(0);
      await emission;
    });

    it('should dispose the list without removing the underlying model', () => {
      foo.dispose();
      expect(foo.isDisposed).toBe(true);
      expect(sharedDoc.has('foo')).toBe(true);
    });
  });
});
