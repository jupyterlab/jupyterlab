// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { RenderedJavaScript } from '@jupyterlab/rendermime';

export
const TEXT_JAVASCRIPT_MIMETYPE = 'text/javascript';
export
const APPLICATION_JAVASCRIPT_MIMETYPE = 'application/javascript';

function evalInContext(code: string, element: Element, document: Document, window: Window) {
   // tslint:disable-next-line
  return eval(code);
}

export
class ExperimentalRenderedJavascript extends RenderedJavaScript {
  render(model: IRenderMime.IMimeModel): Promise<void> {
    const renderJavascript = () => {
      try {
        const data = model.data[this.mimeType] as string;
        evalInContext(data, this.node, document, window);
        // If output is empty after evaluating, render the plain text value
        if (this.node.innerHTML === '') {
          const text = model.data['text/plain'] as string;
          const output = document.createElement('pre');
          output.textContent = text;
          this.node.appendChild(output);
        }
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    };
    if (!model.trusted) {
      // If output is not trusted or if arbitrary Javascript execution is not enabled, render an informative error message
      this.node.innerHTML = `<pre>Are you sure that you want to run arbitrary Javascript within your JupyterLab session?</pre>
      <button>Run</button>`;
      this.node.querySelector('button').onclick = (event) => {
        this.node.innerHTML = '';
        renderJavascript();
      };
      return Promise.resolve();
    }
    return renderJavascript();
  }
}

/**
 * A mime renderer factory for text/javascript data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
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
