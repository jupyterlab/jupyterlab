// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use-strict';

import expect = require('expect.js');

import {
  EditorModel
} from '../../../lib/editor/model';


describe('jupyter-js-notebook', () => {

  describe('EditorModel', () => {

    describe('#constructor()', () => {

      it('should create an editor model', () => {
        let model = new EditorModel();
        expect(model instanceof EditorModel).to.be(true);
      });

      it('should accept editor options', () => {
        let options = {
          text: 'foo',
          mimetype: 'text/python',
          filename: 'bar.py',
          fixedHeight: true,
          lineNumbers: true,
          readOnly: true,
          tabSize: 2
        }
        let model = new EditorModel(options);
        for (let key of Object.keys(options)) {
          expect((model as any)[key]).to.be((options as any)[key]);
        }
      });

    });

    describe('#stateChanged', () => {

      it('should be emitted when the state changes', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('text');
          expect(change.oldValue).to.be('');
          expect(change.newValue).to.be('foo');
          called = true;
        });
        model.text = 'foo';
        expect(called).to.be(true);
      });

    });

    describe('#filename', () => {

      it('should default to an empty string', () => {
        let model = new EditorModel();
        expect(model.filename).to.be('');
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('filename');
          expect(change.oldValue).to.be('');
          expect(change.newValue).to.be('foo.txt');
          called = true;
        });
        model.filename = 'foo.txt';
        expect(called).to.be(true);
      });

    });

    describe('#fixedHeight', () => {

      it('should default to false', () => {
        let model = new EditorModel();
        expect(model.fixedHeight).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('fixedHeight');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.fixedHeight = true;
        expect(called).to.be(true);
      });

    });

    describe('#mimetype', () => {

      it('should default to an empty string', () => {
        let model = new EditorModel();
        expect(model.mimetype).to.be('');
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('mimetype');
          expect(change.oldValue).to.be('');
          expect(change.newValue).to.be('text/python');
          called = true;
        });
        model.mimetype = 'text/python';
        expect(called).to.be(true);
      });

    });

    describe('#mimetype', () => {

      it('should default to false', () => {
        let model = new EditorModel();
        expect(model.lineNumbers).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('lineNumbers');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.lineNumbers = true;
        expect(called).to.be(true);
      });

    });

    describe('#tabSize', () => {

      it('should default to `4`', () => {
        let model = new EditorModel();
        expect(model.tabSize).to.be(4);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('tabSize');
          expect(change.oldValue).to.be(4);
          expect(change.newValue).to.be(2);
          called = true;
        });
        model.tabSize = 2;
        expect(called).to.be(true);
      });

    });

    describe('#text', () => {

      it('should default to an empty string', () => {
        let model = new EditorModel();
        expect(model.text).to.be('');
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('text');
          expect(change.oldValue).to.be('');
          expect(change.newValue).to.be('foo');
          called = true;
        });
        model.text = 'foo';
        expect(called).to.be(true);
      });

    });

    describe('#isDisposed', () => {

      it('should indicate whether the model is disposed', () => {
        let model = new EditorModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should clear signal data on the model', () => {
        let model = new EditorModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dispose();
        model.text = 'foo';
        expect(called).to.be(false);
      });

      it('should be safe to call multiple times', () => {
        let model = new EditorModel();
        model.dispose();
        model.dispose();
      });

    });

  });



});
