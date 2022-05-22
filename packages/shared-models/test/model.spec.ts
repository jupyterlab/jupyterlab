// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as Y from 'yjs';
import { SharedDoc, SharedList, SharedMap, SharedString } from '../src';

describe('@jupyterlab/shared-models', () => {
  describe('model', () => {
    const doc = new SharedDoc();
    it('should create a document', () => {
      expect(doc).toBeInstanceOf(SharedDoc);
      expect(doc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });

    it('should create a string named "fooText"', () => {
      const text = doc.createString('fooText') as SharedString;
      expect(text).toBeInstanceOf(SharedString);
      expect(text.underlyingModel).toBeInstanceOf(Y.Text);
    });
    it('should have a string named "fooText"', () => {
      expect(doc.has('fooText')).toBe(true);
    });
    it('should return the string named "fooText"', () => {
      const text = doc.get('fooText') as SharedString;
      expect(text).toBeTruthy();
      expect(text).toBeInstanceOf(SharedString);
      expect(text?.underlyingModel).toBeInstanceOf(Y.Text);
    });

    it('should create a map named "fooMap"', () => {
      const map = doc.createMap('fooMap') as SharedMap<any>;
      expect(map).toBeInstanceOf(SharedMap);
      expect(map.underlyingModel).toBeInstanceOf(Y.Map);
    });
    it('should have a map named "fooMap"', () => {
      expect(doc.has('fooMap')).toBe(true);
    });
    it('should return the map named "fooMap"', () => {
      const map = doc.get('fooMap') as SharedMap<any>;
      expect(map).toBeTruthy();
      expect(map).toBeInstanceOf(SharedMap);
      expect(map?.underlyingModel).toBeInstanceOf(Y.Map);
    });

    it('should create a list named "fooList"', () => {
      const list = doc.createList('fooList') as SharedList<any>;
      expect(list).toBeInstanceOf(SharedList);
      expect(list.underlyingModel).toBeInstanceOf(Y.Array);
    });
    it('should have a list named "fooList"', () => {
      expect(doc.has('fooList')).toBe(true);
    });
    it('should return the list named "fooList"', () => {
      const list = doc.get('fooList') as SharedList<any>;
      expect(list).toBeTruthy();
      expect(list).toBeInstanceOf(SharedList);
      expect(list?.underlyingModel).toBeInstanceOf(Y.Array);
    });

    it('should return a string with the same underlying model', () => {
      const foo = doc.createString('foo') as SharedString;
      expect(foo).toBeTruthy();
      expect(foo).toBeInstanceOf(SharedString);
      expect(foo.underlyingModel).toBeInstanceOf(Y.Text);

      const copy = doc.createString('foo') as SharedString;
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
});
