// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
  ICommandLinker
} from '@jupyterlab/apputils';

import {
  URLExt
} from '@jupyterlab/coreutils';

import {
  IRenderMime, RenderMime
} from '@jupyterlab/rendermime';


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
  let linkHandler = {
    handleLink: (node: HTMLElement, path: string) => {
      if (!URLExt.parse(path).protocol && path.indexOf('//') !== 0) {
        linker.connectNode(node, 'file-operations:open', { path });
      }
    }
  };
  let items = RenderMime.getDefaultItems();
  return new RenderMime({ items, linkHandler });
};
