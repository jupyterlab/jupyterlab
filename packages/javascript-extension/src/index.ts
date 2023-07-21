// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module javascript-extension
 */

import { RenderedJavaScript } from '@jupyterlab/rendermime';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

export const TEXT_JAVASCRIPT_MIMETYPE = 'text/javascript';
export const APPLICATION_JAVASCRIPT_MIMETYPE = 'application/javascript';

function evalInContext(
  code: string,
  element: Element,
  document: Document,
  window: Window
) {
  // eslint-disable-next-line
  return eval(code);
}

export class ExperimentalRenderedJavascript extends RenderedJavaScript {
  render(model: IRenderMime.IMimeModel): Promise<void> {
    const trans = this.translator.load('jupyterlab');
    const renderJavascript = () => {
      try {
        const data = model.data[this.mimeType] as string | undefined;
        if (data) {
          evalInContext(data, this.node, document, window);
        }
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    };
    if (!model.trusted) {
      // If output is not trusted or if arbitrary Javascript execution is not enabled, render an informative error message
      const pre = document.createElement('pre');
      pre.textContent = trans.__(
        'Are you sure that you want to run arbitrary Javascript within your JupyterLab session?'
      );
      const button = document.createElement('button');
      button.textContent = trans.__('Run');

      this.node.appendChild(pre);
      this.node.appendChild(button);

      button.onclick = event => {
        this.node.textContent = '';
        void renderJavascript();
      };
      return Promise.resolve();
    }
    return renderJavascript();
  }
}

/**
 * A mime renderer factory for text/javascript data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: [TEXT_JAVASCRIPT_MIMETYPE, APPLICATION_JAVASCRIPT_MIMETYPE],
  createRenderer: options => new ExperimentalRenderedJavascript(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/javascript-extension:factory',
  description: 'Adds renderer for JavaScript content.',
  rendererFactory,
  rank: 0,
  dataType: 'string'
};

export default extension;
