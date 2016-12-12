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
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IStateDB
} from '../statedb';

import {
  ImageWidget, ImageWidgetFactory
} from './widget';


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
export
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.image-handler',
  requires: [IDocumentRegistry, ICommandPalette, IStateDB, ILayoutRestorer],
  activate: activateImageWidget,
  autoStart: true
};


/**
 * Activate the image widget extension.
 */
function activateImageWidget(app: JupyterLab, registry: IDocumentRegistry, palette: ICommandPalette, state: IStateDB, layout: ILayoutRestorer): void {
  let zoomInImage = 'image-widget:zoom-in';
  let zoomOutImage = 'image-widget:zoom-out';
  let resetZoomImage = 'image-widget:reset-zoom';

  const factory = new ImageWidgetFactory({
    name: FACTORY,
    modelName: 'base64',
    fileExtensions: EXTENSIONS,
    defaultFor: EXTENSIONS
  });

  const tracker = new InstanceTracker<ImageWidget>();

  // Handle state restoration.
  layout.restore(tracker, {
    namespace: 'imagewidget',
    command: 'file-operations:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  // Sync tracker with currently focused widget.
  app.shell.currentChanged.connect((sender, args) => {
    tracker.sync(args.newValue);
  });

  registry.addWidgetFactory(factory);

  factory.widgetCreated.connect((sender, widget) => {
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });

  app.commands.addCommand(zoomInImage, {
    execute: zoomIn,
    label: 'Zoom In'
  });

  app.commands.addCommand(zoomOutImage, {
    execute: zoomOut,
    label: 'Zoom Out'
  });

  app.commands.addCommand(resetZoomImage, {
    execute: resetZoom,
    label: 'Reset Zoom'
  });

  let category = 'Image Widget';

  [zoomInImage, zoomOutImage, resetZoomImage]
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
