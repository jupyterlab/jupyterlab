// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { MessageLoop, Message } from '@lumino/messaging';

import { Panel } from '@lumino/widgets';

import { Widget } from '@lumino/widgets';

import { simulate } from 'simulate-event';

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { Completer, CompleterModel } from '@jupyterlab/completer';

import { framePromise, sleep } from '@jupyterlab/testutils';

const TEST_ITEM_CLASS = 'jp-TestItem';

const ITEM_CLASS = 'jp-Completer-item';

const ACTIVE_CLASS = 'jp-mod-active';

function createEditorWidget(): CodeEditorWrapper {
  let model = new CodeEditor.Model();
  let factory = (options: CodeEditor.IOptions) => {
    return new CodeMirrorEditor(options);
  };
  return new CodeEditorWrapper({ factory, model });
}

class CustomRenderer extends Completer.Renderer {
  createItemNode(
    item: Completer.IItem,
    typeMap: Completer.TypeMap,
    orderedTypes: string[]
  ): HTMLLIElement {
    let li = super.createItemNode(item, typeMap, orderedTypes);
    li.classList.add(TEST_ITEM_CLASS);
    return li;
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
        let widget = new Completer({ editor: null });
        expect(widget).to.be.an.instanceof(Completer);
        expect(Array.from(widget.node.classList)).to.contain('jp-Completer');
      });

      it('should accept options with a model', () => {
        let options: Completer.IOptions = {
          editor: null,
          model: new CompleterModel()
        };
        let widget = new Completer(options);
        expect(widget).to.be.an.instanceof(Completer);
        expect(widget.model).to.equal(options.model);
      });

      it('should accept options with a renderer', () => {
        let options: Completer.IOptions = {
          editor: null,
          model: new CompleterModel(),
          renderer: new CustomRenderer()
        };
        options.model!.setOptions(['foo', 'bar']);

        let widget = new Completer(options);
        expect(widget).to.be.an.instanceof(Completer);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

        let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
        expect(items).to.have.length(2);
        expect(Array.from(items[0].classList)).to.contain(TEST_ITEM_CLASS);
      });
    });

    describe('#selected', () => {
      it('should emit a signal when an item is selected', () => {
        let anchor = createEditorWidget();
        let options: Completer.IOptions = {
          editor: anchor.editor,
          model: new CompleterModel()
        };
        let value = '';
        let listener = (sender: any, selected: string) => {
          value = selected;
        };
        options.model!.setOptions(['foo', 'bar']);
        Widget.attach(anchor, document.body);

        let widget = new Completer(options);

        widget.selected.connect(listener);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(value).to.equal('');
        widget.selectActive();
        expect(value).to.equal('foo');
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

        editor.model.value.text = 'a';
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
        model.setOptions(['abc', 'abd', 'abe', 'abi']);

        let widget = new Completer({ model, editor: code.editor });
        widget.hide();
        expect(called).to.equal(false);
        widget.visibilityChanged.connect(() => {
          called = true;
        });
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

        await framePromise();
        expect(called).to.equal(true);
        widget.dispose();
        code.dispose();
        panel.dispose();
      });
    });

    describe('#model', () => {
      it('should default to null', () => {
        let widget = new Completer({ editor: null });
        expect(widget.model).to.be.null;
      });

      it('should be settable', () => {
        let widget = new Completer({ editor: null });
        expect(widget.model).to.be.null;
        widget.model = new CompleterModel();
        expect(widget.model).to.be.an.instanceof(CompleterModel);
      });

      it('should be safe to set multiple times', () => {
        let model = new CompleterModel();
        let widget = new Completer({ editor: null });
        widget.model = model;
        widget.model = model;
        expect(widget.model).to.equal(model);
      });

      it('should be safe to reset', () => {
        let model = new CompleterModel();
        let widget = new Completer({
          editor: null,
          model: new CompleterModel()
        });
        expect(widget.model).not.to.equal(model);
        widget.model = model;
        expect(widget.model).to.equal(model);
      });
    });

    describe('#editor', () => {
      it('should default to null', () => {
        let widget = new Completer({ editor: null });
        expect(widget.editor).to.be.null;
      });

      it('should be settable', () => {
        let anchor = createEditorWidget();
        let widget = new Completer({ editor: null });
        expect(widget.editor).to.be.null;
        widget.editor = anchor.editor;
        expect(widget.editor).to.be.ok;
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        let widget = new Completer({ editor: null });
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new Completer({ editor: null });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
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
        model.setOptions(['foo', 'bar'], { foo: 'instance', bar: 'function' });
        Widget.attach(anchor, document.body);

        let widget = new Completer(options);

        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isHidden).to.equal(false);
        expect(model.options).to.be.ok;
        widget.reset();
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isHidden).to.equal(true);
        expect(model.options().next()).to.be.undefined;
        widget.dispose();
        anchor.dispose();
      });
    });

    describe('#handleEvent()', () => {
      it('should handle document keydown, mousedown, and scroll events', () => {
        let anchor = createEditorWidget();
        let widget = new LogWidget({ editor: anchor.editor });
        Widget.attach(anchor, document.body);
        Widget.attach(widget, document.body);
        ['keydown', 'mousedown', 'scroll'].forEach(type => {
          simulate(document.body, type);
          expect(widget.events).to.contain(type);
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
          model.setOptions(['foo', 'bar'], {
            foo: 'instance',
            bar: 'function'
          });
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.equal(false);
          expect(model.options).to.be.ok;
          simulate(document.body, 'keydown', { keyCode: 70 }); // F
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.equal(true);
          expect(model.options().next()).to.be.undefined;
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item below and not progress past last', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          model.setOptions(['foo', 'bar', 'baz'], {
            foo: 'instance',
            bar: 'function'
          });
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);
          let target = document.createElement('div');

          anchor.node.appendChild(target);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);

          expect(Array.from(items[0].classList)).to.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.not.contain(ACTIVE_CLASS);
          simulate(target, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.not.contain(ACTIVE_CLASS);
          simulate(target, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.contain(ACTIVE_CLASS);
          simulate(target, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.contain(ACTIVE_CLASS);
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item above and not progress beyond first', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: Completer.IOptions = {
            editor: anchor.editor,
            model
          };
          model.setOptions(['foo', 'bar', 'baz'], {
            foo: 'instance',
            bar: 'function'
          });
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);

          expect(Array.from(items[0].classList)).to.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.not.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.not.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 40 }); // Down
          expect(Array.from(items[0].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(Array.from(items[0].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.not.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(Array.from(items[0].classList)).to.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.not.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(Array.from(items[0].classList)).to.contain(ACTIVE_CLASS);
          expect(Array.from(items[1].classList)).to.not.contain(ACTIVE_CLASS);
          expect(Array.from(items[2].classList)).to.not.contain(ACTIVE_CLASS);
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
          model.setOptions(['fo', 'foo', 'foo', 'fooo'], {
            foo: 'instance',
            bar: 'function'
          });
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          await framePromise();
          let marked = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`);
          expect(value).to.be.empty;
          expect(marked).to.have.length(4);
          expect(marked[0].textContent).to.equal('fo');
          expect(marked[1].textContent).to.equal('fo');
          expect(marked[2].textContent).to.equal('fo');
          expect(marked[3].textContent).to.equal('fo');
          simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab key
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).to.equal('fo');
          widget.dispose();
          anchor.dispose();
        });
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
          model.setOptions(['foo', 'bar', 'baz'], {
            foo: 'instance',
            bar: 'function'
          });
          model.query = 'b';
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let item = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`)[1];

          simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab key
          expect(model.query).to.equal('ba');
          simulate(item, 'mousedown');
          expect(value).to.equal('baz');
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
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).to.equal('');
          simulate(widget.node, 'mousedown', { button: 1 });
          expect(value).to.equal('');
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
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).to.equal('');
          simulate(widget.node, 'mousedown');
          expect(value).to.equal('');
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
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new Completer(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.equal(false);
          simulate(anchor.node, 'mousedown');
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.equal(true);
          widget.dispose();
          anchor.dispose();
        });
      });

      describe('scroll', () => {
        it.skip('should position itself according to the anchor', async () => {
          let panel = new Panel();
          let code = createEditorWidget();
          let editor = code.editor;
          let model = new CompleterModel();
          let text = '\n\n\n\n\n\na';

          code.node.style.height = '5000px';
          code.node.style.width = '400px';
          code.node.style.background = 'yellow';
          editor.model.value.text = text;

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
          editor.refresh();

          let position = code.editor.getPositionAt(text.length)!;
          let coords = code.editor.getCoordinateForPosition(position);

          editor.setCursorPosition(position);

          let request: Completer.ITextState = {
            column: position.column,
            lineHeight: editor.lineHeight,
            charWidth: editor.charWidth,
            line: position.line,
            text: 'a'
          };

          model.original = request;
          model.cursor = { start: text.length - 1, end: text.length };
          model.setOptions(['abc', 'abd', 'abe', 'abi']);

          let widget = new Completer({ model, editor: code.editor });
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          simulate(document.body, 'scroll');

          // Because the scroll handling is asynchronous, this test uses a large
          // timeout (500ms) to guarantee the scroll handling has finished.
          await sleep(500);
          let top = parseInt(window.getComputedStyle(widget.node).top, 10);
          let bottom = Math.floor(coords.bottom);
          expect(top + panel.node.scrollTop).to.equal(bottom);
          widget.dispose();
          code.dispose();
          panel.dispose();
        });
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should emit a selection if there is only one match', () => {
        let anchor = createEditorWidget();
        let model = new CompleterModel();
        let coords = { left: 0, right: 0, top: 100, bottom: 120 };
        let request: Completer.ITextState = {
          column: 0,
          lineHeight: 0,
          charWidth: 0,
          line: 0,
          coords: coords as CodeEditor.ICoordinate,
          text: 'f'
        };

        let value = '';
        let options: Completer.IOptions = {
          editor: anchor.editor,
          model
        };
        let listener = (sender: any, selected: string) => {
          value = selected;
        };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setOptions(['foo']);

        let widget = new Completer(options);
        widget.selected.connect(listener);
        Widget.attach(widget, document.body);

        expect(value).to.equal('');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(value).to.equal('foo');
        widget.dispose();
        anchor.dispose();
      });

      it('should do nothing if a model does not exist', () => {
        let widget = new LogWidget({ editor: null });
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

      it('should un-hide widget if multiple options are available', () => {
        let anchor = createEditorWidget();
        let model = new CompleterModel();
        let coords = { left: 0, right: 0, top: 100, bottom: 120 };
        let request: Completer.ITextState = {
          column: 0,
          lineHeight: 0,
          charWidth: 0,
          line: 0,
          coords: coords as CodeEditor.ICoordinate,
          text: 'f'
        };

        let options: Completer.IOptions = {
          editor: anchor.editor,
          model
        };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setOptions(['foo', 'bar', 'baz']);

        let widget = new Completer(options);
        widget.hide();
        expect(widget.isHidden).to.equal(true);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isVisible).to.equal(true);
        widget.dispose();
        anchor.dispose();
      });
    });
  });
});
