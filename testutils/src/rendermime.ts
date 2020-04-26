// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import json2html = require('json-to-html');

import {
  IRenderMime,
  RenderMimeRegistry,
  RenderedHTML,
  standardRendererFactories
} from '@jupyterlab/rendermime';

/**
 * Get a copy of the default rendermime instance.
 */
export function defaultRenderMime(): RenderMimeRegistry {
  return Private.rendermime.clone();
}

/**
 * A namespace for private data.
 */
namespace Private {
  class JSONRenderer extends RenderedHTML {
    mimeType = 'text/html';

    renderModel(model: IRenderMime.IMimeModel): Promise<void> {
      const source = model.data['application/json'];
      model.setData({ data: { 'text/html': json2html(source) } });
      return super.renderModel(model);
    }
  }

  const jsonRendererFactory = {
    mimeTypes: ['application/json'],
    safe: true,
    createRenderer(
      options: IRenderMime.IRendererOptions
    ): IRenderMime.IRenderer {
      return new JSONRenderer(options);
    }
  };

  export const rendermime = new RenderMimeRegistry({
    initialFactories: standardRendererFactories
  });
  rendermime.addFactory(jsonRendererFactory, 10);
}
