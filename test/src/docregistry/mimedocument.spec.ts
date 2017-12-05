// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  DocumentRegistry, Context,
  MimeDocument, MimeDocumentFactory
} from '@jupyterlab/docregistry';

import {
  RenderedText, IRenderMime
} from '@jupyterlab/rendermime';

import {
  createFileContext, defaultRenderMime
} from '../utils';


const RENDERMIME = defaultRenderMime();


class LogRenderer extends MimeDocument {
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
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return super.render(model).then(() => {
      model.setData({ data: { 'text/foo': 'bar' }});
    });
  }
}


const fooFactory: IRenderMime.IRendererFactory  = {
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
        let widgetFactory = new MimeDocumentFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
          rendermime: RENDERMIME,
          primaryFileType: DocumentRegistry.defaultTextFileType
        });
        expect(widgetFactory.createNew(dContext)).to.be.a(MimeDocument);
      });

    });

  });

  describe('MimeDocument', () => {

    describe('#constructor()', () => {

      it('should require options', () => {
        let widget = new MimeDocument({
          context: dContext,
          rendermime: RENDERMIME,
          mimeType: 'text/markdown',
          renderTimeout: 1000,
          dataType: 'string'
        });
        expect(widget).to.be.a(MimeDocument);
      });

    });

    describe('#ready', () => {

      it('should resolve when the widget is ready', () => {
        let widget = new LogRenderer({
          context: dContext,
          rendermime: RENDERMIME,
          mimeType: 'text/markdown',
          renderTimeout: 1000,
          dataType: 'string'
        });
        dContext.save();
        return widget.ready.then(() => {
          let layout = widget.layout as PanelLayout;
          expect(layout.widgets.length).to.be(2);
        });
      });

    });

    context('contents changed', () => {

      it('should change the document contents', (done) => {
        RENDERMIME.addFactory(fooFactory);
        dContext.save().then(() => {
          dContext.model.contentChanged.connect(() => {
            expect(dContext.model.toString()).to.be('bar');
            done();
          });

          let widget = new LogRenderer({
            context: dContext,
            rendermime: RENDERMIME,
            mimeType: 'text/foo',
            renderTimeout: 1000,
            dataType: 'string'
          });
          return widget.ready;
        }).catch(done);
      });

    });

  });

});

