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
  OutputAreaModel, OutputAreaWidget
} from '../../../lib/outputarea';

import {
  defaultRenderMime, DEFAULT_OUTPUTS
} from '../utils';


/**
 * The default rendermime instance to use for testing.
 */
const rendermime = defaultRenderMime();
const model = new OutputAreaModel({ values: DEFAULT_OUTPUTS, trusted: true });


class LogOutputAreaWidget extends OutputAreaWidget {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}


describe('outputarea/widget', () => {

  let widget: OutputAreaWidget;

  beforeEach(() => {
    widget = new LogOutputAreaWidget({ rendermime, model });
  });

  describe('OutputAreaWidget', () => {

    describe('#constructor()', () => {

      it('should create an output area widget', () => {
        expect(widget).to.be.an(OutputAreaWidget);
        expect(widget.hasClass('jp-OutputAreaWidget')).to.be(true);
      });

      it('should take an optional contentFactory', () => {
        let contentFactory = Object.create(OutputAreaWidget.defaultContentFactory);
        widget = new OutputAreaWidget({ rendermime, contentFactory, model });
        expect(widget.contentFactory).to.be(contentFactory);
      });

    });

    describe('#model', () => {

      it('should be the model used by the widget', () => {
        expect(widget.model).to.be(model);
      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        expect(widget.rendermime).to.be(rendermime);
      });

    });

    describe('#contentFactory', () => {

      it('should be the contentFactory used by the widget', () => {
        expect(widget.contentFactory).to.be(OutputAreaWidget.defaultContentFactory);
      });

    });

    describe('#widgets', () => {

      it('should get the child widget at the specified index', () => {
        expect(widget.widgets.at(0)).to.be.a(Widget);
      });

      it('should get the number of child widgets', () => {
        expect(widget.widgets.length).to.be(DEFAULT_OUTPUTS.length);
        widget.model.clear();
        expect(widget.widgets.length).to.be(0);
      });

    });

    describe('#collapsed', () => {

      it('should get the collapsed state of the widget', () => {
        expect(widget.collapsed).to.be(false);
      });

      it('should set the collapsed state of the widget', () => {
        widget.collapsed = true;
        expect(widget.collapsed).to.be(true);
      });

      it('should post an update request', (done) => {
        widget.collapsed = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#fixedHeight', () => {

      it('should get the fixed height state of the widget', () => {
        expect(widget.fixedHeight).to.be(false);
      });

      it('should set the fixed height state of the widget', () => {
        widget.fixedHeight = true;
        expect(widget.fixedHeight).to.be(true);
      });

      it('should post an update request', (done) => {
        widget.fixedHeight = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#clear()', () => {

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

});
