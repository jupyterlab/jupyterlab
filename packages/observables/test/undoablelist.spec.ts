// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISerializer } from '@jupyterlab/observables';
import { ObservableUndoableList } from '@jupyterlab/observables';
import type { JSONObject } from '@lumino/coreutils';

class Test {
  constructor(value: JSONObject) {
    this._value = value;
  }

  get value(): JSONObject {
    return this._value;
  }

  private _value: JSONObject;
}

let count = 0;

class Serializer implements ISerializer<Test> {
  fromJSON(value: JSONObject): Test {
    value['count'] = count++;
    return new Test(value);
  }

  toJSON(value: Test): JSONObject {
    return value.value;
  }
}

const serializer = new Serializer();
const value: JSONObject = { name: 'foo' };

class Item {
  constructor(readonly value: JSONObject) {}
}

const ser: ISerializer<Item> = {
  fromJSON: (v: JSONObject) => new Item({ ...v }),
  toJSON: (i: Item) => i.value
};

const ids = (l: ObservableUndoableList<Item>) =>
  Array.from({ length: l.length }, (_, i) => l.get(i).value['id']).join('');

describe('@jupyterlab/observables', () => {
  describe('ObservableUndoableList', () => {
    describe('#constructor', () => {
      it('should create a new ObservableUndoableList', () => {
        const list = new ObservableUndoableList(serializer);
        expect(list).toBeInstanceOf(ObservableUndoableList);
      });
    });

    describe('#canRedo', () => {
      it('should return false if there is no history', () => {
        const list = new ObservableUndoableList(serializer);
        expect(list.canRedo).toBe(false);
      });

      it('should return true if there is an undo that can be redone', () => {
        const list = new ObservableUndoableList(serializer);
        list.push(new Test(value));
        list.undo();
        expect(list.canRedo).toBe(true);
      });
    });

    describe('#canUndo', () => {
      it('should return false if there is no history', () => {
        const list = new ObservableUndoableList(serializer);
        expect(list.canUndo).toBe(false);
      });

      it('should return true if there is a change that can be undone', () => {
        const list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        expect(list.canUndo).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the list', () => {
        const list = new ObservableUndoableList(serializer);
        list.dispose();
        expect(list.isDisposed).toBe(true);
        list.dispose();
        expect(list.isDisposed).toBe(true);
      });
    });

    describe('#beginCompoundOperation()', () => {
      it('should begin a compound operation', () => {
        const list = new ObservableUndoableList(serializer);
        list.beginCompoundOperation();
        list.push(serializer.fromJSON(value));
        list.push(serializer.fromJSON(value));
        list.endCompoundOperation();
        expect(list.canUndo).toBe(true);
        list.undo();
        expect(list.canUndo).toBe(false);
      });

      it('should not be undoable if isUndoAble is set to false', () => {
        const list = new ObservableUndoableList(serializer);
        list.beginCompoundOperation(false);
        list.push(serializer.fromJSON(value));
        list.push(serializer.fromJSON(value));
        list.endCompoundOperation();
        expect(list.canUndo).toBe(false);
      });
    });

    describe('#endCompoundOperation()', () => {
      it('should end a compound operation', () => {
        const list = new ObservableUndoableList(serializer);
        list.beginCompoundOperation();
        list.push(serializer.fromJSON(value));
        list.push(serializer.fromJSON(value));
        list.endCompoundOperation();
        expect(list.canUndo).toBe(true);
        list.undo();
        expect(list.canUndo).toBe(false);
      });
    });

    describe('#undo()', () => {
      it('should undo a push', () => {
        const list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        list.undo();
        expect(list.length).toBe(0);
      });

      it('should undo a pushAll', () => {
        const list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value), serializer.fromJSON(value)]);
        list.undo();
        expect(list.length).toBe(0);
      });

      it('should undo a remove', () => {
        const list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value), serializer.fromJSON(value)]);
        list.remove(0);
        list.undo();
        expect(list.length).toBe(2);
      });

      it('should undo a removeRange', () => {
        const list = new ObservableUndoableList(serializer);
        list.pushAll([
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value)
        ]);
        list.removeRange(1, 3);
        list.undo();
        expect(list.length).toBe(6);
      });

      it('should undo a move', () => {
        const items = [
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value)
        ];
        const list = new ObservableUndoableList(serializer);
        list.pushAll(items);
        list.move(1, 2);
        list.undo();
        expect((list.get(1) as any)['count']).toBe((items[1] as any)['count']);
      });
    });

    describe('#redo()', () => {
      it('should redo a push', () => {
        const list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        list.undo();
        list.redo();
        expect(list.length).toBe(1);
      });

      it('should redo a pushAll', () => {
        const list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value), serializer.fromJSON(value)]);
        list.undo();
        list.redo();
        expect(list.length).toBe(2);
      });

      it('should redo a remove', () => {
        const list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value), serializer.fromJSON(value)]);
        list.remove(0);
        list.undo();
        list.redo();
        expect(list.length).toBe(1);
      });

      it('should redo a removeRange', () => {
        const list = new ObservableUndoableList(serializer);
        list.pushAll([
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value)
        ]);
        list.removeRange(1, 3);
        list.undo();
        list.redo();
        expect(list.length).toBe(4);
      });

      it('should redo a move', () => {
        const items = [
          serializer.fromJSON(value),
          serializer.fromJSON(value),
          serializer.fromJSON(value)
        ];
        const list = new ObservableUndoableList(serializer);
        list.pushAll(items);
        list.move(1, 2);
        list.undo();
        list.redo();
        expect((list.get(2) as any)['count']).toBe((items[1] as any)['count']);
      });

      it('should redo a set', () => {
        const list = new ObservableUndoableList(ser);
        list.pushAll([new Item({ id: 'a' }), new Item({ id: 'b' })]);
        list.set(1, new Item({ id: 'c' }));
        expect(ids(list)).toBe('ac');
        list.undo();
        expect(ids(list)).toBe('ab');
        list.redo();
        expect(ids(list)).toBe('ac');
      });

      it('should not mutate change index in undo stack when redoing a set multiple times', () => {
        const list = new ObservableUndoableList(ser);
        list.pushAll([new Item({ id: 'a' }), new Item({ id: 'b' })]);
        list.set(0, new Item({ id: 'c' }));
        const seen: string[] = [ids(list)];
        for (let k = 0; k < 2; k++) {
          list.undo();
          seen.push(ids(list));
          list.redo();
          seen.push(ids(list));
        }
        expect(seen.join(' ')).toBe('cb ab cb ab cb');
      });

      it('should preserve compound operation order across multiple undo/redo cycles', () => {
        const list = new ObservableUndoableList(ser);
        list.push(new Item({ id: 'a' }));

        list.beginCompoundOperation();
        list.push(new Item({ id: 'b' }));
        list.push(new Item({ id: 'c' }));
        list.endCompoundOperation();

        expect(ids(list)).toBe('abc');

        // First undo/redo cycle
        list.undo();
        expect(ids(list)).toBe('a');
        list.redo();
        expect(ids(list)).toBe('abc');

        // Second undo/redo cycle (verifies that undo does not mutate stack in-place)
        list.undo();
        expect(ids(list)).toBe('a');
        list.redo();
        expect(ids(list)).toBe('abc');
      });
    });

    describe('#clearUndo()', () => {
      it('should clear the undo stack', () => {
        const list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        list.clearUndo();
        expect(list.canUndo).toBe(false);
      });
    });
  });
});
