// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from 'phosphor-messaging';

import {
  IListChangedArgs
} from 'phosphor-observablelist';

import {
  ChildMessage, Widget
} from 'phosphor-widget';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  OutputAreaModel, OutputAreaWidget
} from '../../../../lib/notebook/output-area';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';

import {
  DEFAULT_OUTPUTS
} from './model.spec';


/**
 * The default rendermime instance to use for testing.
 */
const rendermime = defaultRenderMime();


class LogOutputAreaWidget extends OutputAreaWidget {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onChildAdded(msg: ChildMessage): void {
    super.onChildAdded(msg);
    this.methods.push('onChildAdded');
  }

  protected onChildRemoved(msg: ChildMessage): void {
    super.onChildRemoved(msg);
    this.methods.push('onChildRemoved');
  }

  protected onModelChanged(oldValue: OutputAreaModel, newValue: OutputAreaModel): void {
    super.onModelChanged(oldValue, newValue);
    this.methods.push('onModelChanged');
  }

  protected onTrustedChanged(value: boolean): void {
    super.onTrustedChanged(value);
    this.methods.push('onTrustedChanged');
  }

  protected createOutput(output: nbformat.IOutput): Widget {
    let widget = super.createOutput(output);
    this.methods.push('createOutput');
    return widget;
  }

  protected onModelChange(sender: OutputAreaModel, args: IListChangedArgs<nbformat.IOutput>) {
    super.onModelChange(sender, args);
    this.methods.push('onModelChange');
  }
}


function createWidget(): LogOutputAreaWidget {
  let widget = new LogOutputAreaWidget({ rendermime });
  let model = new OutputAreaModel();
  for (let output of DEFAULT_OUTPUTS) {
    model.add(output);
  }
  widget.model = model;
  return widget;
}


