// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  sendMessage, Message
} from '@phosphor/messaging';

import {
  Panel
} from '@phosphor/widgetpanel';

import {
  Widget, WidgetMessage
} from '@phosphor/widgetwidget';

import {
  simulate
} from 'simulate-event';

import {
  CompleterWidget, CompleterModel
} from '../../../lib/completer';


const TEST_ITEM_CLASS = 'jp-TestItem';

const ITEM_CLASS = 'jp-Completer-item';

const ACTIVE_CLASS = 'jp-mod-active';


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
    super.handleEvent(event);
    this.events.push(event.type);
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
        let widget = new CompleterWidget();
        expect(widget).to.be.a(CompleterWidget);
        expect(widget.node.classList).to.contain('jp-Completer');
      });

      it('should accept options with a model', () => {
        let options: CompleterWidget.IOptions = {
          model: new CompleterModel()
        };
        let widget = new CompleterWidget(options);
        expect(widget).to.be.a(CompleterWidget);
        expect(widget.model).to.equal(options.model);
      });

      it('should accept options with a renderer', () => {
        let options: CompleterWidget.IOptions = {
          anchor: new Widget(),
          model: new CompleterModel(),
          renderer: new CustomRenderer()
        };
        options.model.setOptions(['foo', 'bar']);

        let widget = new CompleterWidget(options);
        expect(widget).to.be.a(CompleterWidget);
        sendMessage(widget, WidgetMessage.UpdateRequest);

        let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
        expect(items).to.have.length(2);
        expect(items[0].classList).to.contain(TEST_ITEM_CLASS);
      });

    });

    describe('#selected', () => {

      it('should emit a signal when an item is selected', () => {
        let anchor = new Widget();
        let options: CompleterWidget.IOptions = {
          anchor,
          model: new CompleterModel()
        };
        let value = '';
        let listener = (sender: any, selected: string) => { value = selected; };
        options.model.setOptions(['foo', 'bar']);
        Widget.attach(anchor, document.body);

        let widget = new CompleterWidget(options);

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

      it('should emit a signal when completer visibility changes', () => {
        let anchor = new Widget();
        let options: CompleterWidget.IOptions = {
          anchor,
          model: new CompleterModel()
        };
        let called = false;
        let listener = () => { called = true; };
        options.model.setOptions(['foo', 'bar']);
        Widget.attach(anchor, document.body);

        let widget = new CompleterWidget(options);

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
        let widget = new CompleterWidget();
        expect(widget.model).to.be(null);
      });

      it('should be settable', () => {
        let widget = new CompleterWidget();
        expect(widget.model).to.be(null);
        widget.model = new CompleterModel();
        expect(widget.model).to.be.a(CompleterModel);
      });

      it('should be safe to set multiple times', () => {
        let model = new CompleterModel();
        let widget = new CompleterWidget();
        widget.model = model;
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should be safe to reset', () => {
        let model = new CompleterModel();
        let widget = new CompleterWidget({ model: new CompleterModel() });
        expect(widget.model).not.to.be(model);
        widget.model = model;
        expect(widget.model).to.be(model);
      });

    });

    describe('#anchor', () => {

      it('should default to null', () => {
        let widget = new CompleterWidget();
        expect(widget.anchor).to.be(null);
      });

      it('should be settable', () => {
        let widget = new CompleterWidget();
        expect(widget.anchor).to.be(null);
        widget.anchor = new Widget();
        expect(widget.anchor).to.be.a(Widget);
      });

      it('should be safe to reset', () => {
        let anchor = new Widget();
        let widget = new CompleterWidget({ anchor: new Widget() });
        expect(widget.anchor).not.to.be(anchor);
        widget.anchor = anchor;
        expect(widget.anchor).to.be(anchor);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CompleterWidget();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CompleterWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#reset()', () => {

      it('should reset the completer widget', () => {
        let anchor = new Widget();
        let model = new CompleterModel();
        let options: CompleterWidget.IOptions = { anchor, model };
        model.setOptions(['foo', 'bar']);
        Widget.attach(anchor, document.body);

        let widget = new CompleterWidget(options);

        Widget.attach(widget, document.body);
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.isHidden).to.be(false);
        expect(model.options).to.be.ok();
        widget.reset();
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.isHidden).to.be(true);
        expect(model.options().next()).to.be(void 0);
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
        let widget = new LogWidget({ anchor });
        Widget.attach(widget, document.body);
        simulate(anchor.node, 'scroll');
        expect(widget.events).to.contain('scroll');
        widget.dispose();
      });

      context('keydown', () => {

        it('should reset if keydown is outside anchor', () => {
          let anchor = new Widget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(widget.isHidden).to.be(false);
          expect(model.options).to.be.ok();
          simulate(document.body, 'keydown', { keyCode: 70 }); // F
          sendMessage(widget, WidgetMessage.UpdateRequest);
          expect(widget.isHidden).to.be(true);
          expect(model.options().next()).to.be(void 0);
          widget.dispose();
          anchor.dispose();
        });

        it('should trigger a selected signal on enter key', () => {
          let anchor = new Widget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar', 'baz']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

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
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          model.setOptions(['foo', 'bar', 'baz']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);
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
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          model.setOptions(['foo', 'bar', 'baz']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

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

        it('should mark common subset on start and select on tab', (done) => {
          let anchor = new Widget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['fo', 'foo', 'foo', 'fooo']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

          widget.selected.connect(listener);
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);
          requestAnimationFrame(() => {
            let marked = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`);
            expect(value).to.be('fo');
            expect(marked).to.have.length(4);
            expect(marked[0].textContent).to.be('fo');
            expect(marked[1].textContent).to.be('fo');
            expect(marked[2].textContent).to.be('fo');
            expect(marked[3].textContent).to.be('fo');
            simulate(anchor.node, 'keydown', { keyCode: 9 });  // Tab key
            sendMessage(widget, WidgetMessage.UpdateRequest);
            expect(value).to.be('fo');
            widget.dispose();
            anchor.dispose();
            done();
          });
        });

      });

      context('mousedown', () => {

        it('should trigger a selected signal on mouse down', () => {
          let anchor = new Widget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
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
          sendMessage(widget, WidgetMessage.UpdateRequest);

          let item = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`)[1];

          expect(value).to.be('ba');
          simulate(item, 'mousedown');
          expect(value).to.be('baz');
          widget.dispose();
          anchor.dispose();
        });

        it('should ignore nonstandard mouse clicks (e.g., right click)', () => {
          let anchor = new Widget();
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

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
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

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
          let model = new CompleterModel();
          let options: CompleterWidget.IOptions = { anchor, model };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          model.setOptions(['foo', 'bar']);
          Widget.attach(anchor, document.body);

          let widget = new CompleterWidget(options);

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

        it('should position itself according to the anchor', (done) => {
          let anchor = new Panel();
          let content = new Widget();
          let model = new CompleterModel();
          let coords: CompleterWidget.ICoordinate = { left: 0, right: 0, top: 100, bottom: 120 };
          let request: CompleterWidget.ITextState = {
            column: 0,
            lineHeight: 0,
            charWidth: 0,
            line: 0,
            coords,
            text: 'f'
          };

          content.node.style.height = '5000px';
          content.node.style.width = '400px';
          content.node.style.overflow = 'auto';
          content.node.style.background = 'yellow';

          anchor.node.style.background = 'red';
          anchor.node.style.height = '2000px';
          anchor.node.style.width = '500px';
          anchor.node.style.maxHeight = '500px';
          anchor.node.style.overflow = 'hidden';

          Widget.attach(anchor, document.body);
          anchor.addWidget(content);

          anchor.node.scrollTop = 100;
          model.original = request;
          model.cursor = { start: 0, end: 0 };
          model.setOptions('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

          let widget = new CompleterWidget({ model, anchor: anchor });
          Widget.attach(widget, document.body);
          sendMessage(widget, WidgetMessage.UpdateRequest);

          simulate(anchor.node, 'scroll');

          requestAnimationFrame(() => {
            let top = parseInt(window.getComputedStyle(widget.node).top, 10);
            expect(top).to.be(coords.bottom);
            widget.dispose();
            content.dispose();
            anchor.dispose();
            done();
          });
        });

      });

    });

    describe('#onUpdateRequest()', () => {

      it('should emit a selection if there is only one match', () => {
        let anchor = new Widget();
        let model = new CompleterModel();
        let coords: CompleterWidget.ICoordinate = { left: 0, right: 0, top: 100, bottom: 120 };
        let request: CompleterWidget.ITextState = {
            column: 0,
            lineHeight: 0,
            charWidth: 0,
            line: 0,
            coords,
            text: 'f'
          };

        let value = '';
        let options: CompleterWidget.IOptions = { anchor, model };
        let listener = (sender: any, selected: string) => { value = selected; };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setOptions(['foo']);

        let widget = new CompleterWidget(options);
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
        let model = new CompleterModel();
        let coords: CompleterWidget.ICoordinate = { left: 0, right: 0, top: 100, bottom: 120 };
        let request: CompleterWidget.ITextState = {
          column: 0,
          lineHeight: 0,
          charWidth: 0,
          line: 0,
          coords,
          text: 'f'
        };

        let options: CompleterWidget.IOptions = { anchor, model };

        Widget.attach(anchor, document.body);
        model.original = request;
        model.setOptions(['foo', 'bar', 'baz']);

        let widget = new CompleterWidget(options);
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
