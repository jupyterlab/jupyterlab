// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Token
} from '@phosphor/coreutils';

import {
  IInstanceTracker
} from '../apputils';

import {
  ImageWidget
} from './widget';

export * from './widget';


/**
 * The command IDs used by the image widget plugin.
 */
export
namespace CommandIDs {
  export
  const zoomIn: string = 'imagewidget:zoom-in';

  export
  const zoomOut: string = 'imagewidget:zoom-out';

  export
  const resetZoom: string = 'imagewidget:reset-zoom';
};


/**
 * A class that tracks editor widgets.
 */
export
interface IImageTracker extends IInstanceTracker<ImageWidget> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const IImageTracker = new Token<IImageTracker>('jupyter.services.image-tracker');
/* tslint:enable */


/**
 * Add the default commands for the image widget.
 */
export
function addDefaultCommands(tracker: IImageTracker, commands: CommandRegistry) {
  commands.addCommand(CommandIDs.zoomIn, {
    execute: zoomIn,
    label: 'Zoom In'
  });

  commands.addCommand(CommandIDs.zoomOut, {
    execute: zoomOut,
    label: 'Zoom Out'
  });

  commands.addCommand(CommandIDs.resetZoom, {
    execute: resetZoom,
    label: 'Reset Zoom'
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
