// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  ObservableVector
} from '@jupyterlab/coreutils';


describe('common/ObservableVector', () => {

  describe('ObservableVector', () => {

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let value = new ObservableVector<number>();
        expect(value instanceof ObservableVector).to.be(true);
      });

      it('should accept an array argument', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value instanceof ObservableVector).to.be(true);
        expect(toArray(value)).to.eql([1, 2, 3]);
      });

    });

    describe('#changed', () => {

      it('should be emitted when the vector changes state', () => {
        let called = false;
        let value = new ObservableVector<number>();
        value.changed.connect(() => { called = true; });
        value.insert(0, 1);
        expect(called).to.be(true);
      });

      it('should have value changed args', () => {
        let called = false;
        let value = new ObservableVector<number>();
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('add');
          expect(args.newIndex).to.be(0);
          expect(args.oldIndex).to.be(-1);
          expect(args.newValues[0]).to.be(1);
          expect(args.oldValues.length).to.be(0);
          called = true;
        });
        value.pushBack(1);
        expect(called).to.be(true);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the vector is disposed', () => {
        let value = new ObservableVector<number>();
        expect(value.isDisposed).to.be(false);
        value.dispose();
        expect(value.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.dispose();
        expect(value.isDisposed).to.be(true);
      });

    });

    describe('#set()', () => {

      it('should set the item at a specific index', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.set(1, 4);
        expect(toArray(value)).to.eql([1, 4, 3]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('set');
          expect(args.newIndex).to.be(1);
          expect(args.oldIndex).to.be(1);
          expect(args.oldValues[0]).to.be(2);
          expect(args.newValues[0]).to.be(4);
          called = true;
        });
        value.set(1, 4);
        expect(called).to.be(true);
      });

    });

    describe('#pushBack()', () => {

      it('should add an item to the end of the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.pushBack(4);
        expect(toArray(value)).to.eql([1, 2, 3, 4]);
      });

      it('should return the new length of the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.pushBack(4)).to.be(4);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('add');
          expect(args.newIndex).to.be(3);
          expect(args.oldIndex).to.be(-1);
          expect(args.oldValues.length).to.be(0);
          expect(args.newValues[0]).to.be(4);
          called = true;
        });
        value.pushBack(4);
        expect(called).to.be(true);
      });

    });

    describe('#popBack()', () => {

      it('should remove an item from the end of the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.popBack();
        expect(toArray(value)).to.eql([1, 2]);
      });

      it('should return the removed value', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.popBack()).to.be(3);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('remove');
          expect(args.newIndex).to.be(-1);
          expect(args.oldIndex).to.be(2);
          expect(args.oldValues[0]).to.be(3);
          expect(args.newValues.length).to.be(0);
          called = true;
        });
        value.popBack();
        expect(called).to.be(true);
      });

    });

    describe('#insert()', () => {

      it('should insert an item into the vector at a specific index', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.insert(1, 4);
        expect(toArray(value)).to.eql([1, 4, 2, 3]);
      });

      it('should return the new length in the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.insert(1, 4)).to.be(4);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('add');
          expect(args.newIndex).to.be(1);
          expect(args.oldIndex).to.be(-1);
          expect(args.oldValues.length).to.be(0);
          expect(args.newValues[0]).to.be(4);
          called = true;
        });
        value.insert(1, 4);
        expect(called).to.be(true);
      });

    });

    describe('#move()', () => {

      it('should move an item from one index to another', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.move(1, 2);
        expect(toArray(value)).to.eql([1, 3, 2]);
        value.move(2, 0);
        expect(toArray(value)).to.eql([2, 1, 3]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let values = [1, 2, 3, 4, 5, 6];
        let value = new ObservableVector<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('move');
          expect(args.newIndex).to.be(1);
          expect(args.oldIndex).to.be(0);
          expect(args.oldValues[0]).to.be(1);
          expect(args.newValues[0]).to.be(1);
          called = true;
        });
        value.move(0, 1);
        expect(called).to.be(true);
      });

    });

    describe('#remove()', () => {

      it('should remove the first occurrence of a specific item from the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.remove(1);
        expect(toArray(value)).to.eql([2, 3]);
      });

      it('should return the index occupied by the item', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.remove(1)).to.be(0);
      });

      it('should return `-1` if the item is not in the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.remove(10)).to.be(-1);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let values = [1, 2, 3, 4, 5, 6];
        let value = new ObservableVector<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('remove');
          expect(args.newIndex).to.be(-1);
          expect(args.oldIndex).to.be(1);
          expect(args.oldValues[0]).to.be(2);
          expect(args.newValues.length).to.be(0);
          called = true;
        });
        value.remove(2);
        expect(called).to.be(true);
      });

    });

    describe('#removeAt()', () => {

      it('should remove the item at a specific index', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.removeAt(1);
        expect(toArray(value)).to.eql([1, 3]);
      });

      it('should return the item at the specified index', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.removeAt(1)).to.be(2);
      });

      it('should return `undefined` if the index is out of range', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.removeAt(10)).to.be(void 0);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let values = [1, 2, 3, 4, 5, 6];
        let value = new ObservableVector<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('remove');
          expect(args.newIndex).to.be(-1);
          expect(args.oldIndex).to.be(1);
          expect(args.oldValues[0]).to.be(2);
          expect(args.newValues.length).to.be(0);
          called = true;
        });
        value.removeAt(1);
        expect(called).to.be(true);
      });

    });

    describe('#clear()', () => {

      it('should remove all items from the vector', () => {
        let values = [1, 2, 3, 4, 5, 6];
        let value = new ObservableVector<number>({ values });
        value.clear();
        expect(value.length).to.be(0);
        value.clear();
        expect(value.length).to.be(0);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let values = [1, 2, 3, 4, 5, 6];
        let value = new ObservableVector<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('remove');
          expect(args.newIndex).to.be(0);
          expect(args.oldIndex).to.be(0);
          expect(toArray(args.oldValues)).to.eql(values);
          expect(args.newValues.length).to.be(0);
          called = true;
        });
        value.clear();
        expect(called).to.be(true);
      });

    });

    describe('#pushAll()', () => {

      it('should push an array of items to the end of the vector', () => {
        let value = new ObservableVector<number>({ values: [1] });
        value.pushAll([2, 3, 4]);
        expect(toArray(value)).to.eql([1, 2, 3, 4]);
      });

      it('should return the new length of the vector', () => {
        let value = new ObservableVector<number>({ values: [1] });
        expect(value.pushAll([2, 3, 4])).to.be(4);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('add');
          expect(args.newIndex).to.be(3);
          expect(args.oldIndex).to.be(-1);
          expect(toArray(args.newValues)).to.eql([4, 5, 6]);
          expect(args.oldValues.length).to.be(0);
          called = true;
        });
        value.pushAll([4, 5, 6]);
        expect(called).to.be(true);
      });

    });

    describe('#insertAll()', () => {

      it('should push an array of items into a vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.insertAll(1, [2, 3, 4]);
        expect(toArray(value)).to.eql([1, 2, 3, 4, 2, 3]);
      });

      it('should return the new length of the vector', () => {
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        expect(value.insertAll(1, [2, 3, 4])).to.be(6);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableVector<number>({ values: [1, 2, 3] });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('add');
          expect(args.newIndex).to.be(1);
          expect(args.oldIndex).to.be(-1);
          expect(toArray(args.newValues)).to.eql([4, 5, 6]);
          expect(args.oldValues.length).to.be(0);
          called = true;
        });
        value.insertAll(1, [4, 5, 6]);
        expect(called).to.be(true);
      });

    });

    describe('#removeRange()', () => {

      it('should remove a range of items from the vector', () => {
        let values = [1, 2, 3, 4, 5, 6];
        let value = new ObservableVector<number>({ values });
        value.removeRange(1, 3);
        expect(toArray(value)).to.eql([1, 4, 5, 6]);
      });

      it('should return the new length of the vector', () => {
        let values = [1, 2, 3, 4, 5, 6];
        let value = new ObservableVector<number>({ values });
        expect(value.removeRange(1, 3)).to.be(4);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let values = [1, 2, 3, 4];
        let value = new ObservableVector<number>({ values });
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('remove');
          expect(args.newIndex).to.be(-1);
          expect(args.oldIndex).to.be(1);
          expect(toArray(args.oldValues)).to.eql([2, 3]);
          expect(args.newValues.length).to.be(0);
          called = true;
        });
        value.removeRange(1, 3);
        expect(called).to.be(true);
      });

    });

  });

});
