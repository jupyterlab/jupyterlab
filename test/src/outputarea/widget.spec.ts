// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ClientSession
} from '@jupyterlab/apputils';

import {
  Kernel
} from '@jupyterlab/services';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  IOutputAreaModel, OutputAreaModel, OutputArea
} from '@jupyterlab/outputarea';

import {
  createClientSession, defaultRenderMime, DEFAULT_OUTPUTS
} from '../utils';


/**
 * The default rendermime instance to use for testing.
 */
const rendermime = defaultRenderMime();


class LogOutputArea extends OutputArea {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onModelChanged(sender: IOutputAreaModel, args: IOutputAreaModel.ChangedArgs) {
    super.onModelChanged(sender, args);
    this.methods.push('onModelChanged');
  }
}


describe('outputarea/widget', () => {

  let widget: LogOutputArea;
  let model: OutputAreaModel;

  beforeEach(() => {
    model = new OutputAreaModel({ values: DEFAULT_OUTPUTS, trusted: true });
    widget = new LogOutputArea({ rendermime, model });
  });

  afterEach(() => {
    model.dispose();
    widget.dispose();
  });

  describe('OutputArea', () => {

    describe('#constructor()', () => {

      it('should create an output area widget', () => {
        expect(widget).to.be.an(OutputArea);
        expect(widget.hasClass('jp-OutputArea')).to.be(true);
      });

      it('should take an optional contentFactory', () => {
        let contentFactory = Object.create(OutputArea.defaultContentFactory);
        let widget = new OutputArea({ rendermime, contentFactory, model });
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
        expect(widget.contentFactory).to.be(OutputArea.defaultContentFactory);
      });

    });

    describe('#widgets', () => {

      it('should get the child widget at the specified index', () => {
        expect(widget.widgets[0]).to.be.a(Widget);
      });

      it('should get the number of child widgets', () => {
        expect(widget.widgets.length).to.be(DEFAULT_OUTPUTS.length - 1);
        widget.model.clear();
        expect(widget.widgets.length).to.be(0);
      });

    });

    describe('#execute()', () => {

      let session: ClientSession;

      beforeEach(() => {
        return createClientSession().then(s => {
          session = s;
          return session.initialize();
        });
      });

      afterEach(() => {
        return session.shutdown().then(() => {
          session.dispose();
        });
      });

      it('should execute code on a kernel and send outputs to the model', () => {
        return session.kernel.ready.then(() => {
          return widget.execute('print("hello")', session).then(reply => {
            expect(reply.content.execution_count).to.be.ok();
            expect(reply.content.status).to.be('ok');
            expect(model.length).to.be(1);
          });
        });
      });

      it('should clear existing outputs', () => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        return widget.execute('print("hello")', session).then(reply => {
          expect(reply.content.execution_count).to.be.ok();
          expect(model.length).to.be(1);
        });
      });

    });

    describe('#onModelChanged()', () => {

      it('should handle an added output', () => {
        widget.model.clear();
        widget.methods = [];
        widget.model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).to.contain('onModelChanged');
        expect(widget.widgets.length).to.be(1);
      });

      it('should handle a clear', () => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        widget.methods = [];
        widget.model.clear();
        expect(widget.methods).to.contain('onModelChanged');
        expect(widget.widgets.length).to.be(0);
      });

      it('should handle a set', () => {
        widget.model.clear();
        widget.model.add(DEFAULT_OUTPUTS[0]);
        widget.methods = [];
        widget.model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).to.contain('onModelChanged');
        expect(widget.widgets.length).to.be(1);
      });

    });

    describe('.ContentFactory', () => {

      describe('#createOutputPrompt()', () => {

        it('should create an output prompt', () => {
          let factory = new OutputArea.ContentFactory();
          expect(factory.createOutputPrompt().executionCount).to.be(null);
        });

      });

      describe('#createStdin()', () => {

        it('should create a stdin widget', () => {
          return Kernel.startNew().then(kernel => {
            let factory = new OutputArea.ContentFactory();
            let options = {
              prompt: 'hello',
              password: false,
              kernel
            };
            expect(factory.createStdin(options)).to.be.a(Widget);
            return kernel.shutdown().then(() => { kernel.dispose(); });
          });
        });

      });

    });

    describe('.defaultContentFactory', () => {

      it('should be a `contentFactory` instance', () => {
        expect(OutputArea.defaultContentFactory).to.be.an(OutputArea.ContentFactory);
      });

    });

  });

});
