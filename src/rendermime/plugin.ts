// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin
} from '../application';

import {
  defaultSanitizer
} from '../sanitizer';

import {
  IRenderMime, RenderMime
} from './';


/**
 * The default rendermime provider.
 */
const plugin: JupyterLabPlugin<IRenderMime> = {
  id: 'jupyter.services.rendermime',
  provides: IRenderMime,
  activate: (): IRenderMime => {
    let sanitizer = defaultSanitizer;
    const transformers = RenderMime.defaultRenderers();
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


/**
 * Export the plugin as default.
 */
export default plugin;
