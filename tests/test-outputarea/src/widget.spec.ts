// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ClientSession } from '@jupyterlab/apputils';

import { Kernel } from '@jupyterlab/services';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import {
  IOutputAreaModel,
  OutputAreaModel,
  OutputArea
} from '@jupyterlab/outputarea';

import {
  createClientSession,
  defaultRenderMime,
  NBTestUtils
} from '@jupyterlab/testutils';

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

  protected onModelChanged(
    sender: IOutputAreaModel,
    args: IOutputAreaModel.ChangedArgs
  ) {
    super.onModelChanged(sender, args);
    this.methods.push('onModelChanged');
  }
}

describe('outputarea/widget', () => {
  let widget: LogOutputArea;
  let model: OutputAreaModel;

  beforeEach(() => {
    model = new OutputAreaModel({
      values: NBTestUtils.DEFAULT_OUTPUTS,
      trusted: true
    });
    widget = new LogOutputArea({ rendermime, model });
  });

  afterEach(() => {
    model.dispose();
    widget.dispose();
  });

  describe('OutputArea', () => {
    describe('#constructor()', () => {
      it('should create an output area widget', () => {
        expect(widget).to.be.an.instanceof(OutputArea);
        expect(widget.hasClass('jp-OutputArea')).to.equal(true);
      });

      it('should take an optional contentFactory', () => {
        const contentFactory = Object.create(OutputArea.defaultContentFactory);
        const widget = new OutputArea({ rendermime, contentFactory, model });
        expect(widget.contentFactory).to.equal(contentFactory);
      });
    });

    describe('#model', () => {
      it('should be the model used by the widget', () => {
        expect(widget.model).to.equal(model);
      });
    });

    describe('#rendermime', () => {
      it('should be the rendermime instance used by the widget', () => {
        expect(widget.rendermime).to.equal(rendermime);
      });
    });

    describe('#contentFactory', () => {
      it('should be the contentFactory used by the widget', () => {
        expect(widget.contentFactory).to.equal(
          OutputArea.defaultContentFactory
        );
      });
    });

    describe('#widgets', () => {
      it('should get the child widget at the specified index', () => {
        expect(widget.widgets[0]).to.be.an.instanceof(Widget);
      });

      it('should get the number of child widgets', () => {
        expect(widget.widgets.length).to.equal(
          NBTestUtils.DEFAULT_OUTPUTS.length - 1
        );
        widget.model.clear();
        expect(widget.widgets.length).to.equal(0);
      });
    });

    describe('#future', () => {
      let session: ClientSession;

      beforeEach(async () => {
        session = await createClientSession();
        await session.initialize();
      });

      afterEach(async () => {
        await session.shutdown();
        session.dispose();
      });

      it('should execute code on a kernel and send outputs to the model', async () => {
        await session.kernel.ready;
        const future = session.kernel.requestExecute({ code: CODE });
        widget.future = future;
        const reply = await future.done;
        expect(reply.content.execution_count).to.be.ok;
        expect(reply.content.status).to.equal('ok');
        expect(model.length).to.equal(1);
      });

      it('should clear existing outputs', async () => {
        widget.model.fromJSON(NBTestUtils.DEFAULT_OUTPUTS);
        await session.kernel.ready;
        const future = session.kernel.requestExecute({ code: CODE });
        widget.future = future;
        const reply = await future.done;
        expect(reply.content.execution_count).to.be.ok;
        expect(model.length).to.equal(1);
      });
    });

    describe('#onModelChanged()', () => {
      it('should handle an added output', () => {
        widget.model.clear();
        widget.methods = [];
        widget.model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(widget.methods).to.contain('onModelChanged');
        expect(widget.widgets.length).to.equal(1);
      });

      it('should handle a clear', () => {
        widget.model.fromJSON(NBTestUtils.DEFAULT_OUTPUTS);
        widget.methods = [];
        widget.model.clear();
        expect(widget.methods).to.contain('onModelChanged');
        expect(widget.widgets.length).to.equal(0);
      });

      it('should handle a set', () => {
        widget.model.clear();
        widget.model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        widget.methods = [];
        widget.model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(widget.methods).to.contain('onModelChanged');
        expect(widget.widgets.length).to.equal(1);
      });
    });

    describe('.execute()', () => {
      let session: ClientSession;

      beforeEach(async () => {
        session = await createClientSession();
        await session.initialize();
      });

      afterEach(async () => {
        await session.shutdown();
        session.dispose();
      });

      it('should execute code on a kernel and send outputs to the model', async () => {
        await session.kernel.ready;
        const reply = await OutputArea.execute(CODE, widget, session);
        expect(reply.content.execution_count).to.be.ok;
        expect(reply.content.status).to.equal('ok');
        expect(model.length).to.equal(1);
      });

      it('should clear existing outputs', async () => {
        widget.model.fromJSON(NBTestUtils.DEFAULT_OUTPUTS);
        const reply = await OutputArea.execute(CODE, widget, session);
        expect(reply.content.execution_count).to.be.ok;
        expect(model.length).to.equal(1);
      });

      it('should handle routing of display messages', async () => {
        const model0 = new OutputAreaModel({ trusted: true });
        const widget0 = new LogOutputArea({ rendermime, model: model0 });
        const model1 = new OutputAreaModel({ trusted: true });
        const widget1 = new LogOutputArea({ rendermime, model: model1 });
        const model2 = new OutputAreaModel({ trusted: true });
        const widget2 = new LogOutputArea({ rendermime, model: model2 });

        const code0 = [
          'ip = get_ipython()',
          'from IPython.display import display',
          'def display_with_id(obj, display_id, update=False):',
          '  iopub = ip.kernel.iopub_socket',
          '  session = get_ipython().kernel.session',
          '  data, md = ip.display_formatter.format(obj)',
          '  transient = {"display_id": display_id}',
          '  content = {"data": data, "metadata": md, "transient": transient}',
          '  msg_type = "update_display_data" if update else "display_data"',
          '  session.send(iopub, msg_type, content, parent=ip.parent_header)'
        ].join('\n');
        const code1 = [
          'display("above")',
          'display_with_id(1, "here")',
          'display("below")'
        ].join('\n');
        const code2 = [
          'display_with_id(2, "here")',
          'display_with_id(3, "there")',
          'display_with_id(4, "here")'
        ].join('\n');

        let ipySession: ClientSession;
        ipySession = await createClientSession({
          kernelPreference: { name: 'ipython' }
        });
        await ipySession.initialize();
        const promise0 = OutputArea.execute(code0, widget0, ipySession);
        const promise1 = OutputArea.execute(code1, widget1, ipySession);
        await Promise.all([promise0, promise1]);
        expect(model1.length).to.equal(3);
        expect(model1.toJSON()[1].data).to.deep.equal({ 'text/plain': '1' });
        await OutputArea.execute(code2, widget2, ipySession);

        expect(model1.length).to.equal(3);
        expect(model1.toJSON()[1].data).to.deep.equal({ 'text/plain': '4' });
        expect(model2.length).to.equal(3);
        const outputs = model2.toJSON();
        expect(outputs[0].data).to.deep.equal({ 'text/plain': '4' });
        expect(outputs[1].data).to.deep.equal({ 'text/plain': '3' });
        expect(outputs[2].data).to.deep.equal({ 'text/plain': '4' });
        await ipySession.shutdown();
      });
    });

    describe('.ContentFactory', () => {
      describe('#createOutputPrompt()', () => {
        it('should create an output prompt', () => {
          const factory = new OutputArea.ContentFactory();
          expect(factory.createOutputPrompt().executionCount).to.be.null;
        });
      });

      describe('#createStdin()', () => {
        it('should create a stdin widget', async () => {
          const kernel = await Kernel.startNew();
          const factory = new OutputArea.ContentFactory();
          const future = kernel.requestExecute({ code: CODE });
          const options = {
            prompt: 'hello',
            password: false,
            future
          };
          expect(factory.createStdin(options)).to.be.an.instanceof(Widget);
          await kernel.shutdown();
          kernel.dispose();
        });
      });
    });

    describe('.defaultContentFactory', () => {
      it('should be a `contentFactory` instance', () => {
        expect(OutputArea.defaultContentFactory).to.be.an.instanceof(
          OutputArea.ContentFactory
        );
      });
    });
  });
});
