// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ObservableMap } from '@jupyterlab/observables';

describe('@jupyterlab/observables', () => {
  describe('ObservableMap', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const value = new ObservableMap<number>();
        expect(value instanceof ObservableMap).toBe(true);
      });
    });

    describe('#type', () => {
      it('should return `Map`', () => {
        const value = new ObservableMap<number>();
        expect(value.type).toBe('Map');
      });
    });

    describe('#size', () => {
      it('should return the number of entries in the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        expect(value.size).toBe(2);
      });
    });

    describe('#changed', () => {
      it('should be emitted when the map changes state', () => {
        let called = false;
        const value = new ObservableMap<number>();
        value.changed.connect(() => {
          called = true;
        });
        value.set('entry', 1);
        expect(called).toBe(true);
      });

      it('should have value changed args', () => {
        let called = false;
        const value = new ObservableMap<number>();
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('add');
          expect(args.newValue).toBe(0);
          expect(args.oldValue).toBeUndefined();
          expect(args.key).toBe('entry');
          called = true;
        });
        value.set('entry', 0);
        expect(called).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the map is disposed', () => {
        const value = new ObservableMap<number>();
        expect(value.isDisposed).toBe(false);
        value.dispose();
        expect(value.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.dispose();
        expect(value.isDisposed).toBe(true);
      });
    });

    describe('#set()', () => {
      it('should set the item at a specific key', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.get('one')).toBe(1);
      });

      it('should return the old value for that key', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        const x = value.set('one', 1.01);
        expect(x).toBe(1);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableMap<number>();
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('add');
          expect(args.newValue).toBe(1);
          expect(args.oldValue).toBeUndefined();
          expect(args.key).toBe('one');
          called = true;
        });
        value.set('one', 1);
        expect(called).toBe(true);
      });
    });

    describe('#get()', () => {
      it('should get the value for a key', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.get('one')).toBe(1);
      });

      it('should return undefined if the key does not exist', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.get('two')).toBeUndefined();
      });
    });

    describe('#has()', () => {
      it('should whether the key exists in a map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.has('one')).toBe(true);
        expect(value.has('two')).toBe(false);
      });
    });

    describe('#keys()', () => {
      it('should return a list of the keys in the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        const keys = value.keys();
        expect(keys).toEqual(['one', 'two', 'three']);
      });
    });

    describe('#values()', () => {
      it('should return a list of the values in the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        const keys = value.values();
        expect(keys).toEqual([1, 2, 3]);
      });
    });

    describe('#delete()', () => {
      it('should remove an item from the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        expect(value.get('two')).toBe(2);
        value.delete('two');
        expect(value.get('two')).toBeUndefined();
      });

      it('should return the value of the key it removed', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.delete('one')).toBe(1);
        expect(value.delete('one')).toBeUndefined();
      });

      it('should trigger a changed signal if actually removed', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        let called = false;

        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.key).toBe('two');
          expect(args.oldValue).toBe(2);
          expect(args.newValue).toBeUndefined();
          called = true;
        });
        value.delete('two');
        expect(called).toBe(true);
      });

      it('should not trigger a changed signal if not actually removed', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('three', 3);
        let called = false;

        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.key).toBe('two');
          expect(args.oldValue).toBe(2);
          expect(args.newValue).toBeUndefined();
          called = true;
        });

        // 'two' is not in the map
        value.delete('two');
        expect(called).toBe(false);
      });
    });

    describe('#clear()', () => {
      it('should remove all items from the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        value.clear();
        expect(value.size).toBe(0);
        value.clear();
        expect(value.size).toBe(0);
      });

      it('should trigger a changed signal', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        let called = false;
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.key).toBe('one');
          expect(args.oldValue).toBe(1);
          expect(args.newValue).toBeUndefined();
          called = true;
        });
        value.clear();
        expect(called).toBe(true);
      });
    });
  });
});
