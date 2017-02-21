// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel
} from '@jupyterlab/services';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgetwidget';

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


class LogOutputAreaWidget extends OutputAreaWidget {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}


describe('outputarea/widget', () => {

  let widget: LogOutputAreaWidget;
  let model: OutputAreaModel;

  beforeEach(() => {
    model = new OutputAreaModel({ values: DEFAULT_OUTPUTS, trusted: true });
    widget = new LogOutputAreaWidget({ rendermime, model });
  });

  afterEach(() => {
    model.dispose();
    widget.dispose();
  });

  describe('OutputAreaWidget', () => {

    describe('#constructor()', () => {

      it('should create an output area widget', () => {
        expect(widget).to.be.an(OutputAreaWidget);
        expect(widget.hasClass('jp-OutputAreaWidget')).to.be(true);
      });

      it('should take an optional contentFactory', () => {
        let contentFactory = Object.create(OutputAreaWidget.defaultContentFactory);
        let widget = new OutputAreaWidget({ rendermime, contentFactory, model });
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
        expect(widget.widgets.length).to.be(DEFAULT_OUTPUTS.length - 1);
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
        widget.execute('print("hello")', kernel).then(reply => {
          expect(reply.content.execution_count).to.be(1);
          expect(reply.content.status).to.be('ok');
          expect(model.length).to.be(1);
          kernel.shutdown();
          done();
        }).catch(done);
      });

      it('should clear existing outputs', (done) => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        return widget.execute('print("hello")', kernel).then(reply => {
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

      describe('#createGutter()', () => {

        it('should create a gutter widget', () => {
          let factory = new OutputAreaWidget.ContentFactory();
          expect(factory.createGutter().executionCount).to.be(null);
        });

      });

      describe('#createStdin()', () => {

        it('should create a stdin widget', (done) => {
          Kernel.startNew().then(kernel => {
            let factory = new OutputAreaWidget.ContentFactory();
            let options = {
              prompt: 'hello',
              password: false,
              kernel
            };
            expect(factory.createStdin(options)).to.be.a(Widget);
            kernel.dispose();
          }).then(done, done);
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
