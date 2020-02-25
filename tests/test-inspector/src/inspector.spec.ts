// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Signal } from '@lumino/signaling';

import { Widget } from '@lumino/widgets';

import { IInspector, InspectorPanel } from '@jupyterlab/inspector';

class TestInspectorPanel extends InspectorPanel {
  methods: string[] = [];

  protected onInspectorUpdate(
    sender: any,
    args: IInspector.IInspectorUpdate
  ): void {
    super.onInspectorUpdate(sender, args);
    this.methods.push('onInspectorUpdate');
  }
}

class TestInspectable implements IInspector.IInspectable {
  disposed = new Signal<this, void>(this);

  cleared = new Signal<this, void>(this);

  inspected = new Signal<this, IInspector.IInspectorUpdate>(this);

  isDisposed = false;

  standby = false;
}

describe('inspector/index', () => {
  describe('Inspector', () => {
    describe('#constructor()', () => {
      it('should construct a new inspector widget', () => {
        const widget = new InspectorPanel();
        expect(widget).to.be.an.instanceof(InspectorPanel);
      });

      it('should add the `jp-Inspector` class', () => {
        const widget = new InspectorPanel();
        expect(widget.hasClass('jp-Inspector')).to.equal(true);
      });
    });

    describe('#source', () => {
      it('should default to `null`', () => {
        const widget = new InspectorPanel();
        expect(widget.source).to.be.null;
      });

      it('should be settable multiple times', () => {
        const widget = new InspectorPanel();
        const source = new TestInspectable();
        expect(widget.source).to.be.null;
        widget.source = source;
        expect(widget.source).to.equal(source);
        widget.source = null;
        expect(widget.source).to.be.null;
        widget.source = new TestInspectable();
        expect(widget.source).to.be.an.instanceof(TestInspectable);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the inspector', () => {
        const widget = new InspectorPanel();
        expect(widget.isDisposed).to.equal(false);
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

      it('should be a no-op if called more than once', () => {
        const widget = new InspectorPanel();
        expect(widget.isDisposed).to.equal(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#onInspectorUpdate()', () => {
      it('should fire when a source updates', () => {
        const widget = new TestInspectorPanel();
        widget.source = new TestInspectable();
        expect(widget.methods).to.not.contain('onInspectorUpdate');
        (widget.source.inspected as any).emit({ content: new Widget() });
        expect(widget.methods).to.contain('onInspectorUpdate');
      });
    });
  });
});
