// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { testEmission } from '@jupyterlab/testutils';
import * as Y from 'yjs';
import {
  ISharedList,
  ISharedMap,
  ISharedString,
  ISharedType,
  SharedDoc,
  SharedList,
  SharedMap,
  SharedString
} from '../src';

describe('@jupyterlab/shared-models', () => {
  describe('model', () => {
    // TODO: Tests undoManager and Awareness
    const doc = new SharedDoc();
    it('should create a document', () => {
      expect(doc).toBeInstanceOf(SharedDoc);
      expect(doc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });

    it('should create a string named "fooText"', () => {
      const text = doc.createString('fooText');
      expect(text).toBeInstanceOf(SharedString);
      expect(text.underlyingModel).toBeInstanceOf(Y.Text);
    });
    it('should have a string named "fooText"', () => {
      expect(doc.has('fooText')).toBe(true);
    });
    it('should return the string named "fooText"', () => {
      const text = doc.get('fooText');
      expect(text).toBeTruthy();
      expect(text).toBeInstanceOf(SharedString);
      expect(text?.underlyingModel).toBeInstanceOf(Y.Text);
    });

    it('should create a map named "fooMap"', () => {
      const map = doc.createMap('fooMap');
      expect(map).toBeInstanceOf(SharedMap);
      expect(map.underlyingModel).toBeInstanceOf(Y.Map);
    });
    it('should have a map named "fooMap"', () => {
      expect(doc.has('fooMap')).toBe(true);
    });
    it('should return the map named "fooMap"', () => {
      const map = doc.get('fooMap');
      expect(map).toBeTruthy();
      expect(map).toBeInstanceOf(SharedMap);
      expect(map?.underlyingModel).toBeInstanceOf(Y.Map);
    });

    it('should create a list named "fooList"', () => {
      const list = doc.createList('fooList');
      expect(list).toBeInstanceOf(SharedList);
      expect(list.underlyingModel).toBeInstanceOf(Y.Array);
    });
    it('should have a list named "fooList"', () => {
      expect(doc.has('fooList')).toBe(true);
    });
    it('should return the list named "fooList"', () => {
      const list = doc.get('fooList');
      expect(list).toBeTruthy();
      expect(list).toBeInstanceOf(SharedList);
      expect(list?.underlyingModel).toBeInstanceOf(Y.Array);
    });

    it('should return a string with the same underlying model', () => {
      const foo = doc.createString('foo');
      expect(foo).toBeTruthy();
      expect(foo).toBeInstanceOf(SharedString);
      expect(foo.underlyingModel).toBeInstanceOf(Y.Text);

      const copy = doc.createString('foo');
      expect(copy).toBeTruthy();
      expect(copy).toBeInstanceOf(SharedString);
      expect(copy.underlyingModel).toBeInstanceOf(Y.Text);

      expect(foo.underlyingModel).toBe(copy.underlyingModel);
    });

    it('should fail creating two types with the same name', () => {
      expect(() => {
        doc.createString('fooList');
      }).toThrow();
      expect(() => {
        doc.createList('fooMap');
      }).toThrow();
      expect(() => {
        doc.createMap('fooText');
      }).toThrow();
    });
  });

  describe('sharedString', () => {
    const doc = new SharedDoc();
    const foo = doc.createString('foo');

    it('should create a SharedDoc', () => {
      expect(doc).toBeInstanceOf(SharedDoc);
      expect(doc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });
    it('should create a SharedString', () => {
      expect(foo).toBeInstanceOf(SharedString);
      expect(foo.underlyingModel).toBeInstanceOf(Y.Text);
    });

    it('should set the text "foo"', () => {
      foo.text = 'foo';
      expect(foo.text).toBe('foo');
    });

    it('should clear the text', () => {
      foo.clear();
      expect(foo.text).toBe('');
    });

    it('should emit a signal', async () => {
      const emission = testEmission(foo.changed, {
        test: (sender, args) => expect(sender).toBe(foo)
      });
      foo.text = 'foo';
      expect(foo.text).toBe('foo');
      await emission;
    });

    it('should emit a "set" signal', async () => {
      const res: ISharedString.IChangedArgs = [
        { delete: 3 },
        { insert: 'foo' }
      ];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.text = 'foo';
      expect(foo.text).toBe('foo');
      await emission;
    });

    it('should emit a "remove" signal', async () => {
      const res: ISharedString.IChangedArgs = [{ retain: 1 }, { delete: 1 }];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.remove(1, 2);
      expect(foo.text).toBe('fo');
      await emission;
    });

    it('should emit a "insert" signal', async () => {
      const res: ISharedString.IChangedArgs = [{ insert: 'foo' }];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.insert(0, 'foo');
      expect(foo.text).toBe('foofo');
      await emission;
    });

    it('should emit a "remove" signal when clearing the string', async () => {
      const res: ISharedString.IChangedArgs = [{ delete: 5 }];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.clear();
      expect(foo.text).toBe('');
      await emission;
    });

    it('should dispose the string without removing the underlying model', () => {
      foo.dispose();
      expect(foo.isDisposed).toBe(true);
      expect(doc.has('foo')).toBe(true);
    });
  });

  describe('sharedMap', () => {
    const doc = new SharedDoc();
    const foo = doc.createMap<ISharedType>('foo');

    it('should create a SharedDoc', () => {
      expect(doc).toBeInstanceOf(SharedDoc);
      expect(doc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });
    it('should create a SharedMap', () => {
      expect(foo).toBeInstanceOf(SharedMap);
      expect(foo.underlyingModel).toBeInstanceOf(Y.Map);
    });

    it('should test every method', () => {
      foo.set('foo', 'foo');
      expect(foo.has('foo')).toBe(true);
      expect(foo.get('foo')).toBe('foo');

      expect(foo.keys()[0]).toBe('foo');
      expect(foo.values()[0]).toBe('foo');

      foo.delete('foo');
      expect(foo.has('foo')).toBe(false);

      foo.set('boolean', true);
      expect(foo.get('boolean')).toBe(true);
      foo.set('boolean', false);
      expect(foo.get('boolean')).toBe(false);

      foo.set('number', 0);
      expect(foo.get('number')).toBe(0);

      foo.set('float', 1.1);
      expect(foo.get('float')).toBe(1.1);

      expect(foo.size).toBe(3);
      foo.clear();
      expect(foo.size).toBe(0);

      foo.set('list', ['foo']);
      expect(foo.get('list')).toEqual(['foo']);

      foo.set('dic', { foo: 'foo' });
      expect(foo.get('dic')).toEqual({ foo: 'foo' });
    });

    it('should set/get IShared types', () => {
      const fooString = new SharedString({ doc, initialize: false });
      fooString.text = 'foo';
      foo.set('fooString', fooString);
      fooString.initialize();
      expect((foo.get('fooString') as SharedString).text).toBe('foo');

      const fooList = new SharedList({ doc, initialize: false });
      fooList.push('foo');
      foo.set('fooList', fooList);
      fooList.initialize();
      expect((foo.get('fooList') as SharedList<string>).get(0)).toBe('foo');

      const fooMap = new SharedMap({ doc, initialize: false });
      fooMap.set('foo', 'foo');
      foo.set('fooMap', fooMap);
      fooMap.initialize();
      expect((foo.get('fooMap') as SharedMap<string>).get('foo')).toBe('foo');
    });

    it('should emit a signal', async () => {
      foo.clear();
      expect(foo.size).toBe(0);
      const emission = testEmission(foo.changed, {
        test: (sender, args) => expect(sender).toBe(foo)
      });
      foo.set('foo', 'foo');
      expect(foo.has('foo')).toBe(true);
      await emission;
    });

    it('should emit a "add" signal', async () => {
      foo.clear();
      expect(foo.size).toBe(0);
      const res: ISharedMap.IChangedArgs<ISharedType>[] = [
        {
          key: 'foo',
          type: 'add',
          oldValue: undefined,
          newValue: 'foo'
        }
      ];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.set('foo', 'foo');
      expect(foo.size).toBe(1);
      expect(foo.has('foo')).toBe(true);
      await emission;
    });

    it('should emit a "change" signal', async () => {
      expect(foo.size).toBe(1);
      const res: ISharedMap.IChangedArgs<ISharedType>[] = [
        {
          key: 'foo',
          type: 'change',
          oldValue: 'foo',
          newValue: 'foofoo'
        }
      ];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.set('foo', 'foofoo');
      expect(foo.size).toBe(1);
      expect(foo.has('foo')).toBe(true);
      await emission;
    });

    it('should emit a "remove" signal', async () => {
      expect(foo.size).toBe(1);
      const res: ISharedMap.IChangedArgs<ISharedType>[] = [
        {
          key: 'foo',
          type: 'remove',
          oldValue: 'foofoo',
          newValue: undefined
        }
      ];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.delete('foo');
      expect(foo.size).toBe(0);
      expect(foo.has('foo')).toBe(false);
      await emission;
    });

    it('should emit two "remove" signal', async () => {
      foo.set('foo', 'foo');
      foo.set('foofoo', 'foofoo');
      expect(foo.size).toBe(2);
      const res: ISharedMap.IChangedArgs<ISharedType>[] = [
        {
          key: 'foo',
          type: 'remove',
          oldValue: 'foo',
          newValue: undefined
        },
        {
          key: 'foofoo',
          type: 'remove',
          oldValue: 'foofoo',
          newValue: undefined
        }
      ];
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.clear();
      expect(foo.size).toBe(0);
      await emission;
      await emission;
    });

    it('should dispose the map without removing the underlying model', () => {
      foo.dispose();
      expect(foo.isDisposed).toBe(true);
      expect(doc.has('foo')).toBe(true);
    });
  });

  describe('sharedList', () => {
    const doc = new SharedDoc();
    const foo = doc.createList<ISharedType>('foo');

    it('should create a SharedDoc', () => {
      expect(doc).toBeInstanceOf(SharedDoc);
      expect(doc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });
    it('should create a sharedList', () => {
      expect(foo).toBeInstanceOf(SharedList);
      expect(foo.underlyingModel).toBeInstanceOf(Y.Array);
    });

    it('should test every method', () => {
      foo.push('foo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foo');

      foo.set(0, 'foofoo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foofoo');

      foo.remove(0);
      expect(foo.length).toBe(0);

      foo.pushAll([true, false]);
      expect(foo.get(0)).toBe(true);
      expect(foo.get(1)).toBe(false);
      expect(foo.length).toBe(2);

      foo.insert(0, 0);
      expect(foo.get(0)).toBe(0);
      expect(foo.length).toBe(3);
      foo.insertAll(1, [1, 2]);
      expect(foo.get(0)).toBe(0);
      expect(foo.get(1)).toBe(1);
      expect(foo.get(2)).toBe(2);
      expect(foo.length).toBe(5);

      foo.remove(0);
      expect(foo.get(0)).toBe(1);
      expect(foo.length).toBe(4);

      foo.removeRange(2, 4);
      expect(foo.length).toBe(2);
      expect(foo.get(0)).toBe(1);
      expect(foo.get(1)).toBe(2);

      const index = foo.push(1.1) - 1;
      const value = foo.get(index);
      expect(foo.get(2)).toBe(value);
      expect(foo.length).toBe(3);
      foo.removeValue(value);
      expect(foo.length).toBe(2);

      foo.move(1, 0);
      const listIterator = foo.iter();
      expect(listIterator.next()).toBe(2);
      expect(listIterator.next()).toBe(1);

      foo.push(['foo']);
      expect(foo.get(2)).toEqual(['foo']);

      foo.push({ foo: 'foo' });
      expect(foo.get(3)).toEqual({ foo: 'foo' });
      expect(foo.length).toBe(4);

      foo.clear();
      expect(foo.length).toBe(0);
    });

    it('should move the item', () => {
      foo.pushAll(['foo0', 'foo1', 'foo2', 'foo3', 'foo4']);
      expect(foo.length).toBe(5);
      expect(foo.get(0)).toBe('foo0');
      expect(foo.get(1)).toBe('foo1');
      expect(foo.get(2)).toBe('foo2');
      expect(foo.get(3)).toBe('foo3');
      expect(foo.get(4)).toBe('foo4');

      foo.move(3, 1);
      expect(foo.length).toBe(5);
      expect(foo.get(0)).toBe('foo0');
      expect(foo.get(1)).toBe('foo3');
      expect(foo.get(2)).toBe('foo1');
      expect(foo.get(3)).toBe('foo2');
      expect(foo.get(4)).toBe('foo4');

      foo.moveRange(2, 3, 1);
      expect(foo.length).toBe(5);
      expect(foo.get(0)).toBe('foo0');
      expect(foo.get(1)).toBe('foo1');
      expect(foo.get(2)).toBe('foo2');
      expect(foo.get(3)).toBe('foo3');
      expect(foo.get(4)).toBe('foo4');

      foo.clear();
      expect(foo.length).toBe(0);
    });

    it('should set/get the IShared types', () => {
      foo.clear();
      expect(foo.length).toBe(0);

      const fooString = new SharedString({ doc, initialize: false });
      fooString.text = 'foo';

      const fooList = new SharedList({ doc, initialize: false });
      fooList.push('foo');

      const fooMap = new SharedMap({ doc, initialize: false });
      fooMap.set('foo', 'foo');

      foo.pushAll([fooString, fooList, fooMap]);
      fooString.initialize();
      fooList.initialize();
      fooMap.initialize();

      expect(foo.get(0)).toBeInstanceOf(SharedString);
      expect((foo.get(0) as SharedString).text).toBe('foo');

      expect(foo.get(1)).toBeInstanceOf(SharedList);
      expect((foo.get(1) as SharedList<string>).get(0)).toBe('foo');

      expect(foo.get(2)).toBeInstanceOf(SharedMap);
      expect((foo.get(2) as SharedMap<string>).get('foo')).toBe('foo');
    });

    it('should emit a signal', async () => {
      foo.clear();
      expect(foo.length).toBe(0);

      const emission = testEmission(foo.changed, {
        test: (sender, args) => expect(sender).toBe(foo)
      });
      foo.push('foo');
      expect(foo.length).toBe(1);
      await emission;
    });

    it('should emit a "add" signal after push', async () => {
      foo.clear();
      expect(foo.length).toBe(0);
      const item = ['foo'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(item),
        deleted: new Set(),
        delta: [{ insert: item }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.push('foo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foo');
      await emission;
    });

    it('should emit a set signal', async () => {
      const item = ['foo'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(item),
        deleted: new Set(item),
        delta: [{ delete: 1 }, { insert: item }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.set(0, 'foo');
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foo');
      await emission;
    });

    it('should emit a "add" signal after insert', async () => {
      const item = ['foofoo'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(item),
        deleted: new Set(),
        delta: [{ insert: item }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.insert(0, 'foofoo');
      expect(foo.length).toBe(2);
      expect(foo.get(0)).toBe('foofoo');
      await emission;
    });

    it('should emit a "remove" signal', async () => {
      const item = ['foofoo'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set(item),
        delta: [{ delete: 1 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.remove(0);
      expect(foo.length).toBe(1);
      expect(foo.get(0)).toBe('foo');
      await emission;
    });

    it('should emit a "add" signal after push with multiple elements', async () => {
      const item = ['foo1', 'foo2'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(item),
        deleted: new Set(),
        delta: [{ retain: 1 }, { insert: item }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.pushAll(['foo1', 'foo2']);
      expect(foo.length).toBe(3);
      expect(foo.get(1)).toBe('foo1');
      expect(foo.get(2)).toBe('foo2');
      await emission;
    });

    it('should emit a "add" signal after insert with multiple elements', async () => {
      const item = ['foo0', 'foo1'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(item),
        deleted: new Set(),
        delta: [{ insert: item }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.insertAll(0, ['foo0', 'foo1']);
      expect(foo.length).toBe(5);
      expect(foo.get(0)).toBe('foo0');
      expect(foo.get(1)).toBe('foo1');
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
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          //expect(args).toEqual(res);
        }
      });
      foo.move(3, 4);
      expect(foo.length).toBe(5);
      expect(foo.get(3)).toBe('foo2');
      expect(foo.get(4)).toBe('foo1');
      await emission;
    });

    it('should emit a "remove" signal after removing a value', async () => {
      const item = ['foo2'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set(item),
        delta: [{ retain: 3 }, { delete: 1 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.removeValue('foo2');
      expect(foo.length).toBe(4);
      expect(foo.get(3)).toBe('foo1');
      await emission;
    });

    it('should emit a "remove" signal after removing multiple elements', async () => {
      const item = ['foo', 'foo1'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set(item),
        delta: [{ retain: 2 }, { delete: 2 }]
      };
      const emission = testEmission(foo.changed, {
        test: (sender, args) => {
          expect(sender).toBe(foo);
          expect(args).toEqual(res);
        }
      });
      foo.removeRange(2, 4);
      expect(foo.length).toBe(2);
      expect(foo.get(0)).toBe('foo0');
      expect(foo.get(1)).toBe('foo1');
      await emission;
    });

    it('should emit a "remove" signal when clearing the list', async () => {
      const item = ['foo0', 'foo1'];
      const res: ISharedList.IChangedArgs<ISharedType> = {
        added: new Set(),
        deleted: new Set(item),
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
      expect(doc.has('foo')).toBe(true);
    });
  });
});
