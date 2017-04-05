// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Signal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgets';

import {
  IInspector, InspectorPanel
} from '@jupyterlab/inspector';


class TestInspectorPanel extends InspectorPanel {
  methods: string[] = [];

  protected onInspectorUpdate(sender: any, args: IInspector.IInspectorUpdate): void {
    super.onInspectorUpdate(sender, args);
    this.methods.push('onInspectorUpdate');
  }
}


class TestInspectable implements IInspector.IInspectable {
  disposed = new Signal<this, void>(this);

  ephemeralCleared = new Signal<this, void>(this);

  inspected = new Signal<this, IInspector.IInspectorUpdate>(this);

  standby = false;
}


describe('inspector/index', () => {

  describe('Inspector', () => {

    describe('#constructor()', () => {

      it('should construct a new inspector widget', () => {
        let widget = new InspectorPanel();
        expect(widget).to.be.an(InspectorPanel);
      });

      it('should add the `jp-Inspector` class', () => {
        let widget = new InspectorPanel();
        expect(widget.hasClass('jp-Inspector')).to.be(true);
      });

      it('should hide its tab bar if there are less than two items', () => {
        let widget = new InspectorPanel();
        widget.add({ name: 'Foo', rank: 20, type: 'foo' });
        expect(widget).to.be.an(InspectorPanel);
        expect(widget.tabBar.isHidden).to.be(true);
      });

      it('should show its tab bar if there is more than one item', () => {
        let widget = new InspectorPanel();
        widget.add({ name: 'Foo', rank: 20, type: 'foo' });
        widget.add({ name: 'Boo', rank: 30, type: 'bar' });
        expect(widget).to.be.an(InspectorPanel);
        expect(widget.tabBar.isHidden).to.be(false);
      });

    });

    describe('#source', () => {

      it('should default to `null`', () => {
        let widget = new InspectorPanel();
        expect(widget.source).to.be(null);
      });

      it('should be settable multiple times', () => {
        let widget = new InspectorPanel();
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

    describe('#add()', () => {

      it('should add inspector child items', () => {
        let panel = new InspectorPanel();
        let original = panel.widgets.length;

        panel.add({ name: 'Foo', rank: 20, type: 'foo' });
        panel.add({ name: 'Boo', rank: 30, type: 'bar' });

        expect(panel.widgets.length).to.be(original + 2);
      });

      it('should return disposables to remove child items', () => {
        let panel = new InspectorPanel();
        let original = panel.widgets.length;
        let disposable = panel.add({ name: 'Boo', rank: 30, type: 'bar' });

        expect(panel.widgets.length).to.be(original + 1);
        disposable.dispose();
        expect(panel.widgets.length).to.be(original);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the inspector', () => {
        let widget = new InspectorPanel();
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be a no-op if called more than once', () => {
        let widget = new InspectorPanel();
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });


    describe('#onInspectorUpdate()', () => {

      it('should fire when a source updates', () => {
        let widget = new TestInspectorPanel();
        widget.source = new TestInspectable();
        expect(widget.methods).to.not.contain('onInspectorUpdate');
        (widget.source.inspected as any).emit({
          content: new Widget(),
          type: 'hints'
        });
        expect(widget.methods).to.contain('onInspectorUpdate');
      });

    });

  });

});
