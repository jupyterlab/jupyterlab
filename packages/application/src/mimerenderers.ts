// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  MimeDocument, MimeDocumentFactory, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  JupyterLab, JupyterLabPlugin
} from './index';

import {
  ILayoutRestorer
} from './layoutrestorer';


/**
 * Create rendermime plugins for rendermime extension modules.
 */
export
function createRendermimePlugins(extensions: IRenderMime.IExtensionModule[]): JupyterLabPlugin<void>[] {
  const plugins: JupyterLabPlugin<void>[] = [];

  extensions.forEach(mod => {
    let data = mod.default;

    // Handle CommonJS exports.
    if (!mod.hasOwnProperty('__esModule')) {
      data = mod as any;
    }
    if (!Array.isArray(data)) {
      data = [data] as ReadonlyArray<IRenderMime.IExtension>;
    }
    (data as ReadonlyArray<IRenderMime.IExtension>)
      .forEach(item => { plugins.push(createRendermimePlugin(item)); });
  });

  return plugins;
}


/**
 * Create rendermime plugins for rendermime extension modules.
 */
export
function createRendermimePlugin(item: IRenderMime.IExtension): JupyterLabPlugin<void> {
  return {
    id: item.id,
    requires: [ILayoutRestorer, IRenderMimeRegistry],
    autoStart: true,
    activate: (app: JupyterLab, restorer: ILayoutRestorer, rendermime: IRenderMimeRegistry) => {
      // Add the mime renderer.
      if (item.rank !== undefined) {
        rendermime.addFactory(
          item.rendererFactory, item.rank
        );
      } else {
        rendermime.addFactory(item.rendererFactory);
      }

      // Handle the widget factory.
      if (!item.documentWidgetFactoryOptions) {
        return;
      }

      let registry = app.docRegistry;
      let options: IRenderMime.IDocumentWidgetFactoryOptions[] = [];
      if (Array.isArray(item.documentWidgetFactoryOptions)) {
        options = item.documentWidgetFactoryOptions;
      } else {
        options = [item.documentWidgetFactoryOptions as IRenderMime.IDocumentWidgetFactoryOptions];
      }

      if (item.fileTypes) {
        item.fileTypes.forEach(ft => {
          app.docRegistry.addFileType(ft as DocumentRegistry.IFileType);
        });
      }

      options.forEach(option => {
        let factory = new MimeDocumentFactory({
          renderTimeout: item.renderTimeout,
          dataType: item.dataType,
          rendermime,
          modelName: option.modelName,
          name: option.name,
          primaryFileType: registry.getFileType(option.primaryFileType),
          fileTypes: option.fileTypes,
          defaultFor: option.defaultFor
        });
        registry.addWidgetFactory(factory);

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
      });
    }
  };
}
