// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { Context } from '@jupyterlab/docregistry';
import {
  DocumentRegistry,
  MimeContent,
  MimeDocument,
  MimeDocumentFactory
} from '@jupyterlab/docregistry';
import { createFileContextWithMockedServices } from '@jupyterlab/docregistry/lib/testutils';
import type { IRenderMime } from '@jupyterlab/rendermime';
import { RenderedText } from '@jupyterlab/rendermime';
import { defaultRenderMime } from '@jupyterlab/rendermime/lib/testutils';
import { testEmission } from '@jupyterlab/testing';
import type { Message } from '@lumino/messaging';
import type { BoxLayout } from '@lumino/widgets';

const RENDERMIME = defaultRenderMime();

class LogRenderer extends MimeContent {
  methods: string[] = [];

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}

class FooText extends RenderedText {
  async render(model: IRenderMime.IMimeModel): Promise<void> {
    await super.render(model);
    model.setData({ data: { 'text/foo': 'bar' } });
  }
}

const fooFactory: IRenderMime.IRendererFactory = {
  mimeTypes: ['text/foo'],
  safe: true,
  createRenderer: options => new FooText(options)
};

describe('docregistry/mimedocument', () => {
  let dContext: Context<DocumentRegistry.IModel>;

  beforeEach(async () => {
    dContext = (await createFileContextWithMockedServices()) as any;
  });

  afterEach(() => {
    dContext.dispose();
  });

  describe('MimeDocumentFactory', () => {
    describe('#createNew()', () => {
      it('should require a context parameter', () => {
        const widgetFactory = new MimeDocumentFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
          rendermime: RENDERMIME,
          primaryFileType: DocumentRegistry.getDefaultTextFileType()
        });
        expect(widgetFactory.createNew(dContext)).toBeInstanceOf(MimeDocument);
      });
    });
  });

  describe('MimeContent', () => {
    describe('#constructor()', () => {
      it('should require options', () => {
        const renderer = RENDERMIME.createRenderer('text/markdown');
        const widget = new MimeContent({
          context: dContext,
          renderer,
          mimeType: 'text/markdown',
          renderTimeout: 1000,
          dataType: 'string'
        });
        expect(widget).toBeInstanceOf(MimeContent);
      });
    });

    describe('#ready', () => {
      it('should resolve when the widget is ready', async () => {
        const renderer = RENDERMIME.createRenderer('text/markdown');
        const widget = new LogRenderer({
          context: dContext,
          renderer,
          mimeType: 'text/markdown',
          renderTimeout: 1000,
          dataType: 'string'
        });
        await widget.ready;
        const layout = widget.layout as BoxLayout;
        expect(layout.widgets.length).toBe(1);
      });
    });

    describe('contents changed', () => {
      it('should change the document contents', async () => {
        RENDERMIME.addFactory(fooFactory);
        const emission = testEmission(dContext.model.contentChanged, {
          test: () => {
            expect(dContext.model.toString()).toBe('bar');
          }
        });
        const renderer = RENDERMIME.createRenderer('text/foo');
        const widget = new LogRenderer({
          context: dContext,
          renderer,
          mimeType: 'text/foo',
          renderTimeout: 1000,
          dataType: 'string'
        });
        await widget.ready;
        await emission;
      });
    });

    describe('invalid JSON', () => {
      const errorSelector = '.jp-MimeDocument-errorBanner';

      it('should show an inline error banner instead of failing silently', async () => {
        const renderer = RENDERMIME.createRenderer('application/json');
        const widget = new MimeContent({
          context: dContext,
          renderer,
          mimeType: 'application/json',
          renderTimeout: 1000,
          dataType: 'json'
        });
        dContext.model.fromString('{ invalid');
        await widget.ready;
        const banner = widget.node.querySelector(errorSelector);
        expect(banner).not.toBeNull();
        expect(widget.hasClass('jp-MimeDocument-error')).toBe(true);
        // The document is not disposed on invalid JSON.
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
      });

      it('should clear the error banner once the content is valid again', async () => {
        const renderer = RENDERMIME.createRenderer('application/json');
        const widget = new MimeContent({
          context: dContext,
          renderer,
          mimeType: 'application/json',
          renderTimeout: 1000,
          dataType: 'json'
        });
        dContext.model.fromString('{ invalid');
        await widget.ready;
        expect(widget.node.querySelector(errorSelector)).not.toBeNull();

        // Make the content valid and request a re-render.
        dContext.model.fromString('{ "valid": true }');
        widget.update();
        // Allow the asynchronous update-driven render to complete.
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(widget.node.querySelector(errorSelector)).toBeNull();
        expect(widget.hasClass('jp-MimeDocument-error')).toBe(false);
        widget.dispose();
      });
    });
  });
});
