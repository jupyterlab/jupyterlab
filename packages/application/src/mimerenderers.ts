// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  MimeDocument, MimeDocumentFactory
} from '@jupyterlab/docregistry';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  JupyterLab, JupyterLabPlugin
} from '.';

import {
  ILayoutRestorer
} from './layoutrestorer';


/**
 * Create rendermime plugins for rendermime extension modules.
 */
export
function createRendermimePlugins(extensions: IRenderMime.IExtensionModule[]): JupyterLabPlugin<void>[] {
  let plugins: JupyterLabPlugin<void>[] = [];
  extensions.forEach(mod => {
    let data = mod.default;
    // Handle commonjs exports.
    if (!mod.hasOwnProperty('__esModule')) {
      data = mod as any;
    }
    if (!Array.isArray(data)) {
      data = [data] as ReadonlyArray<IRenderMime.IExtension>;
    }
    (data as ReadonlyArray<IRenderMime.IExtension>).forEach(item => {
      let plugin = createRendermimePlugin(item);
      plugins.push(plugin);
    });
  });
  return plugins;
}


/**
 * Create rendermime plugins for rendermime extension modules.
 */
export
function createRendermimePlugin(item: IRenderMime.IExtension): JupyterLabPlugin<void> {
  return {
    id: `jupyter.services.mimerenderer-${item.mimeType}`,
    requires: [ILayoutRestorer],
    autoStart: true,
    activate: (app: JupyterLab, restorer: ILayoutRestorer) => {
      // Add the mime renderer.
      if (item.rank !== undefined) {
        app.rendermime.addFactory(
          item.rendererFactory, item.rank
        );
      } else {
        app.rendermime.addFactory(item.rendererFactory);
      }

      // Handle the widget factory.
      if (!item.documentWidgetFactoryOptions) {
        return;
      }

      let factory = new MimeDocumentFactory({
        mimeType: item.mimeType,
        renderTimeout: item.renderTimeout,
        dataType: item.dataType,
        rendermime: app.rendermime,
        ...item.documentWidgetFactoryOptions,
      });
      app.docRegistry.addWidgetFactory(factory);

      const factoryName = factory.name;
      const namespace = `${factoryName}-renderer`;
      const tracker = new InstanceTracker<MimeDocument>({ namespace });

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
    }
  };
}
