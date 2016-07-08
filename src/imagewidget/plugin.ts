// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DocumentRegistry
} from '../docregistry';

import {
  ImageWidgetFactory
} from './widget';

import {
  Application
} from 'phosphide/lib/core/application';
import {
  WidgetTracker
} from '../widgettracker';
import {
  ImageWidget
} from './widget.ts';


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

function activateImageWidget (app: Application, registry: DocumentRegistry): void {
    let zoomInImage = 'ImageWidget:zoomIn';
    let zoomOutImage = 'ImageWidget:zoomOut';
    let resetZoomImage = 'ImageWidget:resetZoom';
    let tracker = new WidgetTracker<ImageWidget>();

    let scale = 1.0;

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
        if (scale > 1) {
            scale += .5;
        } else {
            scale *= 2;
        }
        tracker.activeWidget.levelZoom(scale);

    }
    function zoomOut(): void {
        if (scale > 1) {
            scale -= .5;
        } else {
            scale /= 2;
        }
        tracker.activeWidget.levelZoom(scale);
    }
    function resetZoom(): void {
        scale = 1;
        tracker.activeWidget.levelZoom(scale);
    }
}
