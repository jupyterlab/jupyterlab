// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SharedList } from '../lib';
import { ISharedDoc, ISharedList, SharedDoc } from '../src';

class TestMapping {
  private _doc: ISharedDoc;
  private _list: ISharedList<string>;

  constructor(doc: ISharedDoc, list: ISharedList<string>) {
    this._doc = doc;
    this._list = list;
    this._list.undoManager = SharedDoc.createUndoManager(
      (list as SharedList<any>).underlyingModel,
      []
    );
  }

  get length(): number {
    return this._list.length;
  }

  dispose(): void {
    this._list.dispose();
    this._doc.dispose();
  }

  transact(f: () => void) {
    this._doc.transact(f, this._list);
  }

  canUndo(): boolean {
    return this._list.canUndo();
  }
  canRedo(): boolean {
    return this._list.canRedo();
  }
  undo(): void {
    this._list.undo();
  }
  redo(): void {
    this._list.redo();
  }
  clearUndo(): void {
    this._list.clearUndo();
  }

  push(value: string): number {
    return this._list.push(value);
  }
  remove(index: number): string | undefined {
    return this._list.remove(index);
  }
}

describe('@jupyterlab/shared-models', () => {
  describe('#undoManager', () => {
    let doc: SharedDoc;
    let list: ISharedList<string>;

    beforeEach(() => {
      doc = new SharedDoc();
      list = doc.createList<string>('foo');
      list.undoManager = SharedDoc.createUndoManager(
        (list as SharedList<any>).underlyingModel,
        []
      );
    });

    afterEach(() => {
      list.dispose();
      doc.dispose();
    });

    it('should not be able to undo|redo', () => {
      expect(list.canUndo()).toEqual(false);
      expect(list.canRedo()).toEqual(false);
    });

    it('should undo and redo the operation', () => {
      list.push('foo');
      expect(list.length).toEqual(1);

      expect(list.canUndo()).toEqual(true);
      list.undo();
      expect(list.length).toEqual(0);
      expect(list.canUndo()).toEqual(false);

      expect(list.canRedo()).toEqual(true);
      list.redo();
      expect(list.length).toEqual(1);
    });

    it('should undo and redo the operation from a transaction', () => {
      doc.transact(() => {
        list.push('foo0');
        list.push('foo1');
        list.push('foo2');
      }, list);

      expect(list.length).toEqual(3);

      expect(list.canUndo()).toEqual(true);
      list.undo();
      expect(list.length).toEqual(0);
      expect(list.canUndo()).toEqual(false);

      expect(list.canRedo()).toEqual(true);
      list.redo();
      expect(list.length).toEqual(3);
    });
  });

  describe('#undoManager_in_mapping', () => {
    let list: TestMapping;

    beforeEach(() => {
      const doc = new SharedDoc();
      const listModel = doc.createList<string>('foo');
      list = new TestMapping(doc, listModel);
    });

    afterEach(() => {
      list.dispose();
    });

    it('should not be able to undo|redo', () => {
      expect(list.canUndo()).toEqual(false);
      expect(list.canRedo()).toEqual(false);
    });

    it('should undo and redo the operation', () => {
      list.push('foo');
      expect(list.length).toEqual(1);

      expect(list.canUndo()).toEqual(true);
      list.undo();
      expect(list.length).toEqual(0);
      expect(list.canUndo()).toEqual(false);

      expect(list.canRedo()).toEqual(true);
      list.redo();
      expect(list.length).toEqual(1);
    });

    it('should undo and redo the operation from a transaction', () => {
      expect(list.length).toEqual(0);

      list.transact(() => {
        list.push('foo0');
        list.push('foo1');
        list.push('foo2');
      });

      expect(list.length).toEqual(3);

      expect(list.canUndo()).toEqual(true);
      list.undo();
      expect(list.length).toEqual(0);
      expect(list.canUndo()).toEqual(false);

      expect(list.canRedo()).toEqual(true);
      list.redo();
      expect(list.length).toEqual(3);
    });
  });
});
