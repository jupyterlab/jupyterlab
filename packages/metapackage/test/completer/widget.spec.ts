// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  Completer,
  CompleterModel,
  CompletionHandler
} from '@jupyterlab/completer';
import { YFile } from '@jupyter/ydoc';
import { framePromise, sleep } from '@jupyterlab/testing';
import { Message, MessageLoop } from '@lumino/messaging';
import { Panel, Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';

const TEST_ITEM_CLASS = 'jp-TestItem';

const TEST_DOC_CLASS = 'jp-TestDoc';

const ITEM_CLASS = 'jp-Completer-item';

const DOC_PANEL_CLASS = 'jp-Completer-docpanel';

const ACTIVE_CLASS = 'jp-mod-active';

function createEditorWidget(): CodeEditorWrapper {
  const model = new CodeEditor.Model({ sharedModel: new YFile() });
  const factory = (options: CodeEditor.IOptions) => {
    return new CodeMirrorEditor(options);
  };
  return new CodeEditorWrapper({ factory, model });
}

class CustomRenderer extends Completer.Renderer {
  createCompletionItemNode(
    item: CompletionHandler.ICompletionItem,
    orderedTypes: string[]
  ): HTMLLIElement {
    let li = super.createCompletionItemNode!(item, orderedTypes);
    li.classList.add(TEST_ITEM_CLASS);
    return li;
  }

  createDocumentationNode(
    item: CompletionHandler.ICompletionItem
  ): HTMLElement {
    const element = super.createDocumentationNode!(item);
    element.classList.add(TEST_DOC_CLASS);
    return element;
  }
}

class LogWidget extends Completer {
  events: string[] = [];

  methods: string[] = [];

  dispose(): void {
    super.dispose();
    this.events.length = 0;
  }

  handleEvent(event: Event): void {
    this.events.push(event.type);
    super.handleEvent(event);
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}

describe('completer/widget', () => {
  describe('Completer', () => {
    describe('#constructor()', () => {
      it('should create a completer widget', () => {
        const widget = new Completer({ editor: null });
        expect(widget).toBeInstanceOf(Completer);
        expect(Array.from(widget.node.classList)).toEqual(
          expect.arrayContaining(['jp-Completer'])
        );
      });

      it('should accept options with a model', () => {
        const options: Completer.IOptions = {
          editor: null,
          model: new CompleterModel()
        };
        const widget = new Completer(options);
        expect(widget).toBeInstanceOf(Completer);
        expect(widget.model).toBe(options.model);
      });

      it('should accept options with a renderer', async () => {
        let options: Completer.IOptions = {
          editor: null,
          model: new CompleterModel(),
          renderer: new CustomRenderer()
        };
        options.model!.setCompletionItems([
          { label: 'foo', documentation: 'foo does bar' },
          { label: 'bar' }
        ]);

        let widget = new Completer(options);
        expect(widget).toBeInstanceOf(Completer);
        widget.showDocsPanel = true;
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
        expect(items).toHaveLength(2);
        expect(Array.from(items[0].classList)).toEqual(
          expect.arrayContaining([TEST_ITEM_CLASS])
        );
        // Since the document is lazy loaded, wait a tick to allow the
        // event loop remove the loading animation.
        await new Promise(r => setTimeout(r, 10));
        let panel = widget.node.querySelector(`.${DOC_PANEL_CLASS}`)!;
        expect(panel.children).toHaveLength(1);
        expect(Array.from(panel.firstElementChild!.classList)).toEqual(
          expect.arrayContaining([TEST_DOC_CLASS])
        );
      });
      it('should hide document panel', async () => {
        let options: Completer.IOptions = {
          editor: null,
          model: new CompleterModel(),
          renderer: new CustomRenderer()
        };
        options.model!.setCompletionItems([
          { label: 'foo', documentation: 'foo does bar' }
        ]);

        let widget = new Completer(options);
        widget.showDocsPanel = false;
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        let panel = widget.node.querySelector(`.${DOC_PANEL_CLASS}`)!;
        expect(panel).toBeNull();
      });

      it('should resolve item from creating widget.', () => {
        const options: Completer.IOptions = {
          editor: null,
          model: new CompleterModel()
        };
        options.model!.setCompletionItems([{ label: 'foo' }]);
        options.model!.resolveItem = jest.fn();
        const widget = new Completer(options);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(options.model!.resolveItem).toBeCalledTimes(1);
      });

      it('should resolve item from model on switching item.', () => {
        const options: Completer.IOptions = {
          editor: null,
          model: new CompleterModel()
        };
        options.model!.setCompletionItems([{ label: 'foo' }]);
        options.model!.resolveItem = jest.fn();
        const widget = new Completer(options);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        widget['_cycle']('down');
        expect(options.model!.resolveItem).toBeCalledTimes(2);
      });
    });

    describe('#selected', () => {
      it('should emit the insert text if it is present', () => {
        let anchor = createEditorWidget();
        let options: Completer.IOptions = {
          editor: anchor.editor,
          model: new CompleterModel()
        };
        let value = '';
        let listener = (sender: any, selected: string) => {
          value = selected;
        };
        options.model!.setCompletionItems([
          { label: 'foo', insertText: 'bar' },
          { label: 'baz' }
        ]);
        Widget.attach(anchor, document.body);

        let widget = new Completer(options);

        widget.selected.connect(listener);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(value).toBe('');
        widget.selectActive();
        expect(value).toBe('bar');
        widget.dispose();
        anchor.dispose();
      });

      it('should emit the label if insert text is not present', () => {
        let anchor = createEditorWidget();
        let options: Completer.IOptions = {
          editor: anchor.editor,
          model: new CompleterModel()
        };
        let value = '';
        let listener = (sender: any, selected: string) => {
          value = selected;
        };
        options.model!.setCompletionItems([{ label: 'foo' }, { label: 'baz' }]);
        Widget.attach(anchor, document.body);

        let widget = new Completer(options);

        widget.selected.connect(listener);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(value).toBe('');
        widget.selectActive();
        expect(value).toBe('foo');
        widget.dispose();
        anchor.dispose();
      });
    });

    describe('#visibilityChanged', () => {
      it('should emit a signal when completer visibility changes', async () => {
        let panel = new Panel();
        let code = createEditorWidget();
        let editor = code.editor;
        let model = new CompleterModel();
        let called = false;

        editor.model.sharedModel.setSource('a');
        panel.node.style.position = 'absolute';
        panel.node.style.top = '0px';
        panel.node.style.left = '0px';
        panel.node.style.height = '1000px';
        code.node.style.height = '900px';
        panel.addWidget(code);
        Widget.attach(panel, document.body);
        panel.node.scrollTop = 0;
        document.body.scrollTop = 0;

        let position = code.editor.getPositionAt(1)!;

        editor.setCursorPosition(position);

        let request: Completer.ITextState = {
          column: position.column,
          lineHeight: editor.lineHeight,
          charWidth: editor.charWidth,
          line: position.line,
          text: 'a'
        };

        model.original = request;
        model.cursor = { start: 0, end: 1 };
        model.setCompletionItems([
          { label: 'abc' },
          { label: 'abd' },
          { label: 'abe' },
          { label: 'abi' }
        ]);

        let widget = new Completer({ model, editor: code.editor });
        widget.hide();
        expect(called).toBe(false);
        widget.visibilityChanged.connect(() => {
          called = true;
        });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

        await framePromise();
        expect(called).toBe(true);
        widget.dispose();
        code.dispose();
        panel.dispose();
      });
    });

    describe('#model', () => {
      it('should default to null', () => {
        const widget = new Completer({ editor: null });
        expect(widget.model).toBeNull();
      });

      it('should be settable', () => {
        const widget = new Completer({ editor: null });
        expect(widget.model).toBeNull();
        widget.model = new CompleterModel();
        expect(widget.model).toBeInstanceOf(CompleterModel);
      });

      it('should be safe to set multiple times', () => {
        const model = new CompleterModel();
        const widget = new Completer({ editor: null });
        widget.model = model;
        widget.model = model;
        expect(widget.model).toBe(model);
      });

      it('should be safe to reset', () => {
        const model = new CompleterModel();
        const widget = new Completer({
          editor: null,
          model: new CompleterModel()
        });
        expect(widget.model).not.toBe(model);
        widget.model = model;
        expect(widget.model).toBe(model);
      });
    });

    describe('#editor', () => {
      it('should default to null', () => {
        const widget = new Completer({ editor: null });
        expect(widget.editor).toBeNull();
      });

      it('should be settable', () => {
        const anchor = createEditorWidget();
        const widget = new Completer({ editor: null });
        expect(widget.editor).toBeNull();
        widget.editor = anchor.editor;
        expect(widget.editor).toBeTruthy();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new Completer({ editor: null });
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new Completer({ editor: null });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#reset()', () => {
      it('should reset the completer widget', () => {
        let anchor = createEditorWidget();
        let model = new CompleterModel();
        let options: Completer.IOptions = {
          editor: anchor.editor,
          model
        };
        model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
        Widget.attach(anchor, document.body);

        let widget = new Completer(options);

        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isHidden).toBe(false);
        expect(model.completionItems()).toEqual([
          { label: 'foo' },
          { label: 'bar' }
        ]);
        widget.reset();
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isHidden).toBe(true);
        expect(model.completionItems()).toEqual([]);
        widget.dispose();
        anchor.dispose();
      });
    });

    describe('#handleEvent()', () => {
      it('should handle document keydown, mousedown, and scroll events', () => {
        const anchor = createEditorWidget();
        const widget = new LogWidget({ editor: anchor.editor });
        Widget.attach(anchor, document.body);
        Widget.attach(widget, document.body);
        ['keydown', 'mousedown', 'scroll'].forEach(type => {
          simulate(document.body, type);
          expect(widget.events).toEqual(expect.arrayContaining([type]));
        });
        widget.dispose();
        anchor.dispose();
      });

      describe('keydown', () => {
        it('should reset if keydown is outside anchor', () => {
          let model = new CompleterModel();
          let anchor = createEditorWidget();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).toBe(false);
          expect(model.completionItems()).toEqual([
            { label: 'foo' },
            { label: 'bar' }
          ]);
          simulate(document.body, 'keydown', { keyCode: 70 }); // F
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).toBe(true);
          expect(model.completionItems()).toEqual([]);
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item below and wrap to top past last (arrow keys)', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          model.setCompletionItems([
            { label: 'foo' },
            { label: 'bar' },
            { label: 'baz' }
          ]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);
          let target = document.createElement('div');

          anchor.node.appendChild(target);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(target, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(target, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          simulate(target, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item below and wrap to top past last (tab)', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          model.setCompletionItems([
            { label: 'foo' },
            { label: 'bar' },
            { label: 'baz' }
          ]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);
          let target = document.createElement('div');

          anchor.node.appendChild(target);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(target, 'keydown', { keyCode: 9 }); // Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(target, 'keydown', { keyCode: 9 }); // Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          simulate(target, 'keydown', { keyCode: 9 }); // Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item above and wrap to top past first (arrow keys)', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          model.setCompletionItems([
            { label: 'foo' },
            { label: 'bar' },
            { label: 'baz' }
          ]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);

          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item above and wrap to top past first (tab)', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          model.setCompletionItems([
            { label: 'foo' },
            { label: 'bar' },
            { label: 'baz' }
          ]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);

          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 9, shiftKey: true }); // Shift + Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 9, shiftKey: true }); // Shift + Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          simulate(anchor.node, 'keydown', { keyCode: 9, shiftKey: true }); // Shift + Tab
          expect(Array.from(items[0].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[1].classList)).toEqual(
            expect.not.arrayContaining([ACTIVE_CLASS])
          );
          expect(Array.from(items[2].classList)).toEqual(
            expect.arrayContaining([ACTIVE_CLASS])
          );
          widget.dispose();
          anchor.dispose();
        });

        it('should mark common subset on start and complete that subset on tab', async () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setCompletionItems([
            { label: 'fo' },
            { label: 'foo' },
            { label: 'foo' },
            { label: 'fooo' }
          ]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          await framePromise();
          let marked = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`);
          expect(value).toHaveLength(0);
          expect(marked).toHaveLength(4);
          expect(marked[0].textContent).toBe('fo');
          expect(marked[1].textContent).toBe('fo');
          expect(marked[2].textContent).toBe('fo');
          expect(marked[3].textContent).toBe('fo');
          simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab key
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).toBe('fo');
          widget.dispose();
          anchor.dispose();
        });
      });

      it('should insert single completion item on tab', async () => {
        const anchor = createEditorWidget();
        const model = new CompleterModel();
        const options: Completer.IOptions = {
          editor: anchor.editor,
          model
        };
        let value = '';
        const listener = (sender: any, selected: string) => {
          value = selected;
        };
        model.setCompletionItems([{ label: 'foo' }]);
        Widget.attach(anchor, document.body);

        const widget = new Completer(options);

        widget.selected.connect(listener);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab key
        expect(value).toBe('foo');
        widget.dispose();
        anchor.dispose();
      });

      it('should insert single completion item insertText on tab', async () => {
        const anchor = createEditorWidget();
        const model = new CompleterModel();
        const options: Completer.IOptions = {
          editor: anchor.editor,
          model
        };
        let value = '';
        const listener = (sender: any, selected: string) => {
          value = selected;
        };
        model.setCompletionItems([{ label: 'foo', insertText: 'bar' }]);
        Widget.attach(anchor, document.body);

        const widget = new Completer(options);

        widget.selected.connect(listener);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab key
        expect(value).toBe('bar');
        widget.dispose();
        anchor.dispose();
      });

      describe('mousedown', () => {
        it('should trigger a selected signal on mouse down', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setCompletionItems([
            { label: 'foo' },
            { label: 'bar' },
            { label: 'baz' }
          ]);
          model.query = 'b';
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let item = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`)[1];

          simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab key
          expect(model.query).toBe('ba');
          simulate(item, 'mousedown');
          expect(value).toBe('baz');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore nonstandard mouse clicks (e.g., right click)', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).toBe('');
          simulate(widget.node, 'mousedown', { button: 1 });
          expect(value).toBe('');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore a mouse down that misses an item', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).toBe('');
          simulate(widget.node, 'mousedown');
          expect(value).toBe('');
          widget.dispose();
          anchor.dispose();
        });

        it('should hide widget if mouse down misses it', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          let listener = (sender: any, selected: string) => {
            // no op
          };
          model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).toBe(false);
          simulate(anchor.node, 'mousedown');
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).toBe(true);
          widget.dispose();
          anchor.dispose();
        });
      });

      describe('scroll', () => {
        it.skip('should position itself according to the anchor', async () => {
          const panel = new Panel();
          const code = createEditorWidget();
          const editor = code.editor;
          const model = new CompleterModel();
          const text = '\n\n\n\n\n\na';

          code.node.style.height = '5000px';
          code.node.style.width = '400px';
          code.node.style.background = 'yellow';
          editor.model.sharedModel.setSource(text);

          panel.node.style.background = 'red';
          panel.node.style.height = '2000px';
          panel.node.style.width = '500px';
          panel.node.style.maxHeight = '500px';
          panel.node.style.overflow = 'auto';
          panel.node.style.position = 'absolute';
          panel.node.style.top = '0px';
          panel.node.style.left = '0px';
          panel.node.scrollTop = 10;

          panel.addWidget(code);
          Widget.attach(panel, document.body);

          const position = code.editor.getPositionAt(text.length)!;
          const coords = code.editor.getCoordinateForPosition(position);

          editor.setCursorPosition(position);

          const request: Completer.ITextState = {
            column: position.column,
            lineHeight: editor.lineHeight,
            charWidth: editor.charWidth,
            line: position.line,
            text: 'a'
          };

          model.original = request;
          model.cursor = { start: text.length - 1, end: text.length };
          model.setCompletionItems([
            { label: 'abc' },
            { label: 'abd' },
            { label: 'abe' },
            { label: 'abi' }
          ]);

          const widget = new Completer({ model, editor: code.editor });
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          simulate(document.body, 'scroll');

          // Because the scroll handling is asynchronous, this test uses a large
          // timeout (500ms) to guarantee the scroll handling has finished.
          await sleep(500);
          const top = parseInt(window.getComputedStyle(widget.node).top, 10);
          const bottom = Math.floor(coords.bottom);
          expect(top + panel.node.scrollTop).toBe(bottom);
          widget.dispose();
          code.dispose();
          panel.dispose();
        });
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should do nothing if a model does not exist', () => {
        const widget = new LogWidget({ editor: null });
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
      });

      it('should un-hide widget if multiple items are available', () => {
        let anchor = createEditorWidget();
        let model = new CompleterModel();
        let coords = { left: 0, right: 0, top: 100, bottom: 120 };
        let request: Completer.ITextState = {
          column: 0,
          lineHeight: 0,
          charWidth: 0,
          line: 0,
          coords,
          text: 'f'
        };

        let options: Completer.IOptions = {
          editor: anchor.editor,
          model
        };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setCompletionItems([
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' }
        ]);

        let widget = new Completer(options);
        widget.hide();
        expect(widget.isHidden).toBe(true);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isVisible).toBe(true);
        widget.dispose();
        anchor.dispose();
      });
    });
  });
});
