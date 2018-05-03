// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { RenderedJavaScript } from '@jupyterlab/rendermime';

export const TEXT_JAVASCRIPT_MIMETYPE = 'text/javascript';
export const APPLICATION_JAVASCRIPT_MIMETYPE = 'application/javascript';

function evalInContext(code: string, element: Element, document: Document, window: Window) {
   // tslint:disable-next-line
  return eval(code);
}

export class ExperimentalRenderedJavascript extends RenderedJavaScript {
  render(model: IRenderMime.IMimeModel): Promise<void> {
    try {
      evalInContext(model.data[this.mimeType] as string, this.node, document, window);
      return Promise.resolve(undefined);
    } catch (error) {
      this.addClass('jp-RenderedText');
      this.node.innerHTML = `<pre>Javascript Error: ${error.message}</pre>`;
      this.node.setAttribute('data-mime-type', 'application/vnd.jupyter.stderr');
      return Promise.reject(error);
    }
  }
}

/**
 * A mime renderer factory for text/javascript data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [TEXT_JAVASCRIPT_MIMETYPE, APPLICATION_JAVASCRIPT_MIMETYPE],
  createRenderer: options => new ExperimentalRenderedJavascript(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/javascript-extension:factory',
  rendererFactory,
  rank: 0,
  dataType: 'string'
};

export default extension;
