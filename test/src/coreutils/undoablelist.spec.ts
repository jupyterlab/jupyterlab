// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  IObservableUndoableList, ObservableUndoableList
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

class Serializer implements IObservableUndoableList.ISerializer<Test> {
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
        let vector = new ObservableUndoableList({serializer});
        expect(vector).to.be.an(ObservableUndoableList);
      });

    });

    describe('#canRedo', () => {

      it('should return false if there is no history', () => {
        let vector = new ObservableUndoableList({serializer});
        expect(vector.canRedo).to.be(false);
      });

      it('should return true if there is an undo that can be redone', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.push(new Test(value));
        vector.undo();
        expect(vector.canRedo).to.be(true);
      });

    });

    describe('#canUndo', () => {

      it('should return false if there is no history', () => {
        let vector = new ObservableUndoableList({serializer});
        expect(vector.canUndo).to.be(false);
      });

      it('should return true if there is a change that can be undone', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.push(serializer.fromJSON(value));
        expect(vector.canUndo).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the vector', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.dispose();
        expect(vector.isDisposed).to.be(true);
        vector.dispose();
        expect(vector.isDisposed).to.be(true);
      });

    });

    describe('#beginCompoundOperation()', () => {

      it('should begin a compound operation', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.beginCompoundOperation();
        vector.push(serializer.fromJSON(value));
        vector.push(serializer.fromJSON(value));
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(true);
        vector.undo();
        expect(vector.canUndo).to.be(false);
      });

      it('should not be undoable if isUndoAble is set to false', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.beginCompoundOperation(false);
        vector.push(serializer.fromJSON(value));
        vector.push(serializer.fromJSON(value));
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(false);
      });

    });

    describe('#endCompoundOperation()', () => {

      it('should end a compound operation', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.beginCompoundOperation();
        vector.push(serializer.fromJSON(value));
        vector.push(serializer.fromJSON(value));
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(true);
        vector.undo();
        expect(vector.canUndo).to.be(false);
      });

    });

    describe('#undo()', () => {

      it('should undo a pushBack', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.push(serializer.fromJSON(value));
        vector.undo();
        expect(vector.length).to.be(0);
      });

      it('should undo a pushAll', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        vector.undo();
        expect(vector.length).to.be(0);
      });

      it('should undo a remove', () => {
         let vector = new ObservableUndoableList({serializer});
         vector.pushAll([serializer.fromJSON(value),
                         serializer.fromJSON(value)]);
         vector.remove(0);
         vector.undo();
         expect(vector.length).to.be(2);
      });

      it('should undo a removeRange', () => {
        let vector = new ObservableUndoableList({serializer});
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
        let vector = new ObservableUndoableList({serializer});
        vector.pushAll(items);
        vector.move(1, 2);
        vector.undo();
        expect((vector.get(1) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#redo()', () => {

      it('should redo a pushBack', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.push(serializer.fromJSON(value));
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(1);
      });

      it('should redo a pushAll', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.pushAll([serializer.fromJSON(value),
                        serializer.fromJSON(value)]);
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(2);
      });

      it('should redo a remove', () => {
         let vector = new ObservableUndoableList({serializer});
         vector.pushAll([serializer.fromJSON(value),
                         serializer.fromJSON(value)]);
         vector.remove(0);
         vector.undo();
         vector.redo();
         expect(vector.length).to.be(1);
      });

      it('should redo a removeRange', () => {
        let vector = new ObservableUndoableList({serializer});
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
        let vector = new ObservableUndoableList({serializer});
        vector.pushAll(items);
        vector.move(1, 2);
        vector.undo();
        vector.redo();
        expect((vector.get(2) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#clearUndo()', () => {

      it('should clear the undo stack', () => {
        let vector = new ObservableUndoableList({serializer});
        vector.push(serializer.fromJSON(value));
        vector.clearUndo();
        expect(vector.canUndo).to.be(false);
      });

    });

  });

});
