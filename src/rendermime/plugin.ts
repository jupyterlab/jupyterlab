// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  RenderMime, MimeMap, IRenderer
} from 'jupyter-js-ui/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavascriptRenderer, SVGRenderer, MarkdownRenderer
} from 'jupyter-js-ui/lib/renderers';

import {
  Widget
} from 'phosphor-widget';


/**
 * The default rendermime provider.
 */
export
const renderMimeProvider = {
  id: 'jupyter.services.rendermime',
  provides: RenderMime,
  resolve: () => {
    const transformers = [
      new JavascriptRenderer(),
      new MarkdownRenderer(),
      new HTMLRenderer(),
      new ImageRenderer(),
      new SVGRenderer(),
      new LatexRenderer(),
      new TextRenderer()
    ];
    let renderers: MimeMap<IRenderer<Widget>> = {};
    let order: string[] = [];
    for (let t of transformers) {
      for (let m of t.mimetypes) {
        renderers[m] = t;
        order.push(m);
      }
    }
    return new RenderMime<Widget>(renderers, order);
  }
};
