// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { Context, DocumentRegistry } from '@jupyterlab/docregistry';
import { createFileContextWithMockedServices } from '@jupyterlab/docregistry/lib/testutils';
import { MarkdownViewer } from '@jupyterlab/markdownviewer';
import type { IRenderMime } from '@jupyterlab/rendermime';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

class TestRenderer extends Widget implements IRenderMime.IRenderer {
  renderCount = 0;

  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this.renderCount += 1;
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

  it('should render when an option affecting the content changes', async () => {
    expect(renderer.renderCount).toBe(1);

    viewer.setOption('hideFrontMatter', false);
    MessageLoop.flush();
    await Promise.resolve();

    expect(renderer.renderCount).toBe(2);
  });
});
