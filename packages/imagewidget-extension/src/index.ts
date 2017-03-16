// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  ImageWidget, ImageWidgetFactory, IImageTracker
} from '@jupyterlab/imagewidget';


/**
 * The command IDs used by the image widget plugin.
 */
namespace CommandIDs {
  export
  const zoomIn = 'imagewidget:zoom-in';

  export
  const zoomOut = 'imagewidget:zoom-out';

  export
  const resetZoom = 'imagewidget:reset-zoom';
};


/**
 * The list of file extensions for images.
 */
const EXTENSIONS = ['.png', '.gif', '.jpeg', '.jpg', '.svg', '.bmp', '.ico',
  '.xbm', '.tiff', '.tif'];

/**
 * The name of the factory that creates image widgets.
 */
const FACTORY = 'Image';

/**
 * The image file handler extension.
 */
const plugin: JupyterLabPlugin<IImageTracker> = {
  activate,
  id: 'jupyter.extensions.image-handler',
  provides: IImageTracker,
  requires: [IDocumentRegistry, ICommandPalette, ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the image widget extension.
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, palette: ICommandPalette, restorer: ILayoutRestorer): IImageTracker {
  const namespace = 'image-widget';
  const factory = new ImageWidgetFactory({
    name: FACTORY,
    modelName: 'base64',
    fileExtensions: EXTENSIONS,
    defaultFor: EXTENSIONS
  });
  const { shell } = app;
  const tracker = new InstanceTracker<ImageWidget>({ namespace, shell });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  registry.addWidgetFactory(factory);

  factory.widgetCreated.connect((sender, widget) => {
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });

  let category = 'Image Widget';
  [CommandIDs.zoomIn, CommandIDs.zoomOut, CommandIDs.resetZoom]
    .forEach(command => { palette.addItem({ command, category }); });

  return tracker;
}
