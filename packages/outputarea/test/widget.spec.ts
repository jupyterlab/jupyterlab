// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SessionContext } from '@jupyterlab/apputils';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import {
  IOutputAreaModel,
  OutputArea,
  OutputAreaModel,
  SimplifiedOutputArea,
  Stdin
} from '@jupyterlab/outputarea';
import { Kernel, KernelManager } from '@jupyterlab/services';
import { JupyterServer, signalToPromise } from '@jupyterlab/testing';
import {
  DEFAULT_OUTPUTS,
  defaultRenderMime
} from '@jupyterlab/rendermime/lib/testutils';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';

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
  let server: JupyterServer;

  jest.retryTimes(3);

  beforeAll(async () => {
    server = new JupyterServer();
    await server.start();
  }, 30000);

  afterAll(async () => {
    await server.shutdown();
  });

  let widget: LogOutputArea;
  let model: OutputAreaModel;

  beforeEach(() => {
    model = new OutputAreaModel({
      values: DEFAULT_OUTPUTS,
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
        expect(widget).toBeInstanceOf(OutputArea);
        expect(widget.hasClass('jp-OutputArea')).toBe(true);
      });

      it('should take an optional contentFactory', () => {
        const contentFactory = Object.create(OutputArea.defaultContentFactory);
        const widget = new OutputArea({ rendermime, contentFactory, model });
        expect(widget.contentFactory).toBe(contentFactory);
      });
    });

    describe('#model', () => {
      it('should be the model used by the widget', () => {
        expect(widget.model).toBe(model);
      });
    });

    describe('#rendermime', () => {
      it('should be the rendermime instance used by the widget', () => {
        expect(widget.rendermime).toBe(rendermime);
      });
    });

    describe('#contentFactory', () => {
      it('should be the contentFactory used by the widget', () => {
        expect(widget.contentFactory).toBe(OutputArea.defaultContentFactory);
      });
    });

    describe('#maxNumberOutputs', () => {
      test.each([20, 6, 5, 2])(
        'should control the list of visible outputs',
        maxNumberOutputs => {
          const widget = new OutputArea({
            rendermime,
            model,
            maxNumberOutputs
          });

          expect(widget.widgets.length).toBeLessThanOrEqual(
            maxNumberOutputs + 1
          );

          if (widget.widgets.length > maxNumberOutputs) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(
              widget.widgets[widget.widgets.length - 1].node.textContent
            ).toContain('Show more outputs');
          } else {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(
              widget.widgets[widget.widgets.length - 1].node.textContent
            ).not.toContain('Show more outputs');
          }
        }
      );

      test('should display all widgets when clicked', () => {
        const widget = new OutputArea({
          rendermime,
          model,
          maxNumberOutputs: 2
        });

        expect(widget.widgets.length).toBeLessThan(model.length);
        Widget.attach(widget, document.body);
        simulate(
          widget.widgets[widget.widgets.length - 1].node.querySelector('a')!,
          'click'
        );
        Widget.detach(widget);

        expect(widget.widgets.length).toEqual(model.length);
      });

      test('should display new widgets if increased', () => {
        const widget = new OutputArea({
          rendermime,
          model,
          maxNumberOutputs: 2
        });
        expect(widget.widgets.length).toBeLessThan(model.length);

        widget.maxNumberOutputs += 1;

        expect(widget.widgets.length).toEqual(widget.maxNumberOutputs + 1);
        expect(widget.widgets.length).toBeLessThan(model.length);
      });

      test('should not change displayed widgets if reduced', () => {
        const widget = new OutputArea({
          rendermime,
          model,
          maxNumberOutputs: 2
        });
        expect(widget.widgets.length).toBeLessThan(model.length);

        widget.maxNumberOutputs -= 1;

        expect(widget.widgets.length).toBeGreaterThan(
          widget.maxNumberOutputs + 1
        );
        expect(widget.widgets.length).toBeLessThan(model.length);
      });
    });

    describe('#widgets', () => {
      it('should get the child widget at the specified index', () => {
        expect(widget.widgets[0]).toBeInstanceOf(Widget);
      });

      it('should get the number of child widgets', () => {
        expect(widget.widgets.length).toBe(DEFAULT_OUTPUTS.length - 1);
        widget.model.clear();
        expect(widget.widgets.length).toBe(0);
      });
    });

    describe('#pendingInput', () => {
      let kernel: Kernel.IKernelConnection;

      beforeEach(async () => {
        const manager = new KernelManager();
        kernel = await manager.startNew({ name: 'ipython' });
      });

      afterEach(async () => {
        await kernel.shutdown();
      });

      it('should default to `false`', () => {
        expect(widget.pendingInput).toBe(false);
      });

      it('should be `true` when pending user input', async () => {
        // Prompt kernel to request input and wait until it is requested
        const future = kernel.requestExecute({ code: 'input()' });
        const inputRequested = signalToPromise(widget.inputRequested);
        widget.future = future;
        const input = (await inputRequested)[1];

        // Input is now pending
        expect(widget.pendingInput).toBe(true);

        // Submit input
        (input as Stdin).handleEvent(
          new KeyboardEvent('keydown', { key: 'Enter' })
        );
        await future.done;

        // Input should no longer be flagged as pending.
        expect(widget.pendingInput).toBe(false);
      });

      it('should reset to `false` when kernel gets shut down', async () => {
        const future = kernel.requestExecute({ code: 'input()' });
        const inputRequested = signalToPromise(widget.inputRequested);
        widget.future = future;
        await inputRequested;
        await kernel.shutdown();
        expect(widget.pendingInput).toBe(false);
      });

      it('should reset to `false` when kernel restarts', async () => {
        const future = kernel.requestExecute({ code: 'input()' });
        const inputRequested = signalToPromise(widget.inputRequested);
        widget.future = future;
        await inputRequested;
        await kernel.restart();
        expect(widget.pendingInput).toBe(false);
      });

      it('should reset to `false` when kernel cancels input after getting interrupted', async () => {
        // This test requires an ipython kernel because the default echo kernel
        // does not actually do anything on getting interrupted.
        const future = kernel.requestExecute({ code: 'input()' });
        const inputRequested = signalToPromise(widget.inputRequested);
        widget.future = future;
        await inputRequested;
        // Need to wait for status change because futures are not disposed on
        // interrupt (differently to shutdown and restart).
        const statusChanged = signalToPromise(kernel.statusChanged);
        await kernel.interrupt();
        await statusChanged;
        expect(widget.pendingInput).toBe(false);
      });
    });

    describe('#future', () => {
      let sessionContext: SessionContext;

      beforeEach(async () => {
        sessionContext = await createSessionContext();
        await sessionContext.initialize();
        await sessionContext.session?.kernel?.info;
      });

      afterEach(async () => {
        await sessionContext.shutdown();
        sessionContext.dispose();
      });

      it('should execute code on a kernel and send outputs to the model', async () => {
        const future = sessionContext.session!.kernel!.requestExecute({
          code: CODE
        });
        widget.future = future;
        const reply = await future.done;
        expect(reply!.content.execution_count).toBeTruthy();
        expect(reply!.content.status).toBe('ok');
        expect(model.length).toBe(1);
      });

      it('should clear existing outputs', async () => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        const future = sessionContext.session!.kernel!.requestExecute({
          code: CODE
        });
        widget.future = future;
        const reply = await future.done;
        expect(reply!.content.execution_count).toBeTruthy();
        expect(model.length).toBe(1);
      });
    });

    describe('#onModelChanged()', () => {
      it('should handle an added output', () => {
        widget.model.clear();
        widget.methods = [];
        widget.model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onModelChanged'])
        );
        expect(widget.widgets.length).toBe(1);
      });

      it('should handle a clear', () => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        widget.methods = [];
        widget.model.clear();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onModelChanged'])
        );
        expect(widget.widgets.length).toBe(0);
      });

      it('should follow changes to initial stdout stream', () => {
        model = new OutputAreaModel({
          values: [DEFAULT_OUTPUTS[0]],
          trusted: true
        });
        widget = new LogOutputArea({ rendermime, model });
        // A stream output appended to the model should be seen in the widget.
        const streamOutput = 'nctvjd745fdk56';
        expect(widget.node.innerHTML).not.toContain(streamOutput);
        widget.model.appendStreamOutput(streamOutput);
        expect(widget.node.innerHTML).toContain(streamOutput);
      });

      it('should handle stream outputs of same name', () => {
        widget.model.clear();
        // An initial stdout stream creates an output.
        widget.model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onModelChanged'])
        );
        // Another stdout stream only changes the "text" of the last output.
        widget.methods = [];
        widget.model.add(DEFAULT_OUTPUTS[0]);
        expect(widget.methods).toEqual([]);
        // A stderr stream creates a new output.
        widget.methods = [];
        widget.model.add(DEFAULT_OUTPUTS[1]);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onModelChanged'])
        );
        // Another stderr stream only changes the "text" of the last output.
        widget.methods = [];
        widget.model.add(DEFAULT_OUTPUTS[1]);
        expect(widget.methods).toEqual([]);
        expect(widget.widgets.length).toBe(2);
      });

      it('should rerender when preferred mimetype changes', () => {
        // Add output with both safe and unsafe types
        widget.model.clear();
        widget.model.add({
          output_type: 'display_data',
          data: {
            'image/svg+xml':
              '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"></svg>',
            'text/plain': 'hello, world'
          },
          metadata: {}
        });
        expect(widget.node.innerHTML).toContain('<img src="data:image/svg+xml');
        widget.model.trusted = !widget.model.trusted;
        expect(widget.node.innerHTML).toEqual(
          expect.not.arrayContaining(['<img src="data:image/svg+xml'])
        );
        widget.model.trusted = !widget.model.trusted;
        expect(widget.node.innerHTML).toContain('<img src="data:image/svg+xml');
      });

      it('should rerender when isolation changes', () => {
        // Add output with both safe and unsafe types
        widget.model.clear();
        widget.model.add({
          output_type: 'display_data',
          data: {
            'text/plain': 'hello, world'
          }
        });
        expect(widget.node.innerHTML).toEqual(
          expect.not.arrayContaining(['<iframe'])
        );
        widget.model.set(0, {
          output_type: 'display_data',
          data: {
            'text/plain': 'hello, world'
          },
          metadata: {
            isolated: true
          }
        });
        expect(widget.node.innerHTML).toContain('<iframe');
        widget.model.set(0, {
          output_type: 'display_data',
          data: {
            'text/plain': 'hello, world'
          }
        });
        expect(widget.node.innerHTML).not.toContain('<iframe');
      });
    });

    describe('.execute()', () => {
      let sessionContext: SessionContext;

      beforeEach(async () => {
        sessionContext = await createSessionContext();
        await sessionContext.initialize();
        await sessionContext.session?.kernel?.info;
      });

      afterEach(async () => {
        await sessionContext.shutdown();
        sessionContext.dispose();
      });

      it('should execute code on a kernel and send outputs to the model', async () => {
        const reply = await OutputArea.execute(CODE, widget, sessionContext);
        expect(reply!.content.execution_count).toBeTruthy();
        expect(reply!.content.status).toBe('ok');
        expect(model.length).toBe(1);
      });

      it('should clear existing outputs', async () => {
        widget.model.fromJSON(DEFAULT_OUTPUTS);
        const reply = await OutputArea.execute(CODE, widget, sessionContext);
        expect(reply!.content.execution_count).toBeTruthy();
        expect(model.length).toBe(1);
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

        let ipySessionContext: SessionContext;
        ipySessionContext = await createSessionContext({
          kernelPreference: { name: 'ipython' }
        });
        await ipySessionContext.initialize();
        const promise0 = OutputArea.execute(code0, widget0, ipySessionContext);
        const promise1 = OutputArea.execute(code1, widget1, ipySessionContext);
        await Promise.all([promise0, promise1]);
        expect(model1.length).toBe(3);
        expect(model1.toJSON()[1].data).toEqual({ 'text/plain': '1' });
        await OutputArea.execute(code2, widget2, ipySessionContext);

        expect(model1.length).toBe(3);
        expect(model1.toJSON()[1].data).toEqual({ 'text/plain': '4' });
        expect(model2.length).toBe(3);
        const outputs = model2.toJSON();
        expect(outputs[0].data).toEqual({ 'text/plain': '4' });
        expect(outputs[1].data).toEqual({ 'text/plain': '3' });
        expect(outputs[2].data).toEqual({ 'text/plain': '4' });
        await ipySessionContext.shutdown();
      });

      it('should stop on an error', async () => {
        let ipySessionContext: SessionContext;
        ipySessionContext = await createSessionContext({
          kernelPreference: { name: 'ipython' }
        });
        await ipySessionContext.initialize();
        const widget1 = new LogOutputArea({ rendermime, model });
        const future1 = OutputArea.execute('a++1', widget, ipySessionContext);
        const future2 = OutputArea.execute('a=1', widget1, ipySessionContext);
        const reply = await future1;
        const reply2 = await future2;
        expect(reply!.content.status).toBe('error');
        expect(reply2!.content.status).toBe('aborted');
        expect(model.length).toBe(1);
        widget1.dispose();
        await ipySessionContext.shutdown();
      });

      it('should allow an error given "raises-exception" metadata tag', async () => {
        let ipySessionContext: SessionContext;
        ipySessionContext = await createSessionContext({
          kernelPreference: { name: 'ipython' }
        });
        await ipySessionContext.initialize();
        const widget1 = new LogOutputArea({ rendermime, model });
        const metadata = { tags: ['raises-exception'] };
        const future1 = OutputArea.execute(
          'a++1',
          widget,
          ipySessionContext,
          metadata
        );
        const future2 = OutputArea.execute('a=1', widget1, ipySessionContext);
        const reply = await future1;
        const reply2 = await future2;
        expect(reply!.content.status).toBe('error');
        expect(reply2!.content.status).toBe('ok');
        widget1.dispose();
        await ipySessionContext.shutdown();
      });

      it('should continuously render delayed outputs', async () => {
        const model0 = new OutputAreaModel({ trusted: true });
        const widget0 = new SimplifiedOutputArea({
          model: model0,
          rendermime: rendermime
        });
        let ipySessionContext: SessionContext;
        ipySessionContext = await createSessionContext({
          kernelPreference: { name: 'python3' }
        });
        await ipySessionContext.initialize();
        const code = [
          'import time',
          'for i in range(3):',
          '    print(f"Hello Jupyter! {i}")',
          '    time.sleep(1)'
        ].join('\n');
        await SimplifiedOutputArea.execute(code, widget0, ipySessionContext);
        expect(model0.toJSON()[0].text).toBe(widget0.node.textContent);
      });
    });

    describe('.ContentFactory', () => {
      describe('#createOutputPrompt()', () => {
        it('should create an output prompt', () => {
          const factory = new OutputArea.ContentFactory();
          expect(factory.createOutputPrompt().executionCount).toBeNull();
        });
      });

      describe('#createStdin()', () => {
        it('should create a stdin widget', async () => {
          const manager = new KernelManager();
          const kernel = await manager.startNew();
          const factory = new OutputArea.ContentFactory();
          const future = kernel.requestExecute({ code: CODE });
          const options = {
            parent_header: {
              date: '',
              msg_id: '',
              msg_type: 'input_request' as const,
              session: '',
              username: '',
              version: ''
            },
            prompt: 'hello',
            password: false,
            future
          };
          expect(factory.createStdin(options)).toBeInstanceOf(Widget);
          await kernel.shutdown();
          kernel.dispose();
        });
      });
    });

    describe('.defaultContentFactory', () => {
      it('should be a `contentFactory` instance', () => {
        expect(OutputArea.defaultContentFactory).toBeInstanceOf(
          OutputArea.ContentFactory
        );
      });
    });
  });
});
