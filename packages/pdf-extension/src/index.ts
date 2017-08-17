// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import '../style/index.css';

/**
 * The MIME type for PDF.
 */
export
const MIME_TYPE = 'application/pdf';

export
const PDF_CLASS = 'jp-PDFViewer';

export
const PDF_CONTAINER_CLASS = 'jp-PDFContainer';

/**
 * A class for rendering a PDF document.
 */
export
class RenderedPDF extends Widget implements IRenderMime.IRenderer {
  constructor() {
    super({ node: Private.createNode() });
  }

  /**
   * Render PDF into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    let data = model.data[MIME_TYPE] as string;
    let src = `data:${MIME_TYPE};base64,${data}`;
    this.node.querySelector('embed').setAttribute('src', src);
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


/**
 * A namespace for PDF widget private data.
 */
namespace Private {
  /**
   * Create the node for the PDF widget.
   */
  export
  function createNode(): HTMLElement {
    let node = document.createElement('div');
    node.className = PDF_CONTAINER_CLASS;
    let pdf = document.createElement('embed');
    pdf.className = PDF_CLASS;
    pdf.setAttribute('type', MIME_TYPE);
    node.appendChild(pdf);
    return node;
  }
}
