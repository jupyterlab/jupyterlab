// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MessageLoop, Message
} from '@phosphor/messaging';

import {
  Panel
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  CodeEditor, CodeEditorWidget
} from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import {
  CompleterWidget, CompleterModel
} from '@jupyterlab/completer';


const TEST_ITEM_CLASS = 'jp-TestItem';

const ITEM_CLASS = 'jp-Completer-item';

const ACTIVE_CLASS = 'jp-mod-active';


function createEditorWidget(): CodeEditorWidget {
  let model = new CodeEditor.Model();
  let factory = (options: CodeEditor.IOptions) => {
    return new CodeMirrorEditor(options);
  };
  return new CodeEditorWidget({ factory, model });
}


class CustomRenderer extends CompleterWidget.Renderer {
  createItemNode(item: CompleterWidget.IItem): HTMLLIElement {
    let li = super.createItemNode(item);
    li.classList.add(TEST_ITEM_CLASS);
    return li;
  }
}


class LogWidget extends CompleterWidget {
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

  describe('CompleterWidget', () => {

    describe('#constructor()', () => {

      it('should create a completer widget', () => {
        let widget = new CompleterWidget({ editor: null });
        expect(widget).to.be.a(CompleterWidget);
        expect(widget.node.classList).to.contain('jp-Completer');
      });

      it('should accept options with a model', () => {
        let options: CompleterWidget.IOptions = {
          editor: null,
          model: new CompleterModel()
        };
        let widget = new CompleterWidget(options);
        expect(widget).to.be.a(CompleterWidget);
        expect(widget.model).to.equal(options.model);
      });

      it('should accept options with a renderer', () => {
        let options: CompleterWidget.IOptions = {
          editor: null,
          model: new CompleterModel(),
          renderer: new CustomRenderer()
        };
        options.model.setOptions(['foo', 'bar']);

        let widget = new CompleterWidget(options);
        expect(widget).to.be.a(CompleterWidget);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

        let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
        expect(items).to.have.length(2);
        expect(items[0].classList).to.contain(TEST_ITEM_CLASS);
      });

    });

    describe('#selected', () => {

      it('should emit a signal when an item is selected', () => {
        let anchor = createEditorWidget();
        let options: CompleterWidget.IOptions = {
          editor: anchor.editor,
          model: new CompleterModel()
        };
        let value = '';
        let listener = (sender: any, selected: string) => { value = selected; };
        options.model.setOptions(['foo', 'bar']);
        Widget.attach(anchor, document.body);

        let widget = new CompleterWidget(options);

        widget.selected.connect(listener);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(value).to.be('');
        simulate(anchor.node, 'keydown', { keyCode: 9 }); // Tab
        expect(value).to.be('foo');
        widget.dispose();
        anchor.dispose();
      });

    });

    describe('#visibilityChanged', () => {

      it('should emit a signal when completer visibility changes', done => {
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

          let position = code.editor.getPositionAt(1);

          editor.setCursorPosition(position);

          let request: CompleterWidget.ITextState = {
            column: position.column,
            lineHeight: editor.lineHeight,
            charWidth: editor.charWidth,
            line: position.line,
            text: 'a'
          };

          model.original = request;
          model.cursor = { start: 0, end: 1 };
          model.setOptions(['abc', 'abd', 'abe', 'abi']);

          let widget = new CompleterWidget({ model, editor: code.editor });
          widget.hide();
          expect(called).to.be(false);
          widget.visibilityChanged.connect(() => { called = true; });
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          requestAnimationFrame(() => {
            expect(called).to.be(true);
            widget.dispose();
            code.dispose();
            panel.dispose();
            done();
          });
      });

    });

    describe('#model', () => {

      it('should default to null', () => {
        let widget = new CompleterWidget({ editor: null });
        expect(widget.model).to.be(null);
      });

      it('should be settable', () => {
        let widget = new CompleterWidget({ editor: null });
        expect(widget.model).to.be(null);
        widget.model = new CompleterModel();
        expect(widget.model).to.be.a(CompleterModel);
      });

      it('should be safe to set multiple times', () => {
        let model = new CompleterModel();
        let widget = new CompleterWidget({ editor: null });
        widget.model = model;
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should be safe to reset', () => {
        let model = new CompleterModel();
        let widget = new CompleterWidget({
          editor: null,
          model: new CompleterModel()
        });
        expect(widget.model).not.to.be(model);
        widget.model = model;
        expect(widget.model).to.be(model);
      });

    });

    describe('#editor', () => {

      it('should default to null', () => {
        let widget = new CompleterWidget({ editor: null });
        expect(widget.editor).to.be(null);
      });

      it('should be settable', () => {
        let anchor = createEditorWidget();
        let widget = new CompleterWidget({ editor: null });
        expect(widget.editor).to.be(null);
        widget.editor = anchor.editor;
        expect(widget.editor).to.be.ok();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CompleterWidget({ editor: null });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CompleterWidget({ editor: null });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#reset()', () => {

      it('should reset the completer widget', () => {
        let anchor = createEditorWidget();
        let model = new CompleterModel();
        let options: CompleterWidget.IOptions = {
          editor: anchor.editor, model
        };
        model.setOptions(['foo', 'bar']);
        Widget.attach(anchor, document.body);

        let widget = new CompleterWidget(options);

        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isHidden).to.be(false);
        expect(model.options).to.be.ok();
        widget.reset();
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isHidden).to.be(true);
        expect(model.options().next()).to.be(void 0);
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

      context('keydown', () => {

        it('should reset if keydown is outside anchor', () => {
          let model = new CompleterModel();
          let anchor = createEditorWidget();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.be(false);
          expect(model.options).to.be.ok();
          simulate(document.body, 'keydown', { keyCode: 70 }); // F
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.be(true);
          expect(model.options().next()).to.be(void 0);
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item below and cycle back on down', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          model.setOptions(['foo', 'bar', 'baz']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);
          let target = document.createElement('div');

          anchor.node.appendChild(target);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);

          expect(items[0].classList).to.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.not.contain(ACTIVE_CLASS);
          simulate(target, 'keydown', { keyCode: 40 });  // Down
          expect(items[0].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.not.contain(ACTIVE_CLASS);
          simulate(target, 'keydown', { keyCode: 40 });  // Down
          expect(items[0].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.contain(ACTIVE_CLASS);
          simulate(target, 'keydown', { keyCode: 40 });  // Down
          expect(items[0].classList).to.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.not.contain(ACTIVE_CLASS);
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item above and cycle back on up', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          model.setOptions(['foo', 'bar', 'baz']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);

          expect(items[0].classList).to.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.not.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(items[0].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(items[0].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.not.contain(ACTIVE_CLASS);
          simulate(anchor.node, 'keydown', { keyCode: 38 }); // Up
          expect(items[0].classList).to.contain(ACTIVE_CLASS);
          expect(items[1].classList).to.not.contain(ACTIVE_CLASS);
          expect(items[2].classList).to.not.contain(ACTIVE_CLASS);
          widget.dispose();
          anchor.dispose();
        });

        it('should mark common subset on start and select on tab', (done) => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['fo', 'foo', 'foo', 'fooo']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          requestAnimationFrame(() => {
            let marked = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`);
            expect(value).to.be('fo');
            expect(marked).to.have.length(4);
            expect(marked[0].textContent).to.be('fo');
            expect(marked[1].textContent).to.be('fo');
            expect(marked[2].textContent).to.be('fo');
            expect(marked[3].textContent).to.be('fo');
            simulate(anchor.node, 'keydown', { keyCode: 9 });  // Tab key
            MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
            expect(value).to.be('fo');
            widget.dispose();
            anchor.dispose();
            done();
          });
        });

      });

      context('mousedown', () => {

        it('should trigger a selected signal on mouse down', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar', 'baz']);
          model.query = 'b';
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);

          let item = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`)[1];

          expect(value).to.be('ba');
          simulate(item, 'mousedown');
          expect(value).to.be('baz');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore nonstandard mouse clicks (e.g., right click)', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).to.be('');
          simulate(widget.node, 'mousedown', { button: 1 });
          expect(value).to.be('');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore a mouse down that misses an item', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(value).to.be('');
          simulate(widget.node, 'mousedown');
          expect(value).to.be('');
          widget.dispose();
          anchor.dispose();
        });

        it('should hide widget if mouse down misses it', () => {
          let anchor = createEditorWidget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = {
            editor: anchor.editor, model
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.be(false);
          simulate(anchor.node, 'mousedown');
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          expect(widget.isHidden).to.be(true);
          widget.dispose();
          anchor.dispose();
        });

      });

      context('scroll', () => {

        it('should position itself according to the anchor', done => {
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

          let position = code.editor.getPositionAt(text.length);
          let coords = code.editor.getCoordinateForPosition(position);

          editor.setCursorPosition(position);

          let request: CompleterWidget.ITextState = {
            column: position.column,
            lineHeight: editor.lineHeight,
            charWidth: editor.charWidth,
            line: position.line,
            text: 'a'
          };

          model.original = request;
          model.cursor = { start: text.length - 1, end: text.length };
          model.setOptions(['abc', 'abd', 'abe', 'abi']);

          let widget = new CompleterWidget({ model, editor: code.editor });
          Widget.attach(widget, document.body);
          MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
          simulate(document.body, 'scroll');

          requestAnimationFrame(() => {
            let top = parseInt(window.getComputedStyle(widget.node).top, 10);
            let bottom = Math.floor(coords.bottom);
            expect(top + panel.node.scrollTop).to.be(bottom);
            widget.dispose();
            code.dispose();
            panel.dispose();
            done();
          });
        });

      });

    });

    describe('#onUpdateRequest()', () => {

      it('should emit a selection if there is only one match', () => {
        let anchor = createEditorWidget();
        let model = new CompleterModel();
        let coords = { left: 0, right: 0, top: 100, bottom: 120 };
        let request: CompleterWidget.ITextState = {
            column: 0,
            lineHeight: 0,
            charWidth: 0,
            line: 0,
            coords: coords as CodeEditor.ICoordinate,
            text: 'f'
          };

        let value = '';
        let options: CompleterWidget.IOptions = {
          editor: anchor.editor, model
        };
        let listener = (sender: any, selected: string) => { value = selected; };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setOptions(['foo']);

        let widget = new CompleterWidget(options);
        widget.selected.connect(listener);
        Widget.attach(widget, document.body);

        expect(value).to.be('');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(value).to.be('foo');
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
        let request: CompleterWidget.ITextState = {
          column: 0,
          lineHeight: 0,
          charWidth: 0,
          line: 0,
          coords: coords as CodeEditor.ICoordinate,
          text: 'f'
        };

        let options: CompleterWidget.IOptions = {
          editor: anchor.editor, model
        };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setOptions(['foo', 'bar', 'baz']);

        let widget = new CompleterWidget(options);
        widget.hide();
        expect(widget.isHidden).to.be(true);
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.isVisible).to.be(true);
        widget.dispose();
        anchor.dispose();
      });

    });

  });

});
