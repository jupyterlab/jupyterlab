// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';
import {
  Completer,
  CompleterModel,
  CompletionHandler
} from '@jupyterlab/completer';
import {
  createEditorWidget,
  getBoundingClientRectMock
} from '@jupyterlab/completer/lib/testutils';
import { framePromise, simulate, sleep } from '@jupyterlab/testing';
import { Message, MessageLoop } from '@lumino/messaging';
import { Panel, Widget } from '@lumino/widgets';

const TEST_ITEM_CLASS = 'jp-TestItem';

const TEST_DOC_CLASS = 'jp-TestDoc';

const ITEM_CLASS = 'jp-Completer-item';

const DOC_PANEL_CLASS = 'jp-Completer-docpanel';

const ACTIVE_CLASS = 'jp-mod-active';

class CustomRenderer extends Completer.Renderer {
  createCompletionItemNode(
    item: CompletionHandler.ICompletionItem,
    orderedTypes: string[]
  ): HTMLLIElement {
    let li = super.createCompletionItemNode(item, orderedTypes);
    li.classList.add(TEST_ITEM_CLASS);
    return li;
  }

  createDocumentationNode(
    item: CompletionHandler.ICompletionItem
  ): HTMLElement {
    const element = super.createDocumentationNode(item);
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

  protected onModelQueryChanged(
    model: Completer.IModel,
    queryChange: Completer.IQueryChange
  ): void {
    super.onModelQueryChanged(model, queryChange);
    this.methods.push(`onModelQueryChanged:${queryChange.origin}`);
  }

  public get sizeCache() {
    return super.sizeCache;
  }
}

describe('completer/widget', () => {
  describe('Completer', () => {
    beforeAll(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        .jp-Completer-list {
          overflow-y: scroll;
          overflow-x: auto;
          max-height: 300px;
          min-height: 20px;
          width: 100%;
        }
        .jp-Completer-docpanel {
          width: 400px;
          overflow: scroll;
        }
        .jp-Completer-item {
          box-sizing: border-box;
          height: 20px;
          min-width: 150px;
          display: grid;
          grid-template-columns: min-content 1fr min-content;
        }
        `;
      document.head.appendChild(style);
    });

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
        expect(options.model!.resolveItem).toHaveBeenCalledTimes(1);
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
        expect(options.model!.resolveItem).toHaveBeenCalledTimes(2);
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
          { label: 'bar label', insertText: 'bar' },
          { label: 'foo label' }
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
      it('should handle document keydown, pointerdown, and scroll events', () => {
        const anchor = createEditorWidget();
        const widget = new LogWidget({ editor: anchor.editor });
        Widget.attach(anchor, document.body);
        Widget.attach(widget, document.body);
        ['keydown', 'pointerdown', 'scroll'].forEach(type => {
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

      describe('pointerdown', () => {
        it('should trigger a selected signal on pointer down', () => {
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
          simulate(item, 'pointerdown');
          expect(value).toBe('baz');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore nonstandard pointer clicks (e.g., right click)', () => {
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
          simulate(widget.node, 'pointerdown', { button: 1 });
          expect(value).toBe('');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore a pointer down that misses an item', () => {
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
          simulate(widget.node, 'pointerdown');
          expect(value).toBe('');
          widget.dispose();
          anchor.dispose();
        });

        it('should hide widget if pointer down misses it', () => {
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
          simulate(anchor.node, 'pointerdown');
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
          const coords = code.editor.getCoordinateForPosition(position)!;

          editor.setCursorPosition(position);

          const request: Completer.ITextState = {
            column: position.column,
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
        let request: Completer.ITextState = {
          column: 0,
          line: 0,
          text: 'f'
        };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setCompletionItems([
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' }
        ]);

        let widget = new Completer({
          editor: anchor.editor,
          model
        });
        widget.hide();
        expect(widget.isHidden).toBe(true);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isVisible).toBe(true);
        widget.dispose();
        anchor.dispose();
      });

      it('should pre-compute and cache dimensions when items are many', () => {
        window.HTMLElement.prototype.getBoundingClientRect =
          getBoundingClientRectMock;
        let anchor = createEditorWidget();
        let model = new CompleterModel();

        Widget.attach(anchor, document.body);
        model.setCompletionItems(
          Array.from({ length: 20 }, (_, i) => {
            return { label: `candidate ${i}` };
          })
        );

        let widget = new LogWidget({
          editor: anchor.editor,
          model
        });
        Widget.attach(widget, document.body);
        expect(widget.sizeCache).toBe(undefined);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.sizeCache).toEqual({
          width: 150,
          height: 300
        });
        widget.dispose();
        expect(widget.sizeCache).toBe(undefined);
        anchor.dispose();
      });

      it('should compute height based on number of items', () => {
        window.HTMLElement.prototype.getBoundingClientRect =
          getBoundingClientRectMock;
        let anchor = createEditorWidget();
        let model = new CompleterModel();

        Widget.attach(anchor, document.body);
        model.setCompletionItems(
          Array.from({ length: 3 }, (_, i) => {
            return { label: `candidate ${i}` };
          })
        );

        let widget = new LogWidget({
          editor: anchor.editor,
          model
        });
        Widget.attach(widget, document.body);
        expect(widget.sizeCache).toBe(undefined);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.sizeCache).toEqual({
          width: 150,
          height: 3 * 20
        });
        widget.dispose();
        expect(widget.sizeCache).toBe(undefined);
        anchor.dispose();
      });

      it('should account for documentation panel width if shown', async () => {
        window.HTMLElement.prototype.getBoundingClientRect =
          getBoundingClientRectMock;
        let anchor = createEditorWidget();
        let model = new CompleterModel();

        Widget.attach(anchor, document.body);
        model.setCompletionItems(
          Array.from({ length: 3 }, (_, i) => {
            return { label: `candidate ${i}`, documentation: 'text' };
          })
        );

        let widget = new LogWidget({
          editor: anchor.editor,
          model
        });
        widget.showDocsPanel = true;
        Widget.attach(widget, document.body);
        expect(widget.sizeCache).toBe(undefined);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        await framePromise();
        expect(widget.sizeCache).toEqual({
          width: 550, // 150 (items) + 400 (documentation panel)
          height: 300
        });
        widget.showDocsPanel = false;
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        await framePromise();
        expect(widget.sizeCache).toEqual({
          width: 150,
          height: 60 // 3* 20
        });
        widget.dispose();
        expect(widget.sizeCache).toBe(undefined);
        anchor.dispose();
      });

      it('should show/hide the documentation panel depending on documentation presence', async () => {
        window.HTMLElement.prototype.getBoundingClientRect =
          getBoundingClientRectMock;
        let anchor = createEditorWidget();
        let model = new CompleterModel();
        Widget.attach(anchor, document.body);

        let widget = new LogWidget({
          editor: anchor.editor,
          model
        });
        widget.showDocsPanel = true;
        Widget.attach(widget, document.body);

        const expectedSizeNoDocs = {
          width: 150, // (no documentation panel width here)
          height: 20
        };
        const expectedSizeDocs = {
          width: 550, // 150 (items) + 400 (documentation panel)
          height: 300 // (min documentation panel height)
        };

        // no documentation
        model.setCompletionItems([{ label: 'test' }]);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        await framePromise();
        expect(widget.sizeCache).toEqual(expectedSizeNoDocs);
        let panel = widget.node.querySelector(
          `.${DOC_PANEL_CLASS}`
        ) as HTMLElement;
        expect(panel.style.display).toBe('none');

        // documentation
        model.setCompletionItems([
          { label: 'test', documentation: 'test doc' }
        ]);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        await framePromise();
        expect(widget.sizeCache).toEqual(expectedSizeDocs);
        panel = widget.node.querySelector(`.${DOC_PANEL_CLASS}`) as HTMLElement;
        expect(panel.style.display).toBe('');

        // no documentation again
        model.setCompletionItems([{ label: 'test' }]);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        await framePromise();
        expect(widget.sizeCache).toEqual(expectedSizeNoDocs);
        panel = widget.node.querySelector(`.${DOC_PANEL_CLASS}`) as HTMLElement;
        expect(panel.style.display).toBe('none');
      });

      it('should render completions lazily in chunks', async () => {
        window.HTMLElement.prototype.getBoundingClientRect =
          getBoundingClientRectMock;
        let anchor = createEditorWidget();
        let model = new CompleterModel();

        Widget.attach(anchor, document.body);
        model.setCompletionItems(
          Array.from({ length: 30 }, (_, i) => {
            return { label: `candidate ${i}` };
          })
        );

        let widget = new Completer({
          editor: anchor.editor,
          model
        });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

        // First "page":
        //  - 300px/20px = 15 items at each "page",
        //  - we add one item in case if height heuristic is inaccurate.
        let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
        expect(items).toHaveLength(15 + 1);

        // Second and consecutive pages will be rendered in chunks of size
        // depending on performance, but not smaller than 5 at a time. This
        // means we should get 30 items in no more than 3 frames.
        let previousCount = 15 + 1;
        for (let i = 0; i < 3; i++) {
          await framePromise();
          items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
          expect(items.length).toBeGreaterThanOrEqual(
            Math.min(previousCount + 5, 30)
          );
          previousCount = items.length;
        }
        expect(items).toHaveLength(30);
      });
    });

    describe('#onModelQueryChanged()', () => {
      let position: CodeEditor.IPosition;
      let widget: LogWidget;
      let model: CompleterModel;
      let wrapper: CodeEditorWrapper;
      const expectedSize = { width: 150, height: 300 };

      beforeEach(() => {
        window.HTMLElement.prototype.getBoundingClientRect =
          getBoundingClientRectMock;
        wrapper = createEditorWidget();
        model = new CompleterModel();
        const editor = wrapper.editor;

        editor.model.sharedModel.setSource('c');
        position = editor.getPositionAt(1)!;

        editor.setCursorPosition(position);

        const original: Completer.ITextState = {
          ...position,
          text: 'c'
        };
        Widget.attach(wrapper, document.body);

        model.original = original;
        model.cursor = { start: 0, end: 1 };

        model.setCompletionItems([
          ...Array.from({ length: 20 }, (_, i) => {
            return { label: `candidate ${i}` };
          }),
          ...Array.from({ length: 20 }, (_, i) => {
            return { label: `candx ${i}` };
          })
        ]);

        widget = new LogWidget({ editor, model });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
      });

      afterEach(() => {
        widget.dispose();
        wrapper.dispose();
      });

      it('should not invalidate size cache if query change keeps situation the same', () => {
        expect(widget.sizeCache).toEqual(expectedSize);
        // Filtering which does not change the matching items.
        const current: Completer.ITextState = {
          ...position,
          text: 'cand'
        };
        expect(widget.methods).not.toContain(
          'onModelQueryChanged:editorUpdate'
        );
        model.handleTextChange(current);
        expect(widget.methods).toContain('onModelQueryChanged:editorUpdate');
        expect(widget.sizeCache).toEqual(expectedSize);
      });

      it('should invalidate size cache if query change leads to change in number of items', () => {
        expect(widget.sizeCache).toEqual(expectedSize);
        // Filtering which reduces the matching items to single `candidate 3`
        const current: Completer.ITextState = {
          ...position,
          text: 'c3'
        };
        expect(widget.methods).not.toContain(
          'onModelQueryChanged:editorUpdate'
        );
        model.handleTextChange(current);
        expect(widget.methods).toContain('onModelQueryChanged:editorUpdate');
        expect(widget.sizeCache).toEqual(undefined);
      });

      it('should invalidate size cache if query change leads to change in the widest item', () => {
        expect(widget.sizeCache).toEqual(expectedSize);
        // First filter to 20 items with `candidate` prefix, this should invalidate
        let current: Completer.ITextState = {
          ...position,
          text: 'candi'
        };

        model.handleTextChange(current);
        expect(widget.sizeCache).toEqual(undefined);

        // Establish new cache
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.sizeCache).toEqual(expectedSize);

        // Then filter to 20 items with `candx` prefix
        current = {
          ...position,
          text: 'candx'
        };
        model.handleTextChange(current);
        expect(widget.sizeCache).toEqual(undefined);
      });

      it('should update the documentation panel of selected item', async () => {
        let args = '';
        const spy = jest
          .spyOn(widget as any, '_updateDocPanel')
          .mockImplementation(async (item: any) => {
            if (item) {
              args = (await item).label;
            }
          });
        widget.showDocsPanel = true;
        const current: Completer.ITextState = {
          ...position,
          text: 'c13'
        };
        model.handleTextChange(current);

        await new Promise(process.nextTick);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(args).toEqual('candx 13');

        // Cycle to the second item
        widget['_cycle']('down');
        await new Promise(process.nextTick);
        expect(spy).toHaveBeenCalledTimes(2);
        expect(args).toEqual('candidate 13');
        spy.mockRestore();
      });
    });
  });
  describe('Completer.Renderer', () => {
    describe('#itemWidthHeuristic()', () => {
      let renderer: Completer.Renderer;
      beforeEach(() => {
        renderer = new Completer.Renderer();
      });
      it('returns a sum of characters in label and type info', () => {
        let width = renderer.itemWidthHeuristic({
          label: 'test',
          type: 'variable'
        });
        expect(width).toBe(12);
      });
      it('disregards <mark> markup', () => {
        let width = renderer.itemWidthHeuristic({ label: '<mark>test</mark>' });
        expect(width).toBe(4);
      });
    });
  });
});
