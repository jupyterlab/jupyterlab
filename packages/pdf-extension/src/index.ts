// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IFrame
} from '@jupyterlab/apputils';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

/**
 * The MIME type for PDF.
 */
export
const MIME_TYPE = 'application/pdf';

/**
 * A class for rendering a PDF document.
 */
export
class RenderedPDF extends IFrame implements IRenderMime.IRenderer {
  /**
   * Render PDF into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    let data = model.data[MIME_TYPE] as string;
    let src = `data:${MIME_TYPE};base64,${data}`;
    this.url = src;
    return Promise.resolve(void 0);
  }
}


/**
 * A mime renderer factory for PDF data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new RenderedPDF()
};


const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  {
    name: 'PDF',
    rendererFactory,
    rank: 0,
    dataType: 'string',
    fileTypes: [{
      name: 'PDF',
      fileFormat: 'base64',
      mimeTypes: [MIME_TYPE],
      extensions: ['.pdf']
    }],
    documentWidgetFactoryOptions: {
      name: 'PDF',
      modelName: 'base64',
      primaryFileType: 'PDF',
      fileTypes: ['PDF'],
      defaultFor: ['PDF']
    }
  }
];

export default extensions;
