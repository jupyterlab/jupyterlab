// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  ConsoleTextRenderer, JavascriptRenderer, SVGRenderer, MarkdownRenderer
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
    let rendermime = new RenderMime<Widget>();
    const transformers = [
      new JavascriptRenderer(),
      new MarkdownRenderer(),
      new HTMLRenderer(),
      new ImageRenderer(),
      new SVGRenderer(),
      new LatexRenderer(),
      new ConsoleTextRenderer(),
      new TextRenderer()
    ];

    for (let t of transformers) {
      for (let m of t.mimetypes) {
        rendermime.order.push(m);
        rendermime.renderers[m] = t;
      }
    }
    return rendermime;
  }
};
