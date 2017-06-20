// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from '@phosphor/algorithm';

import {
  JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
  ICommandLinker
} from '@jupyterlab/apputils';

import {
  IDocumentRegistry, MimeRendererFactory
} from '@jupyterlab/docregistry';

import {
  IRenderMime, RenderMime
} from '@jupyterlab/rendermime';


/**
 * The default rendermime provider.
 */
const plugin: JupyterLabPlugin<IRenderMime> = {
  id: 'jupyter.services.rendermime',
  requires: [ICommandLinker, IDocumentRegistry],
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
function activate(app: JupyterLab, linker: ICommandLinker, registry: IDocumentRegistry): IRenderMime {
  let linkHandler = {
    handleLink: (node: HTMLElement, path: string) => {
      linker.connectNode(node, 'file-operations:open', { path });
    }
  };
  let items = RenderMime.getDefaultItems();
  let rendermime = new RenderMime({ items, linkHandler });

  each(RenderMime.getExtensions(), item => {
    rendermime.addRenderer({
      mimeType: item.mimeType,
      renderer: item.renderer
    }, item.rendererIndex || 0);

    if (item.widgetFactoryOptions) {
      registry.addWidgetFactory(new MimeRendererFactory({
        mimeType: item.mimeType,
        renderTimeout: item.renderTimeout,
        rendermime,
        ...item.widgetFactoryOptions,
      }));
    }
  });

  return rendermime;
};
