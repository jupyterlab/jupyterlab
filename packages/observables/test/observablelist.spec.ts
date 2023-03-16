// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ObservableList } from '@jupyterlab/observables';

describe('@jupyterlab/observables', () => {
  describe('ObservableList', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const value = new ObservableList<number>();
        expect(value instanceof ObservableList).toBe(true);
      });

      it('should accept an array argument', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        expect(value instanceof ObservableList).toBe(true);
        expect(Array.from(value)).toEqual([1, 2, 3]);
      });
    });

    describe('#type', () => {
      it('should return `List`', () => {
        const value = new ObservableList<number>();
        expect(value.type).toBe('List');
      });
    });

    describe('#changed', () => {
      it('should be emitted when the list changes state', () => {
        let called = false;
        const value = new ObservableList<number>();
        value.changed.connect(() => {
          called = true;
        });
        value.insert(0, 1);
        expect(called).toBe(true);
      });

      it('should have value changed args', () => {
        let called = false;
        const value = new ObservableList<number>();
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('add');
          expect(args.newIndex).toBe(0);
          expect(args.oldIndex).toBe(-1);
          expect(args.newValues[0]).toBe(1);
          expect(args.oldValues.length).toBe(0);
          called = true;
        });
        value.push(1);
        expect(called).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the list is disposed', () => {
        const value = new ObservableList<number>();
        expect(value.isDisposed).toBe(false);
        value.dispose();
        expect(value.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the list', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.dispose();
        expect(value.isDisposed).toBe(true);
      });
    });

    describe('#get()', () => {
      it('should get the value at the specified index', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        expect(value.get(1)).toBe(2);
      });
    });

    describe('#set()', () => {
      it('should set the item at a specific index', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.set(1, 4);
        expect(Array.from(value)).toEqual([1, 4, 3]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('set');
          expect(args.newIndex).toBe(1);
          expect(args.oldIndex).toBe(1);
          expect(args.oldValues[0]).toBe(2);
          expect(args.newValues[0]).toBe(4);
          called = true;
        });
        value.set(1, 4);
        expect(called).toBe(true);
      });
    });

    describe('#push()', () => {
      it('should add an item to the end of the list', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.push(4);
        expect(Array.from(value)).toEqual([1, 2, 3, 4]);
      });

      it('should return the new length of the list', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        expect(value.push(4)).toBe(4);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('add');
          expect(args.newIndex).toBe(3);
          expect(args.oldIndex).toBe(-1);
          expect(args.oldValues.length).toBe(0);
          expect(args.newValues[0]).toBe(4);
          called = true;
        });
        value.push(4);
        expect(called).toBe(true);
      });
    });

    describe('#insert()', () => {
      it('should insert an item into the list at a specific index', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.insert(1, 4);
        expect(Array.from(value)).toEqual([1, 4, 2, 3]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('add');
          expect(args.newIndex).toBe(1);
          expect(args.oldIndex).toBe(-2);
          expect(args.oldValues.length).toBe(0);
          expect(args.newValues[0]).toBe(4);
          called = true;
        });
        value.insert(1, 4);
        expect(called).toBe(true);
      });
    });

    describe('#move()', () => {
      it('should move an item from one index to another', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.move(1, 2);
        expect(Array.from(value)).toEqual([1, 3, 2]);
        value.move(2, 0);
        expect(Array.from(value)).toEqual([2, 1, 3]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const values = [1, 2, 3, 4, 5, 6];
        const value = new ObservableList<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('move');
          expect(args.newIndex).toBe(1);
          expect(args.oldIndex).toBe(0);
          expect(args.oldValues[0]).toBe(1);
          expect(args.newValues[0]).toBe(1);
          called = true;
        });
        value.move(0, 1);
        expect(called).toBe(true);
      });
    });

    describe('#removeValue()', () => {
      it('should remove the first occurrence of a specific item from the list', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.removeValue(1);
        expect(Array.from(value)).toEqual([2, 3]);
      });

      it('should return the index occupied by the item', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        expect(value.removeValue(1)).toBe(0);
      });

      it('should return `-1` if the item is not in the list', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        expect(value.removeValue(10)).toBe(-1);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const values = [1, 2, 3, 4, 5, 6];
        const value = new ObservableList<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.newIndex).toBe(-1);
          expect(args.oldIndex).toBe(1);
          expect(args.oldValues[0]).toBe(2);
          expect(args.newValues.length).toBe(0);
          called = true;
        });
        value.removeValue(2);
        expect(called).toBe(true);
      });
    });

    describe('#remove()', () => {
      it('should remove the item at a specific index', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.remove(1);
        expect(Array.from(value)).toEqual([1, 3]);
      });

      it('should return the item at the specified index', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        expect(value.remove(1)).toBe(2);
      });

      it('should return `undefined` if the index is out of range', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        expect(value.remove(10)).toBeUndefined();
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const values = [1, 2, 3, 4, 5, 6];
        const value = new ObservableList<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.newIndex).toBe(-1);
          expect(args.oldIndex).toBe(1);
          expect(args.oldValues[0]).toBe(2);
          expect(args.newValues.length).toBe(0);
          called = true;
        });
        value.remove(1);
        expect(called).toBe(true);
      });
    });

    describe('#clear()', () => {
      it('should remove all items from the list', () => {
        const values = [1, 2, 3, 4, 5, 6];
        const value = new ObservableList<number>({ values });
        value.clear();
        expect(value.length).toBe(0);
        value.clear();
        expect(value.length).toBe(0);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const values = [1, 2, 3, 4, 5, 6];
        const value = new ObservableList<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.newIndex).toBe(0);
          expect(args.oldIndex).toBe(0);
          expect(Array.from(args.oldValues)).toEqual(values);
          expect(args.newValues.length).toBe(0);
          called = true;
        });
        value.clear();
        expect(called).toBe(true);
      });
    });

    describe('#pushAll()', () => {
      it('should push an array of items to the end of the list', () => {
        const value = new ObservableList<number>({ values: [1] });
        value.pushAll([2, 3, 4]);
        expect(Array.from(value)).toEqual([1, 2, 3, 4]);
      });

      it('should return the new length of the list', () => {
        const value = new ObservableList<number>({ values: [1] });
        expect(value.pushAll([2, 3, 4])).toBe(4);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('add');
          expect(args.newIndex).toBe(3);
          expect(args.oldIndex).toBe(-1);
          expect(Array.from(args.newValues)).toEqual([4, 5, 6]);
          expect(args.oldValues.length).toBe(0);
          called = true;
        });
        value.pushAll([4, 5, 6]);
        expect(called).toBe(true);
      });
    });

    describe('#insertAll()', () => {
      it('should push an array of items into a list', () => {
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.insertAll(1, [2, 3, 4]);
        expect(Array.from(value)).toEqual([1, 2, 3, 4, 2, 3]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableList<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('add');
          expect(args.newIndex).toBe(1);
          expect(args.oldIndex).toBe(-2);
          expect(Array.from(args.newValues)).toEqual([4, 5, 6]);
          expect(args.oldValues.length).toBe(0);
          called = true;
        });
        value.insertAll(1, [4, 5, 6]);
        expect(called).toBe(true);
      });
    });

    describe('#removeRange()', () => {
      it('should remove a range of items from the list', () => {
        const values = [1, 2, 3, 4, 5, 6];
        const value = new ObservableList<number>({ values });
        value.removeRange(1, 3);
        expect(Array.from(value)).toEqual([1, 4, 5, 6]);
      });

      it('should return the new length of the list', () => {
        const values = [1, 2, 3, 4, 5, 6];
        const value = new ObservableList<number>({ values });
        expect(value.removeRange(1, 3)).toBe(4);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const values = [1, 2, 3, 4];
        const value = new ObservableList<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.newIndex).toBe(-1);
          expect(args.oldIndex).toBe(1);
          expect(Array.from(args.oldValues)).toEqual([2, 3]);
          expect(args.newValues.length).toBe(0);
          called = true;
        });
        value.removeRange(1, 3);
        expect(called).toBe(true);
      });
    });
  });
});
