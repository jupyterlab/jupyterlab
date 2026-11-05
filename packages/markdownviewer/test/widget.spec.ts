// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { Context, DocumentRegistry } from '@jupyterlab/docregistry';
import { createFileContextWithMockedServices } from '@jupyterlab/docregistry/lib/testutils';
import type { IRenderMime } from '@jupyterlab/rendermime';
import { PromiseDelegate } from '@lumino/coreutils';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { MarkdownViewer } from '../src';

class TestRenderer extends Widget implements IRenderMime.IRenderer {
  renderCount = 0;
  fragments: unknown[] = [];

  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this.renderCount += 1;
    this.fragments.push(model.metadata.fragment);
  }
}

describe('MarkdownViewer', () => {
  let context: Context<DocumentRegistry.IModel>;
  let renderer: TestRenderer;
  let viewer: MarkdownViewer;

  beforeEach(async () => {
    context = await createFileContextWithMockedServices();
    renderer = new TestRenderer();
    viewer = new MarkdownViewer({ context, renderer });
    Widget.attach(viewer, document.body);
    await viewer.ready;
  });

  afterEach(() => {
    if (viewer.isAttached) {
      Widget.detach(viewer);
    }
    viewer.dispose();
    context.dispose();
  });

  it('should not render in response to a layout update', () => {
    expect(renderer.renderCount).toBe(1);

    MessageLoop.sendMessage(viewer, Widget.Msg.UpdateRequest);

    expect(renderer.renderCount).toBe(1);
  });

  it('should render on an update request after the content changed', () => {
    expect(renderer.renderCount).toBe(1);

    context.model.fromString('# Changed');
    MessageLoop.sendMessage(viewer, Widget.Msg.UpdateRequest);

    expect(renderer.renderCount).toBe(2);
  });

  it('should render when an option affecting the content changes', async () => {
    expect(renderer.renderCount).toBe(1);

    viewer.setOption('hideFrontMatter', false);
    MessageLoop.flush();
    await Promise.resolve();

    expect(renderer.renderCount).toBe(2);
  });

  it('should not repeat the initial render for options set before readiness', async () => {
    viewer.dispose();
    const ready = new PromiseDelegate<void>();
    const readySpy = jest.spyOn(context, 'ready', 'get');
    readySpy.mockReturnValue(ready.promise);
    const isReadySpy = jest.spyOn(context, 'isReady', 'get');
    isReadySpy.mockReturnValue(false);
    renderer = new TestRenderer();
    viewer = new MarkdownViewer({ context, renderer });
    Widget.attach(viewer, document.body);
    viewer.setOption('hideFrontMatter', false);
    MessageLoop.flush();
    expect(renderer.renderCount).toBe(0);

    isReadySpy.mockReturnValue(true);
    ready.resolve(undefined);
    await viewer.ready;
    MessageLoop.sendMessage(viewer, Widget.Msg.UpdateRequest);
    expect(renderer.renderCount).toBe(1);
    readySpy.mockRestore();
    isReadySpy.mockRestore();
  });

  it('should retain option changes made during the initial render', async () => {
    viewer.dispose();
    renderer = new TestRenderer();
    const rendering = new PromiseDelegate<void>();
    const renderSpy = jest.spyOn(renderer, 'renderModel');
    renderSpy.mockImplementationOnce(async () => {
      renderer.renderCount += 1;
      await rendering.promise;
    });
    viewer = new MarkdownViewer({ context, renderer });
    Widget.attach(viewer, document.body);
    await Promise.resolve();
    expect(renderer.renderCount).toBe(1);
    viewer.setOption('hideFrontMatter', false);
    MessageLoop.flush();
    rendering.resolve(undefined);
    await viewer.ready;
    expect(renderer.renderCount).toBe(2);
    MessageLoop.sendMessage(viewer, Widget.Msg.UpdateRequest);
    expect(renderer.renderCount).toBe(2);
    renderSpy.mockRestore();
  });

  it('should not pass the fragment to a later render', async () => {
    viewer.dispose();
    const ready = new PromiseDelegate<void>();
    const readySpy = jest.spyOn(context, 'ready', 'get');
    readySpy.mockReturnValue(ready.promise);
    const isReadySpy = jest.spyOn(context, 'isReady', 'get');
    isReadySpy.mockReturnValue(false);
    renderer = new TestRenderer();
    viewer = new MarkdownViewer({ context, renderer });
    Widget.attach(viewer, document.body);
    viewer.setFragment('#section');
    MessageLoop.flush();

    isReadySpy.mockReturnValue(true);
    ready.resolve(undefined);
    await viewer.ready;
    viewer.setOption('hideFrontMatter', false);
    MessageLoop.flush();

    expect(renderer.fragments).toEqual(['#section', '']);
    readySpy.mockRestore();
    isReadySpy.mockRestore();
  });
});
