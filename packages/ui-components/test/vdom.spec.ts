// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { framePromise } from '@jupyterlab/testing';
import { Widget } from '@lumino/widgets';
import * as React from 'react';

class TestModel extends VDomModel {
  get value(): string {
    return this._value;
  }

  set value(newValue: string) {
    this._value = newValue;
    this.stateChanged.emit(void 0);
  }

  private _value = '';
}

class TestWidget extends VDomRenderer<TestModel> {
  protected render(): React.ReactElement<any> {
    return React.createElement('span', null, this.model.value);
  }
}

class TestWidgetNoModel extends VDomRenderer {
  protected render(): React.ReactElement<any> {
    return React.createElement('span', null, 'No model!');
  }
}

describe('@jupyterlab/ui-components', () => {
  describe('VDomModel', () => {
    describe('#constructor()', () => {
      it('should create a VDomModel', () => {
        const model = new VDomModel();
        expect(model).toBeInstanceOf(VDomModel);
      });

      it('should create a TestModel', () => {
        const model = new TestModel();
        expect(model).toBeInstanceOf(TestModel);
      });

      it('should be properly disposed', () => {
        const model = new TestModel();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#stateChanged()', () => {
      it('should fire the stateChanged signal on a change', () => {
        const model = new TestModel();
        let changed = false;
        model.stateChanged.connect(() => {
          changed = true;
        });
        model.value = 'newvalue';
        expect(changed).toBe(true);
      });
    });
  });

  describe('VDomRenderer', () => {
    describe('#constructor()', () => {
      it('should create a TestWidget', () => {
        const widget = new TestWidget(new TestModel());
        expect(widget).toBeInstanceOf(TestWidget);
      });

      it('should be properly disposed', () => {
        const widget = new TestWidget(new TestModel());
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#modelChanged()', () => {
      it('should fire the stateChanged signal on a change', async () => {
        const model = new TestModel();
        const widget = new TestWidget(new TestModel());
        let changed = false;
        widget.modelChanged.connect(() => {
          changed = true;
        });
        widget.model = model;
        expect(changed).toBe(true);
      });
    });

    describe('#render()', () => {
      it('should render the contents after a model change', async () => {
        const widget = new TestWidget(new TestModel());
        const model = new TestModel();
        Widget.attach(widget, document.body);
        widget.model = model;
        model.value = 'foo';
        await framePromise();
        await widget.renderPromise;
        await framePromise();
        const span = widget.node.firstChild as HTMLElement;
        expect(span.textContent).toBe('foo');
      });
    });

    describe('#noModel()', () => {
      it('should work with a null model', async () => {
        const widget = new TestWidgetNoModel();
        Widget.attach(widget, document.body);
        await framePromise();
        await widget.renderPromise;
        const span = widget.node.firstChild as HTMLElement;
        expect(span.textContent).toBe('No model!');
      });
    });
  });
});
