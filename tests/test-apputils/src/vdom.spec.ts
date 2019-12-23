// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { framePromise } from '@jupyterlab/testutils';

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

describe('@jupyterlab/apputils', () => {
  describe('VDomModel', () => {
    describe('#constructor()', () => {
      it('should create a VDomModel', () => {
        const model = new VDomModel();
        expect(model).to.be.an.instanceof(VDomModel);
      });

      it('should create a TestModel', () => {
        const model = new TestModel();
        expect(model).to.be.an.instanceof(TestModel);
      });

      it('should be properly disposed', () => {
        const model = new TestModel();
        model.dispose();
        expect(model.isDisposed).to.be.equal(true);
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
        expect(changed).to.equal(true);
      });
    });
  });

  describe('VDomRenderer', () => {
    describe('#constructor()', () => {
      it('should create a TestWidget', () => {
        const widget = new TestWidget(new TestModel());
        expect(widget).to.be.an.instanceof(TestWidget);
      });

      it('should be properly disposed', () => {
        const widget = new TestWidget(new TestModel());
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#modelChanged()', () => {
      it('should fire the stateChanged signal on a change', () => {
        const model = new TestModel();
        const widget = new TestWidget(new TestModel());
        let changed = false;
        widget.modelChanged.connect(() => {
          changed = true;
        });
        widget.model = model;
        expect(changed).to.equal(true);
      });
    });

    describe('#render()', () => {
      it('should render the contents after a model change', async () => {
        const widget = new TestWidget(new TestModel());
        const model = new TestModel();
        widget.model = model;
        model.value = 'foo';
        await framePromise();
        let span = widget.node.firstChild as HTMLElement;
        expect(span.textContent).to.equal('foo');
      });
    });

    describe('#noModel()', () => {
      it('should work with a null model', async () => {
        const widget = new TestWidgetNoModel();
        Widget.attach(widget, document.body);
        await framePromise();
        const span = widget.node.firstChild as HTMLElement;
        expect(span.textContent).to.equal('No model!');
      });
    });
  });
});
