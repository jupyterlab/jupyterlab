// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  DocumentRegistry
} from '../docregistry';

import {
  WidgetTracker
} from '../widgettracker';

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
const imageHandlerExtension = {
  id: 'jupyter.extensions.imageHandler',
  requires: [DocumentRegistry],
  activate: activateImageWidget
};


/**
 * Activate the image widget extension.
 */
function activateImageWidget(app: Application, registry: DocumentRegistry): void {
    let zoomInImage = 'ImageWidget:zoomIn';
    let zoomOutImage = 'ImageWidget:zoomOut';
    let resetZoomImage = 'ImageWidget:resetZoom';
    let tracker = new WidgetTracker<ImageWidget>();

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
      tracker.addWidget(newWidget);
    });

    app.commands.add([
      {
        id: zoomInImage,
        handler: zoomIn
      },
      {
        id: zoomOutImage,
        handler: zoomOut
      },
      {
        id: resetZoomImage,
        handler: resetZoom
      }
    ]);
    app.palette.add([
      {
        command: zoomInImage,
        category: 'Image Widget',
        text: 'Zoom In',
      },
      {
        command: zoomOutImage,
        category: 'Image Widget',
        text: 'Zoom Out',
      },
      {
        command: resetZoomImage,
        category: 'Image Widget',
        text: 'Reset Zoom',
      },
    ]);

    function zoomIn(): void {
      if (!tracker.activeWidget) {
        return;
      }
      let widget = tracker.activeWidget;
      if (widget.scale > 1) {
        widget.scale += .5;
      } else {
        widget.scale *= 2;
      }
    }

    function zoomOut(): void {
      if (!tracker.activeWidget) {
        return;
      }
      let widget = tracker.activeWidget;
      if (widget.scale > 1) {
        widget.scale -= .5;
      } else {
        widget.scale /= 2;
      }
    }

    function resetZoom(): void {
      if (!tracker.activeWidget) {
        return;
      }
      let widget = tracker.activeWidget;
      widget.scale = 1;
    }
}
