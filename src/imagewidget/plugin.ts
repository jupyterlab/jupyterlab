// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  ImageWidget, ImageWidgetFactory
} from './widget';


/**
 * The list of file extensions for images.
 */
const EXTENSIONS = ['.png', '.gif', '.jpeg', '.jpg', '.svg', '.bmp', '.ico',
  '.xbm', '.tiff', '.tif'];


/**
 * The image file handler extension.
 */
export
const imageHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.image-handler',
  requires: [IDocumentRegistry, ICommandPalette],
  activate: activateImageWidget,
  autoStart: true
};


/**
 * Activate the image widget extension.
 */
function activateImageWidget(app: JupyterLab, registry: IDocumentRegistry, palette: ICommandPalette): void {
    let zoomInImage = 'image-widget:zoom-in';
    let zoomOutImage = 'image-widget:zoom-out';
    let resetZoomImage = 'image-widget:reset-zoom';
    let tracker = new FocusTracker<ImageWidget>();
    let image = new ImageWidgetFactory();
    let options = {
      fileExtensions: EXTENSIONS,
      displayName: 'Image',
      modelName: 'base64',
      defaultFor: EXTENSIONS,
      preferKernel: false,
      canStartKernel: false
    };

    registry.addWidgetFactory(image, options);

    image.widgetCreated.connect((sender, newWidget) => {
      tracker.add(newWidget);
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
      if (!tracker.currentWidget) {
        return;
      }
      let widget = tracker.currentWidget;
      if (widget.scale > 1) {
        widget.scale += .5;
      } else {
        widget.scale *= 2;
      }
    }

    function zoomOut(): void {
      if (!tracker.currentWidget) {
        return;
      }
      let widget = tracker.currentWidget;
      if (widget.scale > 1) {
        widget.scale -= .5;
      } else {
        widget.scale /= 2;
      }
    }

    function resetZoom(): void {
      if (!tracker.currentWidget) {
        return;
      }
      let widget = tracker.currentWidget;
      widget.scale = 1;
    }
}
