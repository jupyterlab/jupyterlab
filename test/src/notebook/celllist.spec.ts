// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CellModel
} from '@jupyterlab/cells';

import {
  CellList
} from '@jupyterlab/notebook';


function createCell(): CellModel {
  return new CellModel({});
}


describe('@jupyterlab/notebook', () => {

  describe('CellList', () => {

    describe('#constructor', () => {

      it('should create a new CellList', () => {
        let vector = new CellList();
        expect(vector).to.be.an(CellList);
      });

    });

    describe('#canRedo', () => {

      it('should return false if there is no history', () => {
        let vector = new CellList();
        expect(vector.canRedo).to.be(false);
      });

      it('should return true if there is an undo that can be redone', () => {
        let vector = new CellList();
        vector.push(createCell());
        vector.undo();
        expect(vector.canRedo).to.be(true);
      });

    });

    describe('#canUndo', () => {

      it('should return false if there is no history', () => {
        let vector = new CellList();
        expect(vector.canUndo).to.be(false);
      });

      it('should return true if there is a change that can be undone', () => {
        let vector = new CellList();
        vector.push(createCell());
        expect(vector.canUndo).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the vector', () => {
        let vector = new CellList();
        vector.dispose();
        expect(vector.isDisposed).to.be(true);
        vector.dispose();
        expect(vector.isDisposed).to.be(true);
      });

    });

    describe('#beginCompoundOperation()', () => {

      it('should begin a compound operation', () => {
        let vector = new CellList();
        vector.beginCompoundOperation();
        vector.push(createCell());
        vector.push(createCell());
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(true);
        vector.undo();
        expect(vector.canUndo).to.be(false);
      });

      it('should not be undoable if isUndoAble is set to false', () => {
        let vector = new CellList();
        vector.beginCompoundOperation(false);
        vector.push(createCell());
        vector.push(createCell());
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(false);
      });

    });

    describe('#endCompoundOperation()', () => {

      it('should end a compound operation', () => {
        let vector = new CellList();
        vector.beginCompoundOperation();
        vector.push(createCell());
        vector.push(createCell());
        vector.endCompoundOperation();
        expect(vector.canUndo).to.be(true);
        vector.undo();
        expect(vector.canUndo).to.be(false);
      });

    });

    describe('#undo()', () => {

      it('should undo a pushBack', () => {
        let vector = new CellList();
        vector.push(createCell());
        vector.undo();
        expect(vector.length).to.be(0);
      });

      it('should undo a pushAll', () => {
        let vector = new CellList();
        vector.pushAll([createCell(),
                        createCell()]);
        vector.undo();
        expect(vector.length).to.be(0);
      });

      it('should undo a remove', () => {
         let vector = new CellList();
         vector.pushAll([createCell(),
                         createCell()]);
         vector.remove(0);
         vector.undo();
         expect(vector.length).to.be(2);
      });

      it('should undo a removeRange', () => {
        let vector = new CellList();
        vector.pushAll([createCell(),
                        createCell(),
                        createCell(),
                        createCell(),
                        createCell(),
                        createCell()]);
        vector.removeRange(1, 3);
        vector.undo();
        expect(vector.length).to.be(6);
      });

      it('should undo a move', () => {
        let items = [createCell(),
                     createCell(),
                     createCell()];
        let vector = new CellList();
        vector.pushAll(items);
        vector.move(1, 2);
        vector.undo();
        expect((vector.get(1) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#redo()', () => {

      it('should redo a pushBack', () => {
        let vector = new CellList();
        vector.push(createCell());
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(1);
      });

      it('should redo a pushAll', () => {
        let vector = new CellList();
        vector.pushAll([createCell(),
                        createCell()]);
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(2);
      });

      it('should redo a remove', () => {
         let vector = new CellList();
         vector.pushAll([createCell(),
                         createCell()]);
         vector.remove(0);
         vector.undo();
         vector.redo();
         expect(vector.length).to.be(1);
      });

      it('should redo a removeRange', () => {
        let vector = new CellList();
        vector.pushAll([createCell(),
                        createCell(),
                        createCell(),
                        createCell(),
                        createCell(),
                        createCell()]);
        vector.removeRange(1, 3);
        vector.undo();
        vector.redo();
        expect(vector.length).to.be(4);
      });

      it('should undo a move', () => {
        let items = [createCell(),
                     createCell(),
                     createCell()];
        let vector = new CellList();
        vector.pushAll(items);
        vector.move(1, 2);
        vector.undo();
        vector.redo();
        expect((vector.get(2) as any)['count']).to.be((items[1] as any)['count']);
      });

    });

    describe('#clearUndo()', () => {

      it('should clear the undo stack', () => {
        let vector = new CellList();
        vector.push(createCell());
        vector.clearUndo();
        expect(vector.canUndo).to.be(false);
      });

    });

  });

});
