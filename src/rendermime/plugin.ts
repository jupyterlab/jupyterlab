// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  JupyterLabPlugin, JupyterLab
} from '../application';

import {
  defaultSanitizer
} from '../common/sanitizer';

import {
  ICommandLinker
} from '../commandlinker';

import {
  CommandIDs
} from '../filebrowser';

import {
  IRenderMime, RenderMime
} from './';


/**
 * The default rendermime provider.
 */
const plugin: JupyterLabPlugin<IRenderMime> = {
  id: 'jupyter.services.rendermime',
  requires: [ICommandLinker],
  provides: IRenderMime,
  activate,
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * Activate the rendermine plugin.
 */
function activate(app: JupyterLab, linker: ICommandLinker): IRenderMime {
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
  let pathHandler = {
    handlePath: (node: HTMLElement, path: string) => {
      if (!utils.urlParse(path).protocol && path.indexOf('//') !== 0) {
        linker.connectNode(node, CommandIDs.open, { path });
      }
    }
  };
  return new RenderMime({
    renderers,
    order,
    sanitizer,
    pathHandler
  });
};
