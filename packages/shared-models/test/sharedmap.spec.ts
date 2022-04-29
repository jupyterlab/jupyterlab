// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { testEmission } from '@jupyterlab/testutils';
import * as Y from 'yjs';
import {
  ISharedMap,
  ISharedType,
  SharedDoc,
  SharedList,
  SharedMap,
  SharedString
} from '../src';

describe('@jupyterlab/shared-models', () => {
  describe('sharedMap', () => {
    let sharedDoc: SharedDoc;
    let foo: ISharedMap<ISharedType>;

    beforeEach(() => {
      sharedDoc = new SharedDoc();
      foo = sharedDoc.createMap<ISharedType>('foo');
    });

    afterEach(() => {
      foo.dispose();
      sharedDoc.dispose();
    });

    it('should create a SharedDoc', () => {
      expect(sharedDoc).toBeInstanceOf(SharedDoc);
      expect(sharedDoc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });
    it('should create a SharedMap', () => {
      expect(foo).toBeInstanceOf(SharedMap);
      expect(foo.underlyingModel).toBeInstanceOf(Y.Map);
    });

    it('should set an string', () => {
      foo.set('foo', 'foo');
      expect(foo.has('foo')).toBe(true);
      expect(foo.get('foo')).toBe('foo');
    });

    it('should set a boolean', () => {
      foo.set('true', true);
      expect(foo.has('true')).toBe(true);
      expect(foo.get('true')).toBe(true);

      foo.set('false', false);
      expect(foo.has('false')).toBe(true);
      expect(foo.get('false')).toBe(false);
    });

    it('should set a number', () => {
      foo.set('number', 0);
      expect(foo.has('number')).toBe(true);
      expect(foo.get('number')).toBe(0);

      foo.set('float', 3.1415);
      expect(foo.has('float')).toBe(true);
      expect(foo.get('float')).toBe(3.1415);
    });

    it('should set a list', () => {
      const list = ['foo', true, false, 0, 3.1415];
      foo.set('list', list);
      expect(foo.get('list')).toEqual(list);
    });

    it('should set a map', () => {
      const dic = {
        foo: 'foo',
        true: true,
        false: false,
        number: 0,
        float: 3.1415
      };
      foo.set('dic', dic);
      expect(foo.get('dic')).toEqual(dic);
    });

    it('should should get the inserted element', () => {
      foo.set('foo', 'foo');
      expect(foo.get('foo')).toBe('foo');
    });

    it('should delete an element', () => {
      foo.set('foo', 'foo');
      expect(foo.has('foo')).toBe(true);
      expect(foo.get('foo')).toBe('foo');

      foo.delete('foo');
      expect(foo.has('foo')).toBe(false);
    });

    it('should return a list with the keys', () => {
      foo.set('foo', 'foo');
      foo.set('true', true);
      foo.set('false', false);
      foo.set('number', 0);
      foo.set('float', 3.1415);
      expect(foo.keys().length).toBe(5);
      expect(foo.keys()[0]).toBe('foo');
      expect(foo.keys()[4]).toBe('float');
    });

    it('should return a list with the values', () => {
      foo.set('foo', 'foo');
      foo.set('true', true);
      foo.set('false', false);
      foo.set('number', 0);
      foo.set('float', 3.1415);
      expect(foo.values().length).toBe(5);
      expect(foo.values()[1]).toBe(true);
      expect(foo.values()[3]).toBe(0);
    });

    it('should return the size', () => {
      foo.set('foo', 'foo');
      foo.set('true', true);
      foo.set('false', false);
      foo.set('number', 0);
      foo.set('float', 3.1415);
      expect(foo.size).toBe(5);
    });

    it('should remove all the elements', () => {
      foo.set('foo', 'foo');
      foo.set('true', true);
      foo.set('false', false);
      foo.set('number', 0);
      foo.set('float', 3.1415);
      expect(foo.size).toBe(5);
      foo.clear();
      expect(foo.size).toBe(0);
    });

    it('should set/get IShared types', () => {
      const fooString = new SharedString({ sharedDoc });
      fooString.text = 'foo';
      foo.set('fooString', fooString);
      expect((foo.get('fooString') as SharedString).text).toBe('foo');

      const fooList = new SharedList({ sharedDoc });
      fooList.push('foo');
      foo.set('fooList', fooList);
      expect((foo.get('fooList') as SharedList<string>).get(0)).toBe('foo');

      const fooMap = new SharedMap({ sharedDoc });
      fooMap.set('foo', 'foo');
      foo.set('fooMap', fooMap);
      expect((foo.get('fooMap') as SharedMap<string>).get('foo')).toBe('foo');
    });

    it('should emit a signal', async () => {
      const emission = testEmission(foo.changed, {
        test: (sender, args) => expect(sender).toBe(foo)
      });
      foo.set('foo', 'foo');
      expect(foo.has('foo')).toBe(true);
      await emission;
    });

    it('should emit a "add" signal', async () => {
      const res: ISharedMap.IChangedArgs<ISharedType> = [
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
      foo.set('foo', 'foo');
      expect(foo.size).toBe(1);
      const res: ISharedMap.IChangedArgs<ISharedType> = [
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
      foo.set('foo', 'foo');
      expect(foo.size).toBe(1);
      const res: ISharedMap.IChangedArgs<ISharedType> = [
        {
          key: 'foo',
          type: 'remove',
          oldValue: 'foo',
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
      const res: ISharedMap.IChangedArgs<ISharedType> = [
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
      expect(sharedDoc.has('foo')).toBe(true);
    });
  });
});
