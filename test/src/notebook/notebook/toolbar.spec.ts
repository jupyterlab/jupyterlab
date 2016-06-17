// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  simulate
} from 'simulate-event';

import {
  NotebookToolbar, ToolbarButton
} from '../../../../lib/notebook/notebook/toolbar';


class LogToolbarButton extends ToolbarButton {

  events: string[] = [];

  methods: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }
}


describe('notebook/notebook/toolbar', () => {

  describe('NotebookToolbar', () => {

    describe('#constructor()', () => {

      it('should construct a new toolbar widget', () => {
        let widget = new NotebookToolbar();
        expect(widget).to.be.a(NotebookToolbar);
      });

      it('should add the `jp-NBToolbar` class', () => {
        let widget = new NotebookToolbar();
        expect(widget.hasClass('jp-NBToolbar')).to.be(true);
      });

    });

    describe('#add()', () => {

      it('should add an item to the toolbar', () => {
        let item = new Widget();
        let widget = new NotebookToolbar();
        widget.add('test', item);
        expect(widget.list()).to.contain('test');
      });

      it('should add the `jp-NBToolbar-item` class to the widget', () => {
        let item = new Widget();
        let widget = new NotebookToolbar();
        widget.add('test', item);
        expect(item.hasClass('jp-NBToolbar-item')).to.be(true);
      });

      it('should add the item after a named item', () => {
        let items = [new Widget(), new Widget(), new Widget()];
        let widget = new NotebookToolbar();
        widget.add('foo', items[0]);
        widget.add('bar', items[1]);
        widget.add('baz', items[2], 'foo');
        expect(widget.list()).to.eql(['foo', 'baz', 'bar']);
      });

      it('should ignore an invalid `after`', () => {
        let items = [new Widget(), new Widget(), new Widget()];
        let widget = new NotebookToolbar();
        widget.add('foo', items[0]);
        widget.add('bar', items[1]);
        widget.add('baz', items[2], 'fuzz');
        expect(widget.list()).to.eql(['foo', 'bar', 'baz']);
      });

      it('should throw an error if the name is alreay used', () => {
        let widget = new NotebookToolbar();
        widget.add('test', new Widget());
        expect(() => { widget.add('test', new Widget()); }).to.throwError();
      });

    });

    describe('#list()', () => {

      it('should get an ordered list the toolbar item names', () => {
        let widget = new NotebookToolbar();
        widget.add('foo', new Widget());
        widget.add('bar', new Widget());
        widget.add('baz', new Widget());
        expect(widget.list()).to.eql(['foo', 'bar', 'baz']);
      });

    });

  });

  describe('ToolbarButton', () => {

    describe('#createNode()', () => {

      it('should create a node for the toolbar button', () => {
        let node = ToolbarButton.createNode();
        expect(node.localName).to.be('span');
      });

    });

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let button = new ToolbarButton();
        expect(button).to.be.a(ToolbarButton);
      });

      it('should accept options', () => {
        let button = new ToolbarButton({
          className: 'foo',
          onClick: () => { return void 0; },
          tooltip: 'bar'
        });
        expect(button.hasClass('foo')).to.be(true);
        expect(button.node.title).to.be('bar');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        let button = new ToolbarButton();
        button.dispose();
        expect(button.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        let button = new ToolbarButton();
        button.dispose();
        button.dispose();
        expect(button.isDisposed).to.be(true);
      });

    });

    describe('#handleEvent()', () => {

      context('click', () => {

        it('should activate the callback', (done) => {
          let called = false;
          let button = new ToolbarButton({
            onClick: () => { called = true; },
          });
          button.attach(document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'click');
            expect(called).to.be(true);
            done();
          });
        });

      });

      context('mousedown', () => {

        it('should add the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          button.attach(document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            expect(button.hasClass('jp-mod-pressed')).to.be(true);
            done();
          });
        });

      });

      context('mouseup', () => {

        it('should remove the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          button.attach(document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            simulate(button.node, 'mouseup');
            expect(button.hasClass('jp-mod-pressed')).to.be(false);
            done();
          });
        });

      });

      context('mouseout', () => {

        it('should remove the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          button.attach(document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            simulate(button.node, 'mouseout');
            expect(button.hasClass('jp-mod-pressed')).to.be(false);
            done();
          });
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners to the node', () => {
        let button = new LogToolbarButton();
        button.attach(document.body);
        expect(button.methods).to.contain('onAfterAttach');
        simulate(button.node, 'mousedown');
        simulate(button.node, 'mouseup');
        simulate(button.node, 'mouseout');
        expect(button.events).to.contain('mousedown');
        expect(button.events).to.contain('mouseup');
        expect(button.events).to.contain('mouseout');
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners from the node', (done) => {
        let button = new LogToolbarButton();
        button.attach(document.body);
        requestAnimationFrame(() => {
          button.detach();
          expect(button.methods).to.contain('onBeforeDetach');
          simulate(button.node, 'mousedown');
          simulate(button.node, 'mouseup');
          simulate(button.node, 'mouseout');
          expect(button.events).to.not.contain('mousedown');
          expect(button.events).to.not.contain('mouseup');
          expect(button.events).to.not.contain('mouseout');
          done();
        });
      });

    });

  });

});
