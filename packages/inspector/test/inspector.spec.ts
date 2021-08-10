// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IInspector, InspectorPanel } from '@jupyterlab/inspector';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

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

  onEditorChange(customText?: string): void {
    /* empty */
  }
}

describe('inspector/index', () => {
  describe('Inspector', () => {
    describe('#constructor()', () => {
      it('should construct a new inspector widget', () => {
        const widget = new InspectorPanel();
        expect(widget).toBeInstanceOf(InspectorPanel);
      });

      it('should add the `jp-Inspector` class', () => {
        const widget = new InspectorPanel();
        expect(widget.hasClass('jp-Inspector')).toBe(true);
      });
    });

    describe('#source', () => {
      it('should default to `null`', () => {
        const widget = new InspectorPanel();
        expect(widget.source).toBeNull();
      });

      it('should be settable multiple times', () => {
        const widget = new InspectorPanel();
        const source = new TestInspectable();
        expect(widget.source).toBeNull();
        widget.source = source;
        expect(widget.source).toBe(source);
        widget.source = null;
        expect(widget.source).toBeNull();
        widget.source = new TestInspectable();
        expect(widget.source).toBeInstanceOf(TestInspectable);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the inspector', () => {
        const widget = new InspectorPanel();
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });

      it('should be a no-op if called more than once', () => {
        const widget = new InspectorPanel();
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#onInspectorUpdate()', () => {
      it('should fire when a source updates', () => {
        const widget = new TestInspectorPanel();
        widget.source = new TestInspectable();
        expect(widget.methods).toEqual(
          expect.not.arrayContaining(['onInspectorUpdate'])
        );
        (widget.source.inspected as any).emit({ content: new Widget() });
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onInspectorUpdate'])
        );
      });
    });
  });
});
