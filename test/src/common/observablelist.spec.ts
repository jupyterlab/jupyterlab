// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  ObservableList
} from '../../../lib/common/observablelist';


class LoggingList extends ObservableList<number> {

  methods: string[] = [];

  get internalArray(): number[] {
    return toArray(this.internal);
  }

  protected addItem(index: number, item: number): number {
    this.methods.push('addItem');
    return super.addItem(index, item);
  }

  protected moveItem(fromIndex: number, toIndex: number): boolean {
    this.methods.push('moveItem');
    return super.moveItem(fromIndex, toIndex);
  }

  protected replaceItems(index: number, count: number, items: number[]): number[] {
    this.methods.push('replaceItems');
    return super.replaceItems(index, count, items);
  }

  protected setItem(index: number, item: number): number {
    this.methods.push('setItem');
    return super.setItem(index, item);
  }
}


describe('common/observablelist', () => {

  describe('ObservableList', () => {

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let list = new ObservableList<number>();
        expect(list instanceof ObservableList).to.be(true);
      });

      it('should accept an array argument', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list instanceof ObservableList).to.be(true);
      });

      it('should initialize the list items', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice()).to.eql([1, 2, 3]);
      });

    });

    describe('#changed', () => {

      it('should be emitted when the list changes state', () => {
        let called = false;
        let list = new ObservableList<number>();
        list.changed.connect(() => { called = true; });
        list.insert(0, 1);
        expect(called).to.be(true);
      });

      it('should have list changed args', () => {
        let called = false;
        let list = new ObservableList<number>();
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'add',
            newIndex: 0,
            newValue: 1,
            oldIndex: -1,
            oldValue: void 0
          });
          called = true;
        });
        list.add(1);
        expect(called).to.be(true);
      });

    });

    describe('#length', () => {

      it('should give the number of items in the list', () => {
        let list = new ObservableList<number>();
        expect(list.length).to.be(0);
        list.insert(0, 1);
        expect(list.length).to.be(1);
      });

    });

    describe('#get()', () => {

      it('should get the item at a specific index in the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.get(0)).to.be(1);
        expect(list.get(1)).to.be(2);
        expect(list.get(2)).to.be(3);
      });

      it('should offset from the end of the list if index is negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.get(-1)).to.be(3);
        expect(list.get(-2)).to.be(2);
        expect(list.get(-3)).to.be(1);
      });

      it('should return `undefined` if the index is out of range', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.get(3)).to.be(void 0);
      });

    });

    describe('#indexOf()', () => {

      it('should get the index of the first occurence of an item in the list', () => {
        let list = new ObservableList<number>([1, 2, 3, 3]);
        expect(list.indexOf(1)).to.be(0);
        expect(list.indexOf(2)).to.be(1);
        expect(list.indexOf(3)).to.be(2);
      });

      it('should return `-1` if the item is not in the list', () => {
        let list = new ObservableList<number>([1, 2, 3, 3]);
        expect(list.indexOf(4)).to.be(-1);
      });

    });

    describe('#contains()', () => {

      it('should test whether the list contains a specific item', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.contains(1)).to.be(true);
        expect(list.contains(4)).to.be(false);
      });

    });

    describe('#slice()', () => {

      it('should get a shallow copy of a portion of the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice()).to.eql([1, 2, 3]);
        expect(list.slice()).to.not.be(list.slice());
      });

      it('should index start from the end if negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice(-1)).to.eql([3]);
      });

      it('should clamp start to the bounds of the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice(4)).to.eql([]);
      });

      it('should default start to `0`', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice()).to.eql([1, 2, 3]);
      });

      it('should index end from the end if negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice(1, -1)).to.eql([2]);
      });

      it('should clamp end to the bounds of the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice(1, 4)).to.eql([2, 3]);
      });

      it('should default end to the length of the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.slice(1)).to.eql([2, 3]);
      });

    });

    describe('#set()', () => {

      it('should set the item at a specific index', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.set(1, 4);
        expect(list.slice()).to.eql([1, 4, 3]);
      });

      it('should index from the end if negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.set(-1, 4);
        expect(list.slice()).to.eql([1, 2, 4]);
      });

      it('should return the item which occupied the index', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.set(1, 4)).to.be(2);
      });

      it('should return `undefined` if the index is out of range', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.set(4, 4)).to.be(void 0);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'set',
            newIndex: 1,
            newValue: 4,
            oldIndex: 1,
            oldValue: 2
          });
          called = true;
        });
        list.set(1, 4);
        expect(called).to.be(true);
      });

    });

    describe('#assign()', () => {

      it('should replace all items in the list', () => {
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.assign([9, 8, 7, 6]);
        expect(list.slice()).to.eql([9, 8, 7, 6]);
      });

      it('should return the old items', () => {
        let list = new ObservableList<number>([1, 2, 3, 4]);
        expect(list.assign([9, 8, 7, 6])).to.eql([1, 2, 3, 4]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          console.log('1 HERE I AM');
          expect(args).to.eql({
            type: 'replace',
            newIndex: 0,
            newValue: [9, 8, 7, 6],
            oldIndex: 0,
            oldValue: [1, 2, 3, 4, 5, 6]
          });
          console.log('2 HERE I AM');
          called = true;
        });
        list.assign([9, 8, 7, 6]);
        expect(called).to.be(true);
      });

    });

    describe('#add()', () => {

      it('should add an item to the end of the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.add(4);
        expect(list.slice()).to.eql([1, 2, 3, 4]);
      });

      it('should return the new index of the item in the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.add(4)).to.be(3);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'add',
            newIndex: 3,
            newValue: 4,
            oldIndex: -1,
            oldValue: void 0
          });
          called = true;
        });
        list.add(4);
        expect(called).to.be(true);
      });

    });

    describe('#insert()', () => {

      it('should insert an item into the list at a specific index', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.insert(1, 4);
        expect(list.slice()).to.eql([1, 4, 2, 3]);
      });

      it('should index from the end of list if the index is negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.insert(-1, 4);
        expect(list.slice()).to.eql([1, 2, 4, 3]);
      });

      it('should clamp to the bounds of the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.insert(10, 4);
        expect(list.slice()).to.eql([1, 2, 3, 4]);
      });

      it('should return the new index of the item in the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.insert(10, 4)).to.be(3);
        expect(list.insert(-2, 9)).to.be(2);
        expect(list.insert(-10, 5)).to.be(0);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'add',
            newIndex: 1,
            newValue: 4,
            oldIndex: -1,
            oldValue: void 0
          });
          called = true;
        });
        list.insert(1, 4);
        expect(called).to.be(true);
      });

    });

    describe('#move()', () => {

      it('should move an item from one index to another', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.move(1, 2);
        expect(list.slice()).to.eql([1, 3, 2]);
      });

      it('should index fromIndex from the end of list if negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.move(-1, 1);
        expect(list.slice()).to.eql([1, 3, 2]);
      });

      it('should index toIndex from the end of list if negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.move(0, -1);
        expect(list.slice()).to.eql([2, 3, 1]);
      });

      it('should return `true` if the item was moved', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.move(0, 1)).to.be(true);
      });

      it('should return `false` if the either index is out of range', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.move(10, 1)).to.be(false);
        expect(list.move(1, 10)).to.be(false);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'move',
            newIndex: 1,
            newValue: 1,
            oldIndex: 0,
            oldValue: 1
          });
          called = true;
        });
        list.move(0, 1);
        expect(called).to.be(true);
      });

    });

    describe('#remove()', () => {

      it('should remove the first occurrence of a specific item from the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.remove(1);
        expect(list.slice()).to.eql([2, 3]);
      });

      it('should return the index occupied by the item', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.remove(1)).to.be(0);
      });

      it('should return `-1` if the item is not in the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.remove(10)).to.be(-1);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'remove',
            newIndex: -1,
            newValue: void 0,
            oldIndex: 1,
            oldValue: 2
          });
          called = true;
        });
        list.remove(2);
        expect(called).to.be(true);
      });

    });

    describe('#removeAt()', () => {

      it('should remove the item at a specific index', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.removeAt(1);
        expect(list.slice()).to.eql([1, 3]);
      });

      it('should index from the end of list if negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.removeAt(-1);
        expect(list.slice()).to.eql([1, 2]);
      });

      it('should return the item at the specified index', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.removeAt(1)).to.be(2);
      });

      it('should return `undefined` if the index is out of range', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        expect(list.removeAt(10)).to.be(void 0);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'remove',
            newIndex: -1,
            newValue: void 0,
            oldIndex: 1,
            oldValue: 2
          });
          called = true;
        });
        list.removeAt(1);
        expect(called).to.be(true);
      });

    });

    describe('#replace()', () => {

      it('should replace items at a specific location in the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.replace(1, 2, [4, 5, 6]);
        expect(list.slice()).to.eql([1, 4, 5, 6]);
      });

      it('should index from the end of the list if negative', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.replace(-2, 2, [4, 5, 6]);
        expect(list.slice()).to.eql([1, 4, 5, 6]);
      });

      it('should clamp the index to the bounds of the list', () => {
        let list = new ObservableList<number>([1, 2, 3]);
        list.replace(10, 2, [4, 5, 6]);
        expect(list.slice()).to.eql([1, 2, 3, 4, 5, 6]);
      });

      it('should remove the given count of items', () => {
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.replace(0, 3, [1, 2]);
        expect(list.slice()).to.eql([1, 2, 4, 5, 6]);
      });

      it('should clamp the count to the length of the list', () => {
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.replace(0, 10, [1, 2]);
        expect(list.slice()).to.eql([1, 2]);
      });

      it('should handle an empty items array', () => {
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.replace(1, 10, []);
        expect(list.slice()).to.eql([1]);
      });

      it('should return an array of items removed from the list', () => {
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        expect(list.replace(1, 3, [])).to.eql([2, 3, 4]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'replace',
            newIndex: 0,
            newValue: [],
            oldIndex: 0,
            oldValue: [1, 2, 3, 4, 5, 6]
          });
          called = true;
        });
        list.replace(0, 10, []);
        expect(called).to.be(true);
      });

    });

    describe('#clear()', () => {

      it('should remove all items from the list', () => {
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.clear();
        expect(list.length).to.be(0);
        list.clear();
        expect(list.length).to.be(0);
      });

      it('should return the removed items', () => {
        let list = new ObservableList<number>([1, 2, 3, 4]);
        expect(list.clear()).to.eql([1, 2, 3, 4]);
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let list = new ObservableList<number>([1, 2, 3, 4, 5, 6]);
        list.changed.connect((sender, args) => {
          expect(sender).to.be(list);
          expect(args).to.eql({
            type: 'replace',
            newIndex: 0,
            newValue: [],
            oldIndex: 0,
            oldValue: [1, 2, 3, 4, 5, 6]
          });
          called = true;
        });
        list.clear();
        expect(called).to.be(true);
      });

    });

    describe('#internal', () => {

      it('should be the protected internal array of items for the list', () => {
        let list = new LoggingList([1, 2, 3]);
        expect(list.internalArray).to.eql([1, 2, 3]);
      });

    });

    describe('#addItem()', () => {

      it('should be called when we add an item at the specified index', () => {
        let list = new LoggingList([1, 2, 3]);
        list.add(1);
        expect(list.methods.indexOf('addItem')).to.not.be(-1);
      });

    });

    describe('#moveItem()', () => {

      it('should be called when we move an item from one index to another', () => {
        let list = new LoggingList([1, 2, 3]);
        list.move(1, 0);
        expect(list.methods.indexOf('moveItem')).to.not.be(-1);
      });

    });

    describe('#replaceItems()', () => {

      it('should be called when we replace items at a specific location in the list', () => {
        let list = new LoggingList([1, 2, 3]);
        list.replace(1, 1, []);
        expect(list.methods.indexOf('replaceItems')).to.not.be(-1);
      });

    });

    describe('#setItem()', () => {

      it('should be called when we set the item at a specific index', () => {
        let list = new LoggingList([1, 2, 3]);
        list.set(1, 4);
        expect(list.methods.indexOf('setItem')).to.not.be(-1);
      });

    });

  });

});
