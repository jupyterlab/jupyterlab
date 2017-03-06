// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  JupyterLabPlugin, JupyterLab
} from '../application';

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
  let linkHandler = {
    handleLink: (node: HTMLElement, path: string) => {
      if (!utils.urlParse(path).protocol && path.indexOf('//') !== 0) {
        linker.connectNode(node, CommandIDs.open, { path });
      }
    }
  };
  let items = RenderMime.getDefaultItems();
  return new RenderMime({ items, linkHandler });
};
