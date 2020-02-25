// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import {
  ImageViewer,
  ImageViewerFactory,
  IImageTracker
} from '@jupyterlab/imageviewer';

/**
 * The command IDs used by the image widget plugin.
 */
namespace CommandIDs {
  export const resetImage = 'imageviewer:reset-image';

  export const zoomIn = 'imageviewer:zoom-in';

  export const zoomOut = 'imageviewer:zoom-out';

  export const flipHorizontal = 'imageviewer:flip-horizontal';

  export const flipVertical = 'imageviewer:flip-vertical';

  export const rotateClockwise = 'imageviewer:rotate-clockwise';

  export const rotateCounterclockwise = 'imageviewer:rotate-counterclockwise';

  export const invertColors = 'imageviewer:invert-colors';
}

/**
 * The list of file types for images.
 */
const FILE_TYPES = ['png', 'gif', 'jpeg', 'svg', 'bmp', 'ico', 'xbm', 'tiff'];

/**
 * The name of the factory that creates image widgets.
 */
const FACTORY = 'Image';

/**
 * The image file handler extension.
 */
const plugin: JupyterFrontEndPlugin<IImageTracker> = {
  activate,
  id: '@jupyterlab/imageviewer-extension:plugin',
  provides: IImageTracker,
  optional: [ICommandPalette, ILayoutRestorer],
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * Activate the image widget extension.
 */
function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette | null,
  restorer: ILayoutRestorer | null
): IImageTracker {
  const namespace = 'image-widget';
  const factory = new ImageViewerFactory({
    name: FACTORY,
    modelName: 'base64',
    fileTypes: FILE_TYPES,
    defaultFor: FILE_TYPES,
    readOnly: true
  });
  const tracker = new WidgetTracker<IDocumentWidget<ImageViewer>>({
    namespace
  });

  if (restorer) {
    // Handle state restoration.
    void restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path
    });
  }

  app.docRegistry.addWidgetFactory(factory);

  factory.widgetCreated.connect((sender, widget) => {
    // Notify the widget tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      void tracker.save(widget);
    });
    void tracker.add(widget);

    const types = app.docRegistry.getFileTypesForPath(widget.context.path);

    if (types.length > 0) {
      widget.title.icon = types[0].icon!;
      widget.title.iconClass = types[0].iconClass ?? '';
      widget.title.iconLabel = types[0].iconLabel ?? '';
    }
  });

  addCommands(app, tracker);

  if (palette) {
    const category = 'Image Viewer';
    [
      CommandIDs.zoomIn,
      CommandIDs.zoomOut,
      CommandIDs.resetImage,
      CommandIDs.rotateClockwise,
      CommandIDs.rotateCounterclockwise,
      CommandIDs.flipHorizontal,
      CommandIDs.flipVertical,
      CommandIDs.invertColors
    ].forEach(command => {
      palette.addItem({ command, category });
    });
  }

  return tracker;
}

/**
 * Add the commands for the image widget.
 */
export function addCommands(app: JupyterFrontEnd, tracker: IImageTracker) {
  const { commands, shell } = app;

  /**
   * Whether there is an active image viewer.
   */
  function isEnabled(): boolean {
    return (
      tracker.currentWidget !== null &&
      tracker.currentWidget === shell.currentWidget
    );
  }

  commands.addCommand('imageviewer:zoom-in', {
    execute: zoomIn,
    label: 'Zoom In',
    isEnabled
  });

  commands.addCommand('imageviewer:zoom-out', {
    execute: zoomOut,
    label: 'Zoom Out',
    isEnabled
  });

  commands.addCommand('imageviewer:reset-image', {
    execute: resetImage,
    label: 'Reset Image',
    isEnabled
  });

  commands.addCommand('imageviewer:rotate-clockwise', {
    execute: rotateClockwise,
    label: 'Rotate Clockwise',
    isEnabled
  });

  commands.addCommand('imageviewer:rotate-counterclockwise', {
    execute: rotateCounterclockwise,
    label: 'Rotate Counterclockwise',
    isEnabled
  });

  commands.addCommand('imageviewer:flip-horizontal', {
    execute: flipHorizontal,
    label: 'Flip image horizontally',
    isEnabled
  });

  commands.addCommand('imageviewer:flip-vertical', {
    execute: flipVertical,
    label: 'Flip image vertically',
    isEnabled
  });

  commands.addCommand('imageviewer:invert-colors', {
    execute: invertColors,
    label: 'Invert Colors',
    isEnabled
  });

  function zoomIn(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.scale = widget.scale > 1 ? widget.scale + 0.5 : widget.scale * 2;
    }
  }

  function zoomOut(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.scale = widget.scale > 1 ? widget.scale - 0.5 : widget.scale / 2;
    }
  }

  function resetImage(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.scale = 1;
      widget.colorinversion = 0;
      widget.resetRotationFlip();
    }
  }

  function rotateClockwise(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.rotateClockwise();
    }
  }

  function rotateCounterclockwise(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.rotateCounterclockwise();
    }
  }

  function flipHorizontal(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.flipHorizontal();
    }
  }

  function flipVertical(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.flipVertical();
    }
  }

  function invertColors(): void {
    const widget = tracker.currentWidget?.content;

    if (widget) {
      widget.colorinversion += 1;
      widget.colorinversion %= 2;
    }
  }
}
