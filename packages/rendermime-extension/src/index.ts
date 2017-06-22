// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from '@phosphor/algorithm';

import {
  ILayoutRestorer, JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
  ICommandLinker, InstanceTracker
} from '@jupyterlab/apputils';

import {
  IDocumentRegistry, MimeRenderer, MimeRendererFactory
} from '@jupyterlab/docregistry';

import {
  IRenderMime, RenderMime
} from '@jupyterlab/rendermime';


/**
 * The default rendermime provider.
 */
const rendermimePlugin: JupyterLabPlugin<IRenderMime> = {
  id: 'jupyter.services.rendermime',
  requires: [ICommandLinker, IDocumentRegistry],
  provides: IRenderMime,
  activate: activateRendermime,
  autoStart: true
};


/**
 * The rendermime document registry handler.
 */
const docRegistryPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.services.mimerender-documents',
  requires: [IRenderMime, IDocumentRegistry, ILayoutRestorer],
  activate: activateWidgetFactories,
  autoStart: true
};



/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [rendermimePlugin, docRegistryPlugin];
export default plugins;

/**
 * Activate the rendermine plugin.
 */
function activateRendermime(app: JupyterLab, linker: ICommandLinker, registry: IDocumentRegistry): IRenderMime {
  let linkHandler = {
    handleLink: (node: HTMLElement, path: string) => {
      linker.connectNode(node, 'docmanager:open', { path });
    }
  };
  let items = RenderMime.getDefaultItems();
  let rendermime = new RenderMime({ items, linkHandler });

  each(RenderMime.getExtensions(), item => {
    rendermime.addRenderer({
      mimeType: item.mimeType,
      renderer: item.renderer
    }, item.rendererIndex || 0);
  });

  return rendermime;
};


/**
 * Activate the widget factories plugin.
 */
function activateWidgetFactories(app: JupyterLab, rendermime: IRenderMime, registry: IDocumentRegistry, restorer: ILayoutRestorer) {
  each(RenderMime.getExtensions(), item => {
    if (!item.widgetFactoryOptions) {
      return;
    }
    let factory = new MimeRendererFactory({
      mimeType: item.mimeType,
      renderTimeout: item.renderTimeout,
      dataType: item.dataType,
      rendermime,
      ...item.widgetFactoryOptions,
    });
    registry.addWidgetFactory(factory);

    const factoryName = item.widgetFactoryOptions.name;
    const namespace = `${factoryName}-renderer`;
    const tracker = new InstanceTracker<MimeRenderer>({ namespace });

    // Handle state restoration.
    restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: factoryName }),
      name: widget => widget.context.path
    });

    factory.widgetCreated.connect((sender, widget) => {
      // Notify the instance tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => { tracker.save(widget); });
      tracker.add(widget);
    });
  });
}
