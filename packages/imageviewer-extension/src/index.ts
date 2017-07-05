// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, InstanceTracker
} from '@jupyterlab/apputils';

import {
  ImageViewer, ImageViewerFactory, IImageTracker
} from '@jupyterlab/imageviewer';

import {
  CommandRegistry
} from '@phosphor/commands';


/**
 * The command IDs used by the image widget plugin.
 */
namespace CommandIDs {
  export
  const zoomIn = 'imageviewer:zoom-in';

  export
  const zoomOut = 'imageviewer:zoom-out';

  export
  const resetZoom = 'imageviewer:reset-zoom';
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
  requires: [ICommandPalette, ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the image widget extension.
 */
function activate(app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer): IImageTracker {
  const namespace = 'image-widget';
  const factory = new ImageViewerFactory({
    name: FACTORY,
    modelName: 'base64',
    fileExtensions: EXTENSIONS,
    defaultFor: EXTENSIONS,
    readOnly: true
  });
  const tracker = new InstanceTracker<ImageViewer>({ namespace });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory);

  factory.widgetCreated.connect((sender, widget) => {
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });

  addCommands(tracker, app.commands);

  let category = 'Image Viewer';
  [CommandIDs.zoomIn, CommandIDs.zoomOut, CommandIDs.resetZoom]
    .forEach(command => { palette.addItem({ command, category }); });

  return tracker;
}


/**
 * Add the commands for the image widget.
 */
export
function addCommands(tracker: IImageTracker, commands: CommandRegistry) {

  /**
   * Whether there is an active notebook.
   */
  function hasWidget(): boolean {
    return tracker.currentWidget !== null;
  }

  // Update the command registry when the image viewer state changes.
  tracker.currentChanged.connect(() => {
    if (tracker.size <= 1) {
      commands.notifyCommandChanged(CommandIDs.zoomIn);
    }
  });

  commands.addCommand('imageviewer:zoom-in', {
    execute: zoomIn,
    label: 'Zoom In',
    isEnabled: hasWidget
  });

  commands.addCommand('imageviewer:zoom-out', {
    execute: zoomOut,
    label: 'Zoom Out',
    isEnabled: hasWidget
  });

  commands.addCommand('imageviewer:reset-zoom', {
    execute: resetZoom,
    label: 'Reset Zoom',
    isEnabled: hasWidget
  });

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

