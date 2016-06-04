// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  EditorModel
} from '../../../../lib/notebook/editor/model';

import {
  InputAreaModel
} from '../../../../lib/notebook/input-area/model';


describe('jupyter-js-notebook', () => {

  describe('InputAreaModel', () => {

    describe('#constructor()', () => {

      it('should create an input area model', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        expect(model instanceof InputAreaModel).to.be(true);
      });

    });

    describe('#stateChanged', () => {

      it('should be emitted when the state changes', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('collapsed');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.collapsed = true;
        expect(called).to.be(true);
      });

    });

    describe('#collapsed', () => {

      it('should default to false', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        expect(model.collapsed).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('collapsed');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.collapsed = true;
        expect(called).to.be(true);
      });

      it('should not emit the signal when there is no change', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        let called = false;
        model.stateChanged.connect((editor, change) => {
          called = true;
        });
        model.collapsed = false;
        expect(called).to.be(false);
      });

    });

    describe('#prompt', () => {

      it('should default to `null`', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        expect(model.prompt).to.be(null);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('prompt');
          expect(change.oldValue).to.be(null);
          expect(change.newValue).to.be('foo');
          called = true;
        });
        model.prompt = 'foo';
        expect(called).to.be(true);
      });

      it('should not emit the signal when there is no change', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        let called = false;
        model.stateChanged.connect((editor, change) => {
          called = true;
        });
        model.prompt = null;
        expect(called).to.be(false);
      });

    });

    describe('#textEditor', () => {

      it('should be the editor model', () => {
        let editor = new EditorModel({ filename: 'foo.txt' });
        let model = new InputAreaModel(editor);
        expect(model.textEditor.filename).to.be('foo.txt');
      });

      it('should be read-only', () => {
        let editor = new EditorModel({ filename: 'foo.txt' });
        let model = new InputAreaModel(editor);
        expect(() => { model.textEditor = new EditorModel(); }).to.throwError();
      });

    });

    describe('#isDisposed', () => {

      it('should indicate whether the model is disposed', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should clear signal data on the model', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dispose();
        model.collapsed = true;
        expect(called).to.be(false);
      });

      it('should be safe to call multiple times', () => {
        let editor = new EditorModel();
        let model = new InputAreaModel(editor);
        model.dispose();
        model.dispose();
      });

    });

  });

});