describe('notebook/output-area/widget', () => {

  describe('OutputAreaWidget', () => {

    describe('#constructor()', () => {

      it('should take an options object', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget).to.be.an(OutputAreaWidget);
      });

      it('should take an optional renderer', () => {
        let renderer = Object.create(OutputAreaWidget.defaultRenderer);
        let widget = new OutputAreaWidget({ rendermime, renderer });
        expect(widget.renderer).to.be(renderer);
      });

      it('should add the `jp-OutputArea` class', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.hasClass('jp-OutputArea')).to.be(true);
      });

    });

    describe('#modelChanged', () => {

      it('should be emitted when the model of the widget changes', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let called = false;
        widget.modelChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args).to.be(void 0);
          called = true;
        });
        widget.model = new OutputAreaModel();
        expect(called).to.be(true);
      });

    });

    describe('#model', () => {

      it('should default to `null`', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.model).to.be(null);
      });

      it('should set the model', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let model = new OutputAreaModel();
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should emit `modelChanged` when the model changes', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let called = false;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = new OutputAreaModel();
        expect(called).to.be(true);
      });

      it('should not emit `modelChanged` when the model does not change', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let called = false;
        let model = new OutputAreaModel();
        widget.model = model;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = model;
        expect(called).to.be(false);
      });

      it('should create widgets for the model items', () => {
        let widget = createWidget();
        expect(widget.childCount()).to.be(5);
      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.rendermime).to.be(rendermime);
      });

      it('should be read-only', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(() => { widget.rendermime = null; }).to.throwError();
      });

    });

    describe('#renderer', () => {

      it('should be the renderer used by the widget', () => {
        let renderer = new OutputAreaWidget.Renderer();
        let widget = new OutputAreaWidget({ rendermime, renderer });
        expect(widget.renderer).to.be(renderer);
      });

      it('should be read-only', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(() => { widget.renderer = null; }).to.throwError();
      });

    });

    describe('#trusted', () => {

      it('should get the trusted state of the widget', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.trusted).to.be(false);
      });

      it('should set the trusted state of the widget', () => {
        let widget = new OutputAreaWidget({ rendermime });
        widget.trusted = true;
        expect(widget.trusted).to.be(true);
      });

    });

    describe('#collapsed', () => {

      it('should get the collapsed state of the widget', () => {
        let widget = createWidget();
        expect(widget.collapsed).to.be(false);
      });

      it('should set the collapsed state of the widget', () => {
        let widget = createWidget();
        widget.collapsed = true;
        expect(widget.collapsed).to.be(true);
      });

      it('should post an update request', (done) => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.collapsed = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#fixedHeight', () => {

      it('should get the fixed height state of the widget', () => {
        let widget = createWidget();
        expect(widget.fixedHeight).to.be(false);
      });

      it('should set the fixed height state of the widget', () => {
        let widget = createWidget();
        widget.fixedHeight = true;
        expect(widget.fixedHeight).to.be(true);
      });

      it('should post an update request', (done) => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.fixedHeight = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = createWidget();
        widget.dispose();
        expect(widget.model).to.be(null);
        expect(widget.rendermime).to.be(null);
        expect(widget.renderer).to.be(null);
      });

      it('should be safe to call more than once', () => {
        let widget = createWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#childAt()', () => {

      it('should get the child widget at the specified index', () => {
        let widget = createWidget();
        expect(widget.childAt(0)).to.be.a(Widget);
      });

    });

    describe('#childCount()', () => {

      it('should get the number of child widgets', () => {
        let widget = createWidget();
        expect(widget.childCount()).to.be(5);
        widget.model.clear();
        expect(widget.childCount()).to.be(0);
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should set the appropriate classes on the widget', (done) => {
        let widget = createWidget();
        widget.collapsed = true;
        widget.fixedHeight = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          expect(widget.hasClass('jp-mod-fixedHeight')).to.be(true);
          expect(widget.hasClass('jp-mod-collapsed')).to.be(true);
          done();
        });
      });

    });

    describe('#onChildAdded()', () => {

      it('should add the `jp-OutputArea-output` class', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.model = new OutputAreaModel();
        widget.model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).to.contain('onChildAdded');
        let child = widget.childAt(0);
        expect(child.hasClass('jp-OutputArea-output')).to.be(true);
      });

    });

    describe('#onChildRemoved()', () => {

      it('should dispose of the child widget', () => {
        let widget = createWidget();
        let child = widget.childAt(0);
        child.parent = null;
        expect(widget.methods).to.contain('onChildRemoved');
        expect(child.isDisposed).to.be(true);
      });

    });

    describe('#onModelChanged()', () => {

      it('should be called when the model changes', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.model = new OutputAreaModel();
        expect(widget.methods).to.contain('onModelChanged');
      });

      it('should not be called when the model does not change', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.model = new OutputAreaModel();
        widget.methods = [];
        widget.model = widget.model;
        expect(widget.methods).to.not.contain('onModelChanged');
      });

    });

    describe('#onTrustedChanged()', () => {

      it('should be called when the trusted state changes', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.trusted = true;
        expect(widget.methods).to.contain('onTrustedChanged');
      });

      it('should re-render the widgets', () => {
        let widget = createWidget();
        let child = widget.childAt(0);
        widget.trusted = true;
        expect(widget.methods).to.contain('onTrustedChanged');
        expect(child.isDisposed).to.be(true);
        expect(widget.childCount()).to.be(7);
      });

    });

    describe('#createOutput()', () => {

      it('should be called when an output is added to the model', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        let model = new OutputAreaModel();
        widget.model = model;
        model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).to.contain('createOutput');
      });

    });

    describe('#onModelChange()', () => {

      it('should add a new widget', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.model = new OutputAreaModel();
        widget.model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).to.contain('onModelChange');
        expect(widget.childCount()).to.be(1);
      });

      it('should clear the widgets', () => {
        let widget = createWidget();
        widget.methods = [];
        widget.model.clear();
        expect(widget.methods).to.contain('onModelChange');
        expect(widget.childCount()).to.be(0);
      });

    });

    describe('.convertBundle()', () => {

      it('should convert a mime bundle to a mime map', () => {

      });

    });

    describe('.Renderer', () => {

      describe('#getBundle()', () => {

      });

      describe('#sanitize()', () => {

      });

      describe('#createOutput()', () => {

      });

    });

    describe('.defaultRenderer', () => {

    });

  });

});
