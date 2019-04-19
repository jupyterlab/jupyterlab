// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ObservableMap } from '@jupyterlab/observables';

describe('@jupyterlab/observables', () => {
  describe('ObservableMap', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const value = new ObservableMap<number>();
        expect(value instanceof ObservableMap).to.equal(true);
      });
    });

    describe('#type', () => {
      it('should return `Map`', () => {
        const value = new ObservableMap<number>();
        expect(value.type).to.equal('Map');
      });
    });

    describe('#size', () => {
      it('should return the number of entries in the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        expect(value.size).to.equal(2);
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
        expect(called).to.equal(true);
      });

      it('should have value changed args', () => {
        let called = false;
        const value = new ObservableMap<number>();
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('add');
          expect(args.newValue).to.equal(0);
          expect(args.oldValue).to.be.undefined;
          expect(args.key).to.equal('entry');
          called = true;
        });
        value.set('entry', 0);
        expect(called).to.equal(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the map is disposed', () => {
        const value = new ObservableMap<number>();
        expect(value.isDisposed).to.equal(false);
        value.dispose();
        expect(value.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.dispose();
        expect(value.isDisposed).to.equal(true);
      });
    });

    describe('#set()', () => {
      it('should set the item at a specific key', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.get('one')).to.equal(1);
      });

      it('should return the old value for that key', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        const x = value.set('one', 1.01);
        expect(x).to.equal(1);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableMap<number>();
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('add');
          expect(args.newValue).to.equal(1);
          expect(args.oldValue).to.be.undefined;
          expect(args.key).to.equal('one');
          called = true;
        });
        value.set('one', 1);
        expect(called).to.equal(true);
      });
    });

    describe('#get()', () => {
      it('should get the value for a key', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.get('one')).to.equal(1);
      });

      it('should return undefined if the key does not exist', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.get('two')).to.be.undefined;
      });
    });

    describe('#has()', () => {
      it('should whether the key exists in a map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.has('one')).to.equal(true);
        expect(value.has('two')).to.equal(false);
      });
    });

    describe('#keys()', () => {
      it('should return a list of the keys in the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        const keys = value.keys();
        expect(keys).to.deep.equal(['one', 'two', 'three']);
      });
    });

    describe('#values()', () => {
      it('should return a list of the values in the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        const keys = value.values();
        expect(keys).to.deep.equal([1, 2, 3]);
      });
    });

    describe('#delete()', () => {
      it('should remove an item from the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        expect(value.get('two')).to.equal(2);
        value.delete('two');
        expect(value.get('two')).to.be.undefined;
      });

      it('should return the value of the key it removed', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        expect(value.delete('one')).to.equal(1);
        expect(value.delete('one')).to.be.undefined;
      });

      it('should trigger a changed signal if actually removed', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        let called = false;

        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('remove');
          expect(args.key).to.equal('two');
          expect(args.oldValue).to.equal(2);
          expect(args.newValue).to.be.undefined;
          called = true;
        });
        value.delete('two');
        expect(called).to.equal(true);
      });

      it('should not trigger a changed signal if not actually removed', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('three', 3);
        let called = false;

        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('remove');
          expect(args.key).to.equal('two');
          expect(args.oldValue).to.equal(2);
          expect(args.newValue).to.be.undefined;
          called = true;
        });

        // 'two' is not in the map
        value.delete('two');
        expect(called).to.equal(false);
      });
    });

    describe('#clear()', () => {
      it('should remove all items from the map', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        value.set('two', 2);
        value.set('three', 3);
        value.clear();
        expect(value.size).to.equal(0);
        value.clear();
        expect(value.size).to.equal(0);
      });

      it('should trigger a changed signal', () => {
        const value = new ObservableMap<number>();
        value.set('one', 1);
        let called = false;
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('remove');
          expect(args.key).to.equal('one');
          expect(args.oldValue).to.equal(1);
          expect(args.newValue).to.be.undefined;
          called = true;
        });
        value.clear();
        expect(called).to.equal(true);
      });
    });
  });
});
