// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module imageviewer-extension
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import {
  IImageTracker,
  ImageViewer,
  ImageViewerFactory
} from '@jupyterlab/imageviewer';
import { ITranslator } from '@jupyterlab/translation';

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
const FILE_TYPES = ['png', 'gif', 'jpeg', 'bmp', 'ico', 'tiff'];

/**
 * The name of the factory that creates image widgets.
 */
const FACTORY = 'Image';

/**
 * The name of the factory that creates image widgets.
 */
const TEXT_FACTORY = 'Image (Text)';

/**
 * The list of file types for images with optional text modes.
 */
const TEXT_FILE_TYPES = ['svg', 'xbm'];

/**
 * The test pattern for text file types in paths.
 */
const TEXT_FILE_REGEX = new RegExp(`[.](${TEXT_FILE_TYPES.join('|')})$`);

/**
 * The image file handler extension.
 */
const plugin: JupyterFrontEndPlugin<IImageTracker> = {
  activate,
  description: 'Adds image viewer and provide its tracker.',
  id: '@jupyterlab/imageviewer-extension:plugin',
  provides: IImageTracker,
  requires: [ITranslator],
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
  translator: ITranslator,
  palette: ICommandPalette | null,
  restorer: ILayoutRestorer | null
): IImageTracker {
  const trans = translator.load('jupyterlab');
  const namespace = 'image-widget';

  function onWidgetCreated(
    sender: any,
    widget: IDocumentWidget<ImageViewer, DocumentRegistry.IModel>
  ) {
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
  }

  const factory = new ImageViewerFactory({
    name: FACTORY,
    label: trans.__('Image'),
    modelName: 'base64',
    fileTypes: [...FILE_TYPES, ...TEXT_FILE_TYPES],
    defaultFor: FILE_TYPES,
    readOnly: true
  });

  const textFactory = new ImageViewerFactory({
    name: TEXT_FACTORY,
    label: trans.__('Image (Text)'),
    modelName: 'text',
    fileTypes: TEXT_FILE_TYPES,
    defaultFor: TEXT_FILE_TYPES,
    readOnly: true
  });

  [factory, textFactory].forEach(factory => {
    app.docRegistry.addWidgetFactory(factory);
    factory.widgetCreated.connect(onWidgetCreated);
  });

  const tracker = new WidgetTracker<IDocumentWidget<ImageViewer>>({
    namespace
  });

  if (restorer) {
    // Handle state restoration.
    void restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({
        path: widget.context.path,
        factory: TEXT_FILE_REGEX.test(widget.context.path)
          ? TEXT_FACTORY
          : FACTORY
      }),
      name: widget => widget.context.path
    });
  }

  addCommands(app, tracker, translator);

  if (palette) {
    const category = trans.__('Image Viewer');
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
function addCommands(
  app: JupyterFrontEnd,
  tracker: IImageTracker,
  translator: ITranslator
): void {
  const trans = translator.load('jupyterlab');
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

  commands.addCommand(CommandIDs.zoomIn, {
    execute: zoomIn,
    label: trans.__('Zoom In'),
    isEnabled
  });

  commands.addCommand(CommandIDs.zoomOut, {
    execute: zoomOut,
    label: trans.__('Zoom Out'),
    isEnabled
  });

  commands.addCommand(CommandIDs.resetImage, {
    execute: resetImage,
    label: trans.__('Reset Image'),
    isEnabled
  });

  commands.addCommand(CommandIDs.rotateClockwise, {
    execute: rotateClockwise,
    label: trans.__('Rotate Clockwise'),
    isEnabled
  });

  commands.addCommand(CommandIDs.rotateCounterclockwise, {
    execute: rotateCounterclockwise,
    label: trans.__('Rotate Counterclockwise'),
    isEnabled
  });

  commands.addCommand(CommandIDs.flipHorizontal, {
    execute: flipHorizontal,
    label: trans.__('Flip image horizontally'),
    isEnabled
  });

  commands.addCommand(CommandIDs.flipVertical, {
    execute: flipVertical,
    label: trans.__('Flip image vertically'),
    isEnabled
  });

  commands.addCommand(CommandIDs.invertColors, {
    execute: invertColors,
    label: trans.__('Invert Colors'),
    isEnabled
  });

  const notify = () => {
    Object.values(CommandIDs).forEach(id => commands.notifyCommandChanged(id));
  };
  // All commands with isEnabled defined directly or in a semantic commands
  tracker.currentChanged.connect(notify);
  shell.currentChanged?.connect(notify);

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
