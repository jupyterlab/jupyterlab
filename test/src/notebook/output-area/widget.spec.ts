// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from 'phosphor-messaging';

import {
  ChildMessage, Widget
} from 'phosphor-widget';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  OutputAreaModel, OutputAreaWidget, OutputWidget
} from '../../../../lib/notebook/output-area';

import {
  RenderMime
} from '../../../../lib/rendermime';

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
}


class CustomOutputWidget extends OutputWidget {

  setOutput(value: Widget): void {
    super.setOutput(value);
  }

  getBundle(output: nbformat.IOutput): nbformat.MimeBundle {
    return super.getBundle(output);
  }

  convertBundle(bundle: nbformat.MimeBundle): RenderMime.MimeMap<string> {
    return super.convertBundle(bundle);
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

      context('model `changed` signal', () => {

        it('should dispose of the child widget when an output is removed', () => {
          let widget = createWidget();
          let child = widget.childAt(0);
          widget.model.clear();
          expect(child.isDisposed).to.be(true);
        });

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

    describe('.Renderer', () => {

      describe('#createOutput()', () => {

        it('should create a on output widget', () => {
          let renderer = new OutputAreaWidget.Renderer();
          let widget = renderer.createOutput({ rendermime });
          expect(widget).to.be.an(OutputWidget);
        });

      });

    });

    describe('.defaultRenderer', () => {

      it('should be a `Renderer` instance', () => {
        expect(OutputAreaWidget.defaultRenderer).to.be.an(OutputAreaWidget.Renderer);
      });

    });

  });

  describe('OutputWidget', () => {

    describe('#constructor()', () => {

      it('should accept a rendermime instance', () => {
        let widget = new OutputWidget({ rendermime });
        expect(widget).to.be.an(OutputWidget);
      });

      it('should add the `jp-OutputArea-output` class', () => {
        let widget = new OutputWidget({ rendermime });
        expect(widget.hasClass('jp-Output')).to.be(true);
      });

    });

    describe('#prompt', () => {

      it('should get the prompt widget used by the output widget', () => {
        let widget = new OutputWidget({ rendermime });
        expect(widget.prompt.hasClass('jp-Output-prompt')).to.be(true);
      });

      it('should be read-only', () => {
        let widget = new OutputWidget({ rendermime });
        expect(() => { widget.prompt = null; }).to.throwError();
      });

    });

    describe('#output', () => {

      it('should get the rendered output used by the output widget', () => {
        let widget = new OutputWidget({ rendermime });
        expect(widget.output.hasClass('jp-Output-result')).to.be(true);
      });

      it('should be read-only', () => {
        let widget = new OutputWidget({ rendermime });
        expect(() => { widget.output = null; }).to.throwError();
      });

    });

    describe('#clear()', () => {

      it('should clear the current output', (done) => {
        let widget = new OutputWidget({ rendermime });
        widget.render(DEFAULT_OUTPUTS[0], true).then(() => {
          let output = widget.output;
          widget.clear();
          expect(widget.output).to.not.be(output);
          expect(widget.output).to.be.a(Widget);
        }).then(done, done);
      });

    });

    describe('#render()', () => {

      it('should handle all bundle types when trusted', () => {
        let widget = new OutputWidget({ rendermime });
        for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
          let output = DEFAULT_OUTPUTS[i];
          widget.render(output, true);
        }
      });

      it('should handle all bundle types when not trusted', () => {
        let widget = new OutputWidget({ rendermime });
        for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
          let output = DEFAULT_OUTPUTS[i];
          widget.render(output, false);
        }
      });

    });

    describe('#setOutput()', () => {

      it('should set the rendered output widget used by the output widget', () => {
        let widget = new CustomOutputWidget({ rendermime });
        let child = new Widget();
        widget.setOutput(child);
        expect(widget.output).to.be(child);
      });

      it('should default to a placeholder if set to `null`', () => {
        let widget = new CustomOutputWidget({ rendermime });
        widget.setOutput(null);
        expect(widget.output).to.be.a(Widget);
      });

    });

    describe('#getBundle()', () => {

      it('should handle all bundle types', () => {
        let widget = new CustomOutputWidget({ rendermime });
        for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
          let output = DEFAULT_OUTPUTS[i];
          let bundle = widget.getBundle(output);
          expect(Object.keys(bundle).length).to.not.be(0);
        }
      });

    });

    describe('#convertBundle()', () => {

      it('should handle bundles with strings', () => {
        let bundle: nbformat.MimeBundle = {
          'text/plain': 'foo'
        };
        let widget = new CustomOutputWidget({ rendermime });
        let map = widget.convertBundle(bundle);
        expect(map).to.eql(bundle);
      });

      it('should handle bundles with string arrays', () => {
        let bundle: nbformat.MimeBundle = {
          'text/plain': ['foo', 'bar']
        };
        let widget = new CustomOutputWidget({ rendermime });
        let map = widget.convertBundle(bundle);
        expect(map).to.eql({ 'text/plain': 'foo\nbar' });
      });

    });

  });

});
