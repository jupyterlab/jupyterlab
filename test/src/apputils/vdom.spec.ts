// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  VDomModel, VDomWidget
} from '@jupyterlab/apputils';


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

class TestWidget extends VDomWidget<TestModel> {
  protected render(): VirtualNode {
    return h.span(this.model.value);
  }
}


describe('@jupyterlab/domutils', () => {

  describe('VDomModel', () => {

    describe('#constructor()', () => {

      it('should create a VDomModel', () => {
        let model = new VDomModel();
        expect(model).to.be.an.instanceof(VDomModel);
      });

      it('should create a TestModel', () => {
        let model = new TestModel();
        expect(model).to.be.an.instanceof(TestModel);
      });

      it('should be properly disposed', () => {
        let model = new TestModel();
        model.dispose();
        expect(model.isDisposed).to.be.equal(true);
      });
    });

    describe('#stateChanged()', () => {

      it('should fire the stateChanged signal on a change', () => {
        let model = new TestModel();
        let changed = false;
        model.stateChanged.connect(() => { changed = true; });
        model.value = 'newvalue';
        expect(changed).to.equal(true);
      });

    });

  });

  describe('VDomWidget', () => {

    describe('#constructor()', () => {

      it('should create a TestWidget', () => {
        let widget = new TestWidget();
        expect(widget).to.be.an.instanceof(TestWidget);
      });

      it('should be properly disposed', () => {
        let widget = new TestWidget();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#modelChanged()', () => {

      it('should fire the stateChanged signal on a change', () => {
        let widget = new TestWidget();
        let model = new TestModel();
        let changed = false;
        widget.modelChanged.connect(() => { changed = true; });
        widget.model = model;
        expect(changed).to.equal(true);
      });

    });

    describe('#render()', () => {

      it('should render the contents after a model change', (done) => {
        let widget = new TestWidget();
        let model = new TestModel();
        widget.model = model;
        model.value = 'foo';
        requestAnimationFrame(() => {
          let span = widget.node.firstChild as HTMLElement;
          expect(span.textContent).to.equal('foo');
          done();
        });
      });

    });

  });

});
