// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  sendMessage, Message
} from 'phosphor/lib/core/messaging';

import {
  Widget, WidgetMessage
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
  ICompletionRequest
} from '../../../../lib/notebook/cells/view';

import {
  ICoords
} from '../../../../lib/editorwidget/view';


import {
  CompletionWidget, CompletionModel, ICompletionItem
} from '../../../../lib/notebook/completion';


const TEST_ITEM_CLASS = 'jp-TestItem';

const ITEM_CLASS = 'jp-Completion-item';

const ACTIVE_CLASS = 'jp-mod-active';

const MAX_HEIGHT = 250;


class CustomRenderer extends CompletionWidget.Renderer {
  createItemNode(item: ICompletionItem): HTMLLIElement {
    let li = super.createItemNode(item);
    li.classList.add(TEST_ITEM_CLASS);
    return li;
  }
}


class LogWidget extends CompletionWidget {
  events: string[] = [];

  methods: string[] = [];

  dispose(): void {
    super.dispose();
    this.events.length = 0;
  }

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}


describe('notebook/completion/widget', () => {

  describe('CompletionWidget', () => {

    describe('#constructor()', () => {

      it('should create a completion widget', () => {
        let widget = new CompletionWidget();
        expect(widget).to.be.a(CompletionWidget);
        expect(widget.node.classList).to.contain('jp-Completion');
      });

      it('should accept options with a model', () => {
        let options: CompletionWidget.IOptions = {
          model: new CompletionModel()
        };
        let widget = new CompletionWidget(options);
        expect(widget).to.be.a(CompletionWidget);
        expect(widget.model).to.equal(options.model);
      });

      it('should accept options with a renderer', () => {
        let options: CompletionWidget.IOptions = {
          model: new CompletionModel(),
          renderer: new CustomRenderer()
        };
        options.model.options = ['foo', 'bar'];

        let widget = new CompletionWidget(options);
        expect(widget).to.be.a(CompletionWidget);
        sendMessage(widget, WidgetMessage.UpdateRequest);

        let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
        expect(items).to.have.length(2);
        expect(items[0].classList).to.contain(TEST_ITEM_CLASS);
      });

    });

    describe('#selected', () => {

      it('should emit a signal when an item is selected', () => {
        let anchor = new Widget();
        let options: CompletionWidget.IOptions = {
          model: new CompletionModel(),
          anchor: anchor.node
        };
        let value = '';
        let listener = (sender: any, selected: string) => { value = selected; };
        options.model.options = ['foo', 'bar'];
        Widget.attach(anchor, document.body);

        let widget = new CompletionWidget(options);

        widget.selected.connect(listener);
        Widget.attach(widget, document.body);
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(value).to.be('');
        simulate(anchor.node, 'keydown', { keyCode: 13 }); // Enter
        expect(value).to.be('foo');
        widget.dispose();
        anchor.dispose();
      });

    });

    describe('#visibilityChanged', () => {

      it('should emit a signal when completion visibility changes', () => {
        let anchor = new Widget();
        let options: CompletionWidget.IOptions = {
          model: new CompletionModel(),
          anchor: anchor.node
        };
        let called = false;
        let listener = () => { called = true; };
        options.model.options = ['foo', 'bar'];
        Widget.attach(anchor, document.body);

        let widget = new CompletionWidget(options);

        widget.visibilityChanged.connect(listener);
        expect(called).to.be(false);
        Widget.attach(widget, document.body);
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(called).to.be(true);
        widget.dispose();
        anchor.dispose();
      });

    });

    describe('#model', () => {

      it('should default to null', () => {
        let widget = new CompletionWidget();
        expect(widget.model).to.be(null);
      });

      it('should be settable', () => {
        let widget = new CompletionWidget();
        expect(widget.model).to.be(null);
        widget.model = new CompletionModel();
        expect(widget.model).to.be.a(CompletionModel);
      });

      it('should be safe to set multiple times', () => {
        let model = new CompletionModel();
        let widget = new CompletionWidget();
        widget.model = model;
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should be safe to reset', () => {
        let model = new CompletionModel();
        let widget = new CompletionWidget({ model: new CompletionModel() });
        expect(widget.model).not.to.be(model);
        widget.model = model;
        expect(widget.model).to.be(model);
      });

    });

    describe('#anchor', () => {

      it('should default to null', () => {
        let widget = new CompletionWidget();
        expect(widget.anchor).to.be(null);
      });

      it('should be settable', () => {
        let widget = new CompletionWidget();
        expect(widget.anchor).to.be(null);
        widget.anchor = new Widget().node;
        expect(widget.anchor).to.be.a(Node);
      });

      it('should be safe to reset', () => {
        let anchor = new Widget();
        let widget = new CompletionWidget({ anchor: (new Widget()).node });
        expect(widget.anchor).not.to.be(anchor.node);
        widget.anchor = anchor.node;
        expect(widget.anchor).to.be(anchor.node);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CompletionWidget();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CompletionWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#reset()', () => {

      it('should reset the completion widget', () => {
        let anchor = new Widget();
        let model = new CompletionModel();
        let options: CompletionWidget.IOptions = {
          model, anchor: anchor.node
        };
        model.options = ['foo', 'bar'];
        Widget.attach(anchor, document.body);

        let widget = new CompletionWidget(options);

        Widget.attach(widget, document.body);
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.isHidden).to.be(false);
        expect(model.options).to.be.ok();
        widget.reset();
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.isHidden).to.be(true);
        expect(model.options).to.not.be.ok();
        widget.dispose();
        anchor.dispose();
      });

    });

    describe('#handleEvent()', () => {

      it('should handle document keydown and mousedown events', () => {
        let widget = new LogWidget();
        Widget.attach(widget, document.body);
        ['keydown', 'mousedown'].forEach(type => {
          simulate(document, type);
          expect(widget.events).to.contain(type);
        });
        widget.dispose();
      });

      it('should handle anchor element scroll events', () => {
        let anchor = new Widget();
        let widget = new LogWidget({ anchor: anchor.node });
        Widget.attach(widget, document.body);
        simulate(anchor.node, 'scroll');
        expect(widget.events).to.contain('scroll');
        widget.dispose();
      });

      context('keydown', () => {

        it('should reset if keydown is outside anchor', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          model.options = ['foo', 'bar'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(widget.isHidden).to.be(false);
          expect(model.options).to.be.ok();
          simulate(document.body, 'keydown', { keyCode: 70 }); // F
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(widget.isHidden).to.be(true);
          expect(model.options).to.not.be.ok();
          widget.dispose();
          anchor.dispose();
        });

        it('should trigger a selected signal on enter key', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.options = ['foo', 'bar', 'baz'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(value).to.be('');
          simulate(anchor.node, 'keydown', { keyCode: 13 }); // Enter
          expect(value).to.be('foo');
          widget.dispose();
          anchor.dispose();
        });

        it('should select the item below and cycle back on down', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          model.options = ['foo', 'bar', 'baz'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);
          let target = document.createElement('div');

          anchor.node.appendChild(target);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);

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
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          model.options = ['foo', 'bar', 'baz'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);

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

        it('should mark common subset on tab and select on next tab', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.options = ['foo', 'four', 'foz'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);

          let marked = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`);
          expect(marked).to.be.empty();
          expect(value).to.be('');
          simulate(anchor.node, 'keydown', { keyCode: 9 });  // Tab
          sendMessage(widget, WidgetMessage.UpdateRequest);
          marked = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`);
          expect(value).to.be('fo');
          expect(marked).to.have.length(3);
          expect(marked[0].textContent).to.be('fo');
          expect(marked[1].textContent).to.be('fo');
          expect(marked[2].textContent).to.be('fo');
          simulate(anchor.node, 'keydown', { keyCode: 9 });  // Tab
          expect(value).to.be('foo');
          widget.dispose();
          anchor.dispose();
        });

      });

      context('mousedown', () => {

        it('should trigger a selected signal on mouse down', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.options = ['foo', 'bar', 'baz'];
          model.query = 'b';
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);

          let item = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`)[1];

          expect(value).to.be('');
          simulate(item, 'mousedown');
          expect(value).to.be('baz');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore nonstandard mouse clicks (e.g., right click)', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.options = ['foo', 'bar'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(value).to.be('');
          simulate(widget.node, 'mousedown', { button: 1 });
          expect(value).to.be('');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore a mouse down that misses an item', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.options = ['foo', 'bar'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(value).to.be('');
          simulate(widget.node, 'mousedown');
          expect(value).to.be('');
          widget.dispose();
          anchor.dispose();
        });

        it('should hide widget if mouse down misses it', () => {
          let anchor = new Widget();
          let model = new CompletionModel();
          let options: CompletionWidget.IOptions = {
            model, anchor: anchor.node
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.options = ['foo', 'bar'];
          Widget.attach(anchor, document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(widget.isHidden).to.be(false);
          simulate(anchor.node, 'mousedown');
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(widget.isHidden).to.be(true);
          widget.dispose();
          anchor.dispose();
        });

      });

      context('scroll', () => {

        it('should move along with the pegged anchor', (done) => {
          let anchor = document.createElement('div');
          let container = new Widget();
          let model = new CompletionModel();
          let coords: ICoords = { left: 0, right: 0, top: 500, bottom: 0 };
          let request: ICompletionRequest = {
            ch: 0,
            chHeight: 0,
            chWidth: 0,
            line: 0,
            coords: coords,
            position: 0,
            currentValue: 'f'
          };
          let options: CompletionWidget.IOptions = { model, anchor: anchor };

          document.body.appendChild(anchor);
          anchor.style.height = '1000px';
          anchor.style.overflow = 'auto';

          Widget.attach(container, anchor);
          container.node.style.height = '5000px';
          anchor.scrollTop = 0;
          model.original = request;
          model.options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

          let widget = new CompletionWidget(options);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);

          let top = parseInt(window.getComputedStyle(widget.node).top, 10);
          let offset = 200;
          expect(top).to.be(coords.top - MAX_HEIGHT);
          anchor.scrollTop = offset;
          simulate(anchor, 'scroll');

          requestAnimationFrame(() => {
            let top = parseInt(window.getComputedStyle(widget.node).top, 10);
            expect(top).to.be(coords.top - MAX_HEIGHT - offset);
            widget.dispose();
            container.dispose();
            done();
          });
        });

      });

    });

    describe('#onUpdateRequest()', () => {

      it('should emit a selection if there is only one match', () => {
        let anchor = new Widget();
        let model = new CompletionModel();
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'f'
        };
        let value = '';
        let options: CompletionWidget.IOptions = { model, anchor: anchor.node };
        let listener = (sender: any, selected: string) => { value = selected; };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.options = ['foo'];

        let widget = new CompletionWidget(options);
        widget.selected.connect(listener);
        Widget.attach(widget, document.body);

        expect(value).to.be('');
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(value).to.be('foo');
        widget.dispose();
        anchor.dispose();
      });

      it('should do nothing if a model does not exist', () => {
        let widget = new LogWidget();
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

      it('should un-hide widget if multiple options are available', () => {
        let anchor = new Widget();
        let model = new CompletionModel();
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'f'
        };
        let options: CompletionWidget.IOptions = { model, anchor: anchor.node };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.options = ['foo', 'bar', 'baz'];

        let widget = new CompletionWidget(options);
        widget.hide();
        expect(widget.isHidden).to.be(true);
        Widget.attach(widget, document.body);
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.isVisible).to.be(true);
        widget.dispose();
        anchor.dispose();
      });

    });

  });

});
