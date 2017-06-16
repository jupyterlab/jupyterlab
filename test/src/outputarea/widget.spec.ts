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

const CODE = 'print("hello")';


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

    describe('#future', () => {

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
          let future = session.kernel.requestExecute({ code: CODE });
          widget.future = future;
          return future.done;
        }).then(reply => {
          expect(reply.content.execution_count).to.be.ok();
          expect(reply.content.status).to.be('ok');
          expect(model.length).to.be(1);
        });
      });

      it('should clear existing outputs', () => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        return session.kernel.ready.then(() => {
          let future = session.kernel.requestExecute({ code: CODE });
          widget.future = future;
          return future.done;
        }).then(reply => {
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

    describe('.execute()', () => {

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
          return OutputArea.execute(CODE, widget, session).then(reply => {
            expect(reply.content.execution_count).to.be.ok();
            expect(reply.content.status).to.be('ok');
            expect(model.length).to.be(1);
          });
        });
      });

      it('should clear existing outputs', () => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        return OutputArea.execute(CODE, widget, session).then(reply => {
          expect(reply.content.execution_count).to.be.ok();
          expect(model.length).to.be(1);
        });
      });

      it('should handle routing of display messages', () => {
        let model0 = new OutputAreaModel({ trusted: true });
        let widget0 = new LogOutputArea({ rendermime, model: model0 });
        let model1 = new OutputAreaModel({ trusted: true });
        let widget1 = new LogOutputArea({ rendermime, model: model1 });
        let model2 = new OutputAreaModel({ trusted: true });
        let widget2 = new LogOutputArea({ rendermime, model: model2 });

        let code0 = [
          'ip = get_ipython()',
          'from IPython.display import display',
          'def display_with_id(obj, display_id, update=False):',
          '  iopub = ip.kernel.iopub_socket',
          '  session = get_ipython().kernel.session',
          '  data, md = ip.display_formatter.format(obj)',
          '  transient = {"display_id": display_id}',
          '  content = {"data": data, "metadata": md, "transient": transient}',
          '  msg_type = "update_display_data" if update else "display_data"',
          '  session.send(iopub, msg_type, content, parent=ip.parent_header)',
        ].join('\n');
        let code1 = [
          'display("above")',
          'display_with_id(1, "here")',
          'display("below")',
        ].join('\n');
        let code2 = [
          'display_with_id(2, "here")',
          'display_with_id(3, "there")',
          'display_with_id(4, "here")',
        ].join('\n');
        let promise0 = OutputArea.execute(code0, widget0, session);
        let promise1 = OutputArea.execute(code1, widget1, session);
        return Promise.all([promise0, promise1]).then(() => {
          expect(model1.length).to.be(3);
          expect(model1.toJSON()[1].data).to.eql({ 'text/plain': '1' });
          return OutputArea.execute(code2, widget2, session);
        }).then(() => {
          expect(model1.length).to.be(3);
          expect(model1.toJSON()[1].data).to.eql({ 'text/plain': '4' });
          expect(model2.length).to.be(3);
          let outputs = model2.toJSON();
          expect(outputs[0].data).to.eql({ 'text/plain': '4' });
          expect(outputs[1].data).to.eql({ 'text/plain': '3' });
          expect(outputs[2].data).to.eql({ 'text/plain': '4' });
        });
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
            let future = kernel.requestExecute({ code: CODE });
            let options = {
              prompt: 'hello',
              password: false,
              future
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
