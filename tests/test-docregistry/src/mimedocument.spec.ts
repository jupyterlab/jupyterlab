// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Message } from '@lumino/messaging';

import { BoxLayout } from '@lumino/widgets';

import {
  DocumentRegistry,
  Context,
  MimeContent,
  MimeDocument,
  MimeDocumentFactory
} from '@jupyterlab/docregistry';

import { RenderedText, IRenderMime } from '@jupyterlab/rendermime';

import {
  createFileContext,
  defaultRenderMime,
  testEmission
} from '@jupyterlab/testutils';

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

  beforeEach(() => {
    dContext = createFileContext();
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
          primaryFileType: DocumentRegistry.defaultTextFileType
        });
        expect(widgetFactory.createNew(dContext)).to.be.an.instanceof(
          MimeDocument
        );
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
        expect(widget).to.be.an.instanceof(MimeContent);
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
        void dContext.initialize(true);
        await widget.ready;
        const layout = widget.layout as BoxLayout;
        expect(layout.widgets.length).to.equal(1);
      });
    });

    describe('contents changed', () => {
      it('should change the document contents', async () => {
        RENDERMIME.addFactory(fooFactory);
        await dContext.initialize(true);
        const emission = testEmission(dContext.model.contentChanged, {
          test: () => {
            expect(dContext.model.toString()).to.equal('bar');
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
  });
});
