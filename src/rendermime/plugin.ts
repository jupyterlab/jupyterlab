// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  JupyterLabPlugin
} from '../application';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavascriptRenderer, SVGRenderer, MarkdownRenderer
} from '../renderers';

import {
  defaultSanitizer
} from '../sanitizer';

import {
  IRenderMime as IBaseRenderMime, RenderMime
} from './index';


/* tslint:disable */
/**
 * The rendermime token.
 */
export
const IRenderMime = new Token<IRenderMime>('jupyter.services.rendermime');
/* tslint:enable */


/**
 * The rendermime interface.
 */
export
interface IRenderMime extends IBaseRenderMime {}


/**
 * The default rendermime provider.
 */
export
const renderMimeProvider: JupyterLabPlugin<IRenderMime> = {
  id: 'jupyter.services.rendermime',
  provides: IRenderMime,
  activate: (): IRenderMime => {
    let sanitizer = defaultSanitizer;
    const transformers = [
      new JavascriptRenderer(),
      new MarkdownRenderer(),
      new HTMLRenderer(),
      new ImageRenderer(),
      new SVGRenderer(),
      new LatexRenderer(),
      new TextRenderer()
    ];
    let renderers: RenderMime.MimeMap<RenderMime.IRenderer> = {};
    let order: string[] = [];
    for (let t of transformers) {
      for (let m of t.mimetypes) {
        renderers[m] = t;
        order.push(m);
      }
    }
    return new RenderMime({ renderers, order, sanitizer });
  }
};
