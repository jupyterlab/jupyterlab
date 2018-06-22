// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  MimeDocumentFactory, DocumentRegistry, MimeDocument
} from '@jupyterlab/docregistry';

import {
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  AttachedProperty
} from '@phosphor/properties';

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
function createRendermimePlugins(mimeDocumentTracker: InstanceTracker<MimeDocument>, extensions: IRenderMime.IExtensionModule[]): JupyterLabPlugin<void>[] {
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
      .forEach(item => {
        plugins.push(createRendermimePlugin(mimeDocumentTracker, item));
      });
  });

  // Also add a meta-plugin handling state restoration.
  plugins.push({
    id: '@jupyterlab/mimedocument-restorer:plugin',
    requires: [ILayoutRestorer],
    autoStart: true,
    activate: (app: JupyterLab, restorer: ILayoutRestorer) => {
      restorer.restore(mimeDocumentTracker, {
        command: 'docmanager:open',
        args: widget => ({
          path: widget.context.path,
          factory: Private.factoryNameProperty.get(widget)
        }),
        name: widget =>
          `${widget.context.path}:${Private.factoryNameProperty.get(widget)}`
      });
    }
  });

  return plugins;
}


/**
 * Create rendermime plugins for rendermime extension modules.
 */
export
function createRendermimePlugin(mimeDocumentTracker: InstanceTracker<MimeDocument>, item: IRenderMime.IExtension): JupyterLabPlugin<void> {
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


        factory.widgetCreated.connect((sender, widget) => {
          Private.factoryNameProperty.set(widget, factory.name);
          // Notify the instance tracker if restore data needs to update.
          widget.context.pathChanged.connect(() => {
            mimeDocumentTracker.save(widget);
          });
          mimeDocumentTracker.add(widget);
        });
      });
    }
  };
}

/**
 * Private namespace for the module.
 */
namespace Private {
  /**
   * An attached property for keeping the factory name
   * that was used to create a mimedocument.
   */
  export
  const factoryNameProperty = new AttachedProperty<MimeDocument, string>({
    name: 'factoryName',
    create: () => undefined
  });
}
