// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  ObservableUndoableVector, ISerializer
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


describe('notebook/common/undo', () => {

  describe('ObservableUndoableVector', () => {

    describe('#constructor', () => {

      it('should create a new ObservableUndoableVector', () => {
        let vector = new ObservableUndoableVector(serializer);
        expect(vector).to.be.an(ObservableUndoableVector);
      });

    });

    describe('#canRedo', () => {

      it('should return false if there is no history', () => {
        let vector = new ObservableUndoableVector(serializer);
        expect(vector.canRedo).to.be(false);
      });

      it('should return true if there is an undo that can be redone', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushBack(new Test(value));
        vector.undo();
        expect(vector.canRedo).to.be(true);
      });

    });

    describe('#canUndo', () => {

      it('should return false if there is no history', () => {
        let vector = new ObservableUndoableVector(serializer);
        expect(vector.canUndo).to.be(false);
      });

      it('should return true if there is a change that can be undone', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushBack(serializer.fromJSON(value));
        expect(vector.canUndo).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the vector', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.dispose();
        expect(vector.isDisposed).to.be(true);
        vector.dispose();
        expect(vector.isDisposed).to.be(true);
      });

    });

    describe('#beginCompoundOperation()', () => {

      it('should begin a compound operation', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.beginCompoundOperation();
        vector.pushBack(serializer.fromJSON(value));
        vector.pushBack(serializer.fromJSON(value));
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(true);
        vector.undo();
        expect(vector.canUndo).to.be(false);
      });

      it('should not be undoable if isUndoAble is set to false', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.beginCompoundOperation(false);
        vector.pushBack(serializer.fromJSON(value));
        vector.pushBack(serializer.fromJSON(value));
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(false);
      });

    });

    describe('#endCompoundOperation()', () => {

      it('should end a compound operation', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.beginCompoundOperation();
        vector.pushBack(serializer.fromJSON(value));
        vector.pushBack(serializer.fromJSON(value));
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(true);
        vector.undo();
        expect(vector.canUndo).to.be(false);
      });

    });

    describe('#undo()', () => {

      it('should undo a pushBack', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushBack(serializer.fromJSON(value));
        vector.undo();
        expect(vector.length).to.be(0);
      });

      it('should undo a pushAll', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        vector.undo();
        expect(vector.length).to.be(0);
      });

      it('should undo a remove', () => {
         let vector = new ObservableUndoableVector(serializer);
         vector.pushAll([serializer.fromJSON(value),
                         serializer.fromJSON(value)]);
         vector.removeAt(0);
         vector.undo();
         expect(vector.length).to.be(2);
      });

      it('should undo a removeRange', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        vector.removeRange(1, 3);
        vector.undo();
        expect(vector.length).to.be(6);
      });

      it('should undo a move', () => {
        let items = [serializer.fromJSON(value),
                     serializer.fromJSON(value),
                     serializer.fromJSON(value)];
        let vector = new ObservableUndoableVector(serializer);
        vector.pushAll(items);
        vector.move(1, 2);
        vector.undo();
        expect((vector.at(1) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#redo()', () => {

      it('should redo a pushBack', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushBack(serializer.fromJSON(value));
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(1);
      });

      it('should redo a pushAll', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(2);
      });

      it('should redo a remove', () => {
         let vector = new ObservableUndoableVector(serializer);
         vector.pushAll([serializer.fromJSON(value),
                         serializer.fromJSON(value)]);
         vector.removeAt(0);
         vector.undo();
         vector.redo();
         expect(vector.length).to.be(1);
      });

      it('should redo a removeRange', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        vector.removeRange(1, 3);
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(4);
      });

      it('should undo a move', () => {
        let items = [serializer.fromJSON(value),
                     serializer.fromJSON(value),
                     serializer.fromJSON(value)];
        let vector = new ObservableUndoableVector(serializer);
        vector.pushAll(items);
        vector.move(1, 2);
        vector.undo();
        vector.redo();
        expect((vector.at(2) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#clearUndo()', () => {

      it('should clear the undo stack', () => {
        let vector = new ObservableUndoableVector(serializer);
        vector.pushBack(serializer.fromJSON(value));
        vector.clearUndo();
        expect(vector.canUndo).to.be(false);
      });

    });

  });

});
