// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  ObservableUndoableList, ISerializer
} from '@jupyterlab/coreutils';



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


describe('@jupyterlab/coreutils', () => {

  describe('ObservableUndoableList', () => {

    describe('#constructor', () => {

      it('should create a new ObservableUndoableList', () => {
        let list = new ObservableUndoableList(serializer);
        expect(list).to.be.an(ObservableUndoableList);
      });

    });

    describe('#canRedo', () => {

      it('should return false if there is no history', () => {
        let list = new ObservableUndoableList(serializer);
        expect(list.canRedo).to.be(false);
      });

      it('should return true if there is an undo that can be redone', () => {
        let list = new ObservableUndoableList(serializer);
        list.push(new Test(value));
        list.undo();
        expect(list.canRedo).to.be(true);
      });

    });

    describe('#canUndo', () => {

      it('should return false if there is no history', () => {
        let list = new ObservableUndoableList(serializer);
        expect(list.canUndo).to.be(false);
      });

      it('should return true if there is a change that can be undone', () => {
        let list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        expect(list.canUndo).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the list', () => {
        let list = new ObservableUndoableList(serializer);
        list.dispose();
        expect(list.isDisposed).to.be(true);
        list.dispose();
        expect(list.isDisposed).to.be(true);
      });

    });

    describe('#beginCompoundOperation()', () => {

      it('should begin a compound operation', () => {
        let list = new ObservableUndoableList(serializer);
        list.beginCompoundOperation();
        list.push(serializer.fromJSON(value));
        list.push(serializer.fromJSON(value));
        list.endCompoundOperation();
        expect(list.canUndo).to.be(true);
        list.undo();
        expect(list.canUndo).to.be(false);
      });

      it('should not be undoable if isUndoAble is set to false', () => {
        let list = new ObservableUndoableList(serializer);
        list.beginCompoundOperation(false);
        list.push(serializer.fromJSON(value));
        list.push(serializer.fromJSON(value));
        list.endCompoundOperation();
        expect(list.canUndo).to.be(false);
      });

    });

    describe('#endCompoundOperation()', () => {

      it('should end a compound operation', () => {
        let list = new ObservableUndoableList(serializer);
        list.beginCompoundOperation();
        list.push(serializer.fromJSON(value));
        list.push(serializer.fromJSON(value));
        list.endCompoundOperation();
        expect(list.canUndo).to.be(true);
        list.undo();
        expect(list.canUndo).to.be(false);
      });

    });

    describe('#undo()', () => {

      it('should undo a push', () => {
        let list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        list.undo();
        expect(list.length).to.be(0);
      });

      it('should undo a pushAll', () => {
        let list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        list.undo();
        expect(list.length).to.be(0);
      });

      it('should undo a remove', () => {
         let list = new ObservableUndoableList(serializer);
         list.pushAll([serializer.fromJSON(value),
                         serializer.fromJSON(value)]);
         list.remove(0);
         list.undo();
         expect(list.length).to.be(2);
      });

      it('should undo a removeRange', () => {
        let list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        list.removeRange(1, 3);
        list.undo();
        expect(list.length).to.be(6);
      });

      it('should undo a move', () => {
        let items = [serializer.fromJSON(value),
                     serializer.fromJSON(value),
                     serializer.fromJSON(value)];
        let list = new ObservableUndoableList(serializer);
        list.pushAll(items);
        list.move(1, 2);
        list.undo();
        expect((list.get(1) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#redo()', () => {

      it('should redo a push', () => {
        let list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        list.undo();
        list.redo();
        expect(list.length).to.be(1);
      });

      it('should redo a pushAll', () => {
        let list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        list.undo();
        list.redo();
        expect(list.length).to.be(2);
      });

      it('should redo a remove', () => {
         let list = new ObservableUndoableList(serializer);
         list.pushAll([serializer.fromJSON(value),
                         serializer.fromJSON(value)]);
         list.remove(0);
         list.undo();
         list.redo();
         expect(list.length).to.be(1);
      });

      it('should redo a removeRange', () => {
        let list = new ObservableUndoableList(serializer);
        list.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        list.removeRange(1, 3);
        list.undo();
        list.redo();
        expect(list.length).to.be(4);
      });

      it('should undo a move', () => {
        let items = [serializer.fromJSON(value),
                     serializer.fromJSON(value),
                     serializer.fromJSON(value)];
        let list = new ObservableUndoableList(serializer);
        list.pushAll(items);
        list.move(1, 2);
        list.undo();
        list.redo();
        expect((list.get(2) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#clearUndo()', () => {

      it('should clear the undo stack', () => {
        let list = new ObservableUndoableList(serializer);
        list.push(serializer.fromJSON(value));
        list.clearUndo();
        expect(list.canUndo).to.be(false);
      });

    });

  });

});
