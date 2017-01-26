// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  CommandIDs as FileBrowserCommandIDs
} from '../filebrowser';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  CommandIDs, ImageWidget, ImageWidgetFactory
} from './';


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
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.image-handler',
  requires: [IDocumentRegistry, ICommandPalette, IInstanceRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the image widget extension.
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, palette: ICommandPalette, restorer: IInstanceRestorer): void {
  const namespace = 'image-widget';
  const factory = new ImageWidgetFactory({
    name: FACTORY,
    modelName: 'base64',
    fileExtensions: EXTENSIONS,
    defaultFor: EXTENSIONS
  });
  const tracker = new InstanceTracker<ImageWidget>({ namespace });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: FileBrowserCommandIDs.open,
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  registry.addWidgetFactory(factory);

  factory.widgetCreated.connect((sender, widget) => {
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });

  app.commands.addCommand(CommandIDs.zoomIn, {
    execute: zoomIn,
    label: 'Zoom In'
  });

  app.commands.addCommand(CommandIDs.zoomOut, {
    execute: zoomOut,
    label: 'Zoom Out'
  });

  app.commands.addCommand(CommandIDs.resetZoom, {
    execute: resetZoom,
    label: 'Reset Zoom'
  });

  let category = 'Image Widget';

  [CommandIDs.zoomIn, CommandIDs.zoomOut, CommandIDs.resetZoom]
    .forEach(command => palette.addItem({ command, category }));

  function zoomIn(): void {
    let widget = tracker.currentWidget;
    if (!widget) {
      return;
    }
    if (widget.scale > 1) {
      widget.scale += .5;
    } else {
      widget.scale *= 2;
    }
  }

  function zoomOut(): void {
    let widget = tracker.currentWidget;
    if (!widget) {
      return;
    }
    if (widget.scale > 1) {
      widget.scale -= .5;
    } else {
      widget.scale /= 2;
    }
  }

  function resetZoom(): void {
    let widget = tracker.currentWidget;
    if (!widget) {
      return;
    }
    widget.scale = 1;
  }
}
