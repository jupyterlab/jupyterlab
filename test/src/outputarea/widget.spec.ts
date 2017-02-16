// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  OutputAreaModel, OutputAreaWidget, OutputWidget
} from '../../../lib/outputarea';

import {
  defaultRenderMime
} from '../utils';

import {
  DEFAULT_OUTPUTS
} from './model.spec';


/**
 * The default rendermime instance to use for testing.
 */
const rendermime = defaultRenderMime();
const contentFactory = OutputAreaWidget.defaultContentFactory;
const model = new OutputAreaModel({ trusted: true });
const OPTIONS = { rendermime, contentFactory, model };


class LogOutputAreaWidget extends OutputAreaWidget {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}


function createWidget(): LogOutputAreaWidget {
  let widget = new LogOutputAreaWidget(OPTIONS);
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
        let widget = new OutputAreaWidget(OPTIONS);
        expect(widget).to.be.an(OutputAreaWidget);
      });

      it('should take an optional contentFactory', () => {
        let contentFactory = Object.create(OutputAreaWidget.defaultContentFactory);
        let widget = new OutputAreaWidget({ rendermime, contentFactory });
        expect(widget.contentFactory).to.be(contentFactory);
      });

      it('should add the `jp-OutputArea` class', () => {
        let widget = new OutputAreaWidget(OPTIONS);
        expect(widget.hasClass('jp-OutputArea')).to.be(true);
      });

    });

    describe('#modelChanged', () => {

      it('should be emitted when the model of the widget changes', () => {
        let widget = new OutputAreaWidget(OPTIONS);
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
        let widget = new OutputAreaWidget(OPTIONS);
        expect(widget.model).to.be(null);
      });

      it('should set the model', () => {
        let widget = new OutputAreaWidget(OPTIONS);
        let model = new OutputAreaModel();
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should emit `modelChanged` when the model changes', () => {
        let widget = new OutputAreaWidget(OPTIONS);
        let called = false;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = new OutputAreaModel();
        expect(called).to.be(true);
      });

      it('should not emit `modelChanged` when the model does not change', () => {
        let widget = new OutputAreaWidget(OPTIONS);
        let called = false;
        let model = new OutputAreaModel();
        widget.model = model;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = model;
        expect(called).to.be(false);
      });

      it('should create widgets for the model items', () => {
        let widget = createWidget();
        expect(widget.widgets.length).to.be(5);
      });

      context('model `changed` signal', () => {

        it('should dispose of the child widget when an output is removed', () => {
          let widget = createWidget();
          let child = widget.widgets.at(0);
          widget.model.clear();
          expect(child.isDisposed).to.be(true);
        });

      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let widget = new OutputAreaWidget(OPTIONS);
        expect(widget.rendermime).to.be(rendermime);
      });

    });

    describe('#contentFactory', () => {

      it('should be the contentFactory used by the widget', () => {
        let contentFactory = new OutputAreaWidget.ContentFactory();
        let widget = new OutputAreaWidget({ rendermime, contentFactory });
        expect(widget.contentFactory).to.be(contentFactory);
      });

    });

    describe('#trusted', () => {

      it('should get the trusted state of the widget', () => {
        let widget = new OutputAreaWidget(OPTIONS);
        expect(widget.trusted).to.be(false);
      });

      it('should set the trusted state of the widget', () => {
        let widget = new OutputAreaWidget(OPTIONS);
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
        let widget = new LogOutputAreaWidget(OPTIONS);
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
        let widget = new LogOutputAreaWidget(OPTIONS);
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
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        let widget = createWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#widgets', () => {

      it('should get the child widget at the specified index', () => {
        let widget = createWidget();
        expect(widget.widgets.at(0)).to.be.a(Widget);
      });

      it('should get the number of child widgets', () => {
        let widget = createWidget();
        expect(widget.widgets.length).to.be(5);
        widget.model.clear();
        expect(widget.widgets.length).to.be(0);
      });

    });


    describe('#execute()', () => {

      let kernel: Kernel.IKernel;

      beforeEach((done) => {
        Kernel.startNew().then(k => {
          kernel = k;
          return kernel.ready;
        }).then(() => {
          done();
        }).catch(done);
      });

      it('should execute code on a kernel and send outputs to the model', (done) => {
        let model = new OutputAreaModel();
        expect(model.length).to.be(0);
        model.execute('print("hello")', kernel).then(reply => {
          expect(reply.content.execution_count).to.be(1);
          expect(reply.content.status).to.be('ok');
          expect(model.length).to.be(1);
          kernel.shutdown();
          done();
        }).catch(done);
      });

      it('should clear existing outputs', (done) => {
        let model = new OutputAreaModel();
        for (let output of DEFAULT_OUTPUTS) {
          model.add(output);
        }
        return model.execute('print("hello")', kernel).then(reply => {
          expect(reply.content.execution_count).to.be(1);
          expect(model.length).to.be(1);
          kernel.shutdown();
          done();
        }).catch(done);
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
        let widget = new LogOutputAreaWidget(OPTIONS);
        widget.model = new OutputAreaModel();
        expect(widget.methods).to.contain('onModelChanged');
      });

      it('should not be called when the model does not change', () => {
        let widget = new LogOutputAreaWidget(OPTIONS);
        widget.model = new OutputAreaModel();
        widget.methods = [];
        widget.model = widget.model;
        expect(widget.methods).to.not.contain('onModelChanged');
      });

    });

    describe('.contentFactory', () => {

      describe('#createOutput()', () => {

        it('should create a on output widget', () => {
          let contentFactory = new OutputAreaWidget.ContentFactory();
          let widget = contentFactory.createOutput(OPTIONS);
          expect(widget).to.be.an(OutputWidget);
        });

      });

    });

    describe('.defaultContentFactory', () => {

      it('should be a `contentFactory` instance', () => {
        expect(OutputAreaWidget.defaultContentFactory).to.be.an(OutputAreaWidget.ContentFactory);
      });

    });

  });

  describe('OutputWidget', () => {

    describe('#constructor()', () => {

      it('should accept a rendermime instance', () => {
        let widget = new OutputWidget(OPTIONS);
        expect(widget).to.be.an(OutputWidget);
      });

      it('should add the `jp-OutputArea-output` class', () => {
        let widget = new OutputWidget(OPTIONS);
        expect(widget.hasClass('jp-Output')).to.be(true);
      });

    });

    describe('#prompt', () => {

      it('should get the prompt widget used by the output widget', () => {
        let widget = new OutputWidget(OPTIONS);
        expect(widget.prompt.hasClass('jp-Output-prompt')).to.be(true);
      });

    });

    describe('#output', () => {

      it('should get the rendered output used by the output widget', () => {
        let widget = new OutputWidget(OPTIONS);
        expect(widget.output.hasClass('jp-Output-result')).to.be(true);
      });

    });

    describe('#clear()', () => {

      it('should clear the current output', () => {
        let widget = new OutputWidget(OPTIONS);
        widget.render({ output: DEFAULT_OUTPUTS[0], trusted: true });
        let output = widget.output;
        widget.clear();
        expect(widget.output).to.not.be(output);
        expect(widget.output).to.be.a(Widget);
      });

    });

    describe('#render()', () => {

      it('should handle all bundle types when trusted', () => {
        let widget = new OutputWidget(OPTIONS);
        for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
          let output = DEFAULT_OUTPUTS[i];
          widget.render({ output, trusted: true });
        }
      });

      it('should handle all bundle types when not trusted', () => {
        let widget = new OutputWidget(OPTIONS);
        for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
          let output = DEFAULT_OUTPUTS[i];
          widget.render({ output, trusted: false });
        }
      });

    });

    describe('#setOutput()', () => {

      it('should set the rendered output widget used by the output widget', () => {
        let widget = new CustomOutputWidget(OPTIONS);
        let child = new Widget();
        widget.setOutput(child);
        expect(widget.output).to.be(child);
      });

      it('should default to a placeholder if set to `null`', () => {
        let widget = new CustomOutputWidget(OPTIONS);
        widget.setOutput(null);
        expect(widget.output).to.be.a(Widget);
      });

    });

  });

});
