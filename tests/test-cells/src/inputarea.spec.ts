// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import {
  InputArea, InputPrompt, CodeCellModel
} from '@jupyterlab/cells';


const PROMPT_CLASS = 'jp-InputArea-prompt';


describe('@jupyterlab/cells', () => {

  const model = new CodeCellModel({});

  describe('InputArea', () => {

    describe('#constructor()', () => {

      it('should create an input area widget', () => {
        let widget = new InputArea({ model });
        expect(widget).to.be.an(InputArea);
      });

    });

    describe('#model', () => {

      it('should be the model used by the input area', () => {
        let widget = new InputArea({ model });
        expect(widget.model).to.be(model);
      });

    });

    describe('#contentFactory', () => {

      it('should be the content factory used by the input area', () => {
        let widget = new InputArea({ model });
        expect(widget.contentFactory).to.be(InputArea.defaultContentFactory);
      });

    });

    describe('#editorWidget', () => {

      it('should be the editor widget used by the input area', () => {
        let widget = new InputArea({ model });
        expect(widget.editorWidget).to.be.a(CodeEditorWrapper);
      });

    });

    describe('#editor', () => {

      it('should be the code editor used by the cell', () => {
        let widget = new InputArea({ model });
        expect(widget.editor.host).to.be(widget.editorWidget.node);
      });

    });

    describe('#promptNode', () => {

      it('should be the prompt node used by the cell', () => {
        let widget = new InputArea({ model });
        expect(widget.promptNode.className).to.contain('jp-InputPrompt');
      });

    });

    describe('#renderInput()', () => {

      it('should render the widget', () => {
        let widget = new InputArea({ model });
        let rendered = new Widget();
        Widget.attach(widget, document.body);
        widget.renderInput(rendered);
        expect(rendered.isAttached).to.be(true);
        widget.dispose();
      });

    });

    describe('#showEditor()', () => {

      it('should be called to show the editor', () => {
        let widget = new InputArea({ model });
        let rendered = new Widget();
        Widget.attach(widget, document.body);
        widget.renderInput(rendered);
        widget.showEditor();
        expect(rendered.isAttached).to.be(false);
        widget.dispose();
      });

    });

    describe('#setPrompt()', () => {

      it('should change the value of the input prompt', () => {
        let widget = new InputArea({ model });
        let prompt = widget.node.querySelector(`.${PROMPT_CLASS}`);
        expect(prompt.textContent).to.be.empty();
        widget.setPrompt('foo');
        expect(prompt.textContent).to.contain('foo');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        let widget = new InputArea({ model });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor()', () => {

        it('should create a new content factory', () => {
          let factory = new InputArea.ContentFactory();
          expect(factory).to.be.an(InputArea.ContentFactory);
        });

      });

      describe('#editorFactory', () => {

        it('should be the code editor factory being used', () => {
          let factory = new InputArea.ContentFactory();
          expect(factory.editorFactory).to.be(InputArea.defaultEditorFactory);
        });

      });

      describe('#createInputPrompt()', () => {

        it('should create an input prompt', () => {
          let factory = new InputArea.ContentFactory();
          expect(factory.createInputPrompt()).to.be.an(InputPrompt);
        });

      });

    });

    describe('.defaultContentFactory', () => {

      it('should be an instance of the content factory', () => {
        expect(InputArea.defaultContentFactory).to.be.an(InputArea.ContentFactory);
      });

    });

    describe('.defaultEditorFactory', () => {

      it('should be an editor factory', () => {
        let factory = InputArea.defaultEditorFactory;
        let host = document.createElement('div');
        expect(factory({ host, model }).host).to.be(host);
      });

    });

  });

  describe('InputPrompt', () => {

    describe('#constructor()', () => {

      it('should create an input prompt', () => {
        let widget = new InputPrompt();
        expect(widget).to.be.an(InputPrompt);
      });

    });

    describe('#executionCount', () => {

      it('should be the execution count for the prompt', () => {
        let widget = new InputPrompt();
        expect(widget.executionCount).to.be(null);
        widget.executionCount = '1';
        expect(widget.executionCount).to.be('1');
      });

    });

  });

});
