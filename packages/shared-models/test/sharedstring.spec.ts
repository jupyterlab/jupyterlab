// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { testEmission } from '@jupyterlab/testutils';
import * as Y from 'yjs';
import { ISharedString, SharedDoc, SharedString } from '../src';

describe('@jupyterlab/shared-models', () => {
  describe('sharedString', () => {
    let doc: SharedDoc;
    let foo: ISharedString;

    beforeEach(() => {
      doc = new SharedDoc();
      foo = doc.createString('foo');
    });

    afterEach(() => {
      foo.dispose();
      doc.dispose();
    });

    it('should create a SharedDoc', () => {
      expect(doc).toBeInstanceOf(SharedDoc);
      expect(doc.underlyingDoc).toBeInstanceOf(Y.Doc);
    });
    it('should create a SharedString', () => {
      expect(foo).toBeInstanceOf(SharedString);
      expect((foo as SharedString).underlyingModel).toBeInstanceOf(Y.Text);
    });

    it('should set the text "foo"', () => {
      foo.text = 'foo';
      expect(foo.text).toBe('foo');
    });

    it('should clear the text', () => {
      foo.text = 'foo';
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
      const res: ISharedString.IChangedArgs = [{ insert: 'foo' }];
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
      foo.text = 'foo';
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
      expect(foo.text).toBe('foo');
      await emission;
    });

    it('should emit a "remove" signal when clearing the string', async () => {
      foo.text = 'foo';
      const res: ISharedString.IChangedArgs = [{ delete: 3 }];
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
});
