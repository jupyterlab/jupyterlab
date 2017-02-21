// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ISignal, defineSignal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  Inspector
} from '../../../lib/inspector';


class TestInspector extends Inspector {
  methods: string[] = [];

  protected onInspectorUpdate(sender: any, args: Inspector.IInspectorUpdate): void {
    super.onInspectorUpdate(sender, args);
    this.methods.push('onInspectorUpdate');
  }
}


class TestInspectable implements Inspector.IInspectable {
  disposed: ISignal<any, void>;

  ephemeralCleared: ISignal<any, void>;

  inspected: ISignal<any, Inspector.IInspectorUpdate>;
}

defineSignal(TestInspectable.prototype, 'disposed');
defineSignal(TestInspectable.prototype, 'ephemeralCleared');
defineSignal(TestInspectable.prototype, 'inspected');


describe('inspector/index', () => {

  describe('Inspector', () => {

    describe('#constructor()', () => {

      it('should construct a new inspector widget', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget).to.be.an(Inspector);
      });

      it('should add the `jp-Inspector` class', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget.hasClass('jp-Inspector')).to.be(true);
      });

      it('should accept an options argument with inspector items', () => {
        let options: Inspector.IOptions = {
          items: [{ name: 'Foo', rank: 20, type: 'foo' }]
        };
        let widget = new Inspector(options);
        expect(widget).to.be.an(Inspector);
      });

      it('should hide its tab bar if there are less than two items', () => {
        let options: Inspector.IOptions = {
          items: [{ name: 'Foo', rank: 20, type: 'foo' }]
        };
        let widget = new Inspector(options);
        expect(widget).to.be.an(Inspector);
        expect(widget.tabBar.isHidden).to.be(true);
      });

      it('should show its tab bar if there is more than one item', () => {
        let options: Inspector.IOptions = {
          items: [
            { name: 'Foo', rank: 20, type: 'foo' },
            { name: 'Boo', rank: 30, type: 'bar' }
          ]
        };
        let widget = new Inspector(options);
        expect(widget).to.be.an(Inspector);
        expect(widget.tabBar.isHidden).to.be(false);
      });

    });

    describe('#source', () => {

      it('should default to `null`', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget.source).to.be(null);
      });

      it('should be settable multiple times', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        let source = new TestInspectable();
        expect(widget.source).to.be(null);
        widget.source = source;
        expect(widget.source).to.be(source);
        widget.source = null;
        expect(widget.source).to.be(null);
        widget.source = new TestInspectable();
        expect(widget.source).to.be.a(TestInspectable);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the inspector', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be a no-op if called more than once', () => {
        let options: Inspector.IOptions = {};
        let widget = new Inspector(options);
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });


    describe('#onInspectorUpdate()', () => {

      it('should fire when a source updates', () => {
        let options: Inspector.IOptions = {};
        let widget = new TestInspector(options);
        widget.source = new TestInspectable();
        expect(widget.methods).to.not.contain('onInspectorUpdate');
        widget.source.inspected.emit({
          content: new Widget(),
          type: 'hints'
        });
        expect(widget.methods).to.contain('onInspectorUpdate');
      });

    });

  });

});
