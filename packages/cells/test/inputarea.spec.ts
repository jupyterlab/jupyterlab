// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { Widget } from '@lumino/widgets';

import { CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { InputArea, InputPrompt, CodeCellModel } from '@jupyterlab/cells';

const PROMPT_CLASS = 'jp-InputArea-prompt';

describe('@jupyterlab/cells', () => {
  const model = new CodeCellModel({});

  describe('InputArea', () => {
    describe('#constructor()', () => {
      it('should create an input area widget', () => {
        const widget = new InputArea({ model });
        expect(widget).toBeInstanceOf(InputArea);
      });
    });

    describe('#model', () => {
      it('should be the model used by the input area', () => {
        const widget = new InputArea({ model });
        expect(widget.model).toBe(model);
      });
    });

    describe('#contentFactory', () => {
      it('should be the content factory used by the input area', () => {
        const widget = new InputArea({ model });
        expect(widget.contentFactory).toBe(InputArea.defaultContentFactory);
      });
    });

    describe('#editorWidget', () => {
      it('should be the editor widget used by the input area', () => {
        const widget = new InputArea({ model });
        expect(widget.editorWidget).toBeInstanceOf(CodeEditorWrapper);
      });
    });

    describe('#editor', () => {
      it('should be the code editor used by the cell', () => {
        const widget = new InputArea({ model });
        expect(widget.editor.host).toBe(widget.editorWidget.node);
      });
    });

    describe('#promptNode', () => {
      it('should be the prompt node used by the cell', () => {
        const widget = new InputArea({ model });
        expect(widget.promptNode.className).toContain('jp-InputPrompt');
      });
    });

    describe('#renderInput()', () => {
      it('should render the widget', () => {
        const widget = new InputArea({ model });
        const rendered = new Widget();
        Widget.attach(widget, document.body);
        widget.renderInput(rendered);
        expect(rendered.isAttached).toBe(true);
        widget.dispose();
      });
    });

    describe('#showEditor()', () => {
      it('should be called to show the editor', () => {
        const widget = new InputArea({ model });
        const rendered = new Widget();
        Widget.attach(widget, document.body);
        widget.renderInput(rendered);
        widget.showEditor();
        expect(rendered.isAttached).toBe(false);
        widget.dispose();
      });
    });

    describe('#setPrompt()', () => {
      it('should change the value of the input prompt', () => {
        const widget = new InputArea({ model });
        const prompt = widget.node.querySelector(`.${PROMPT_CLASS}`)!;
        expect(prompt.textContent).toHaveLength(0);
        widget.setPrompt('foo');
        expect(prompt.textContent).toContain('foo');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the widget', () => {
        const widget = new InputArea({ model });
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor()', () => {
        it('should create a new content factory', () => {
          const factory = new InputArea.ContentFactory();
          expect(factory).toBeInstanceOf(InputArea.ContentFactory);
        });
      });

      describe('#editorFactory', () => {
        it('should be the code editor factory being used', () => {
          const factory = new InputArea.ContentFactory();
          expect(factory.editorFactory).toBe(InputArea.defaultEditorFactory);
        });
      });

      describe('#createInputPrompt()', () => {
        it('should create an input prompt', () => {
          const factory = new InputArea.ContentFactory();
          expect(factory.createInputPrompt()).toBeInstanceOf(InputPrompt);
        });
      });
    });

    describe('.defaultContentFactory', () => {
      it('should be an instance of the content factory', () => {
        expect(InputArea.defaultContentFactory).toBeInstanceOf(
          InputArea.ContentFactory
        );
      });
    });

    describe('.defaultEditorFactory', () => {
      it('should be an editor factory', () => {
        const factory = InputArea.defaultEditorFactory;
        const host = document.createElement('div');
        expect(factory({ host, model }).host).toBe(host);
      });
    });
  });

  describe('InputPrompt', () => {
    describe('#constructor()', () => {
      it('should create an input prompt', () => {
        const widget = new InputPrompt();
        expect(widget).toBeInstanceOf(InputPrompt);
      });
    });

    describe('#executionCount', () => {
      it('should be the execution count for the prompt', () => {
        const widget = new InputPrompt();
        expect(widget.executionCount).toBeNull();
        widget.executionCount = '1';
        expect(widget.executionCount).toBe('1');
      });
    });
  });
});
