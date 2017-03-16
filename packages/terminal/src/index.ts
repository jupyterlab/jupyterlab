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
} from '@jupyterlab/apputils';

import {
  TerminalWidget
} from './widget';

export * from './widget';

/**
 * A class that tracks editor widgets.
 */
export
interface ITerminalTracker extends IInstanceTracker<TerminalWidget> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const ITerminalTracker = new Token<ITerminalTracker>('jupyter.services.terminal-tracker');
/* tslint:enable */


/**
 * Add the default commands for the editor.
 */
export
function addDefaultCommands(tracker: ITerminalTracker, commands: CommandRegistry) {

  commands.addCommand('terminal:increase-font', {
    label: 'Increase Terminal Font Size',
    execute: () => {
      let options = TerminalWidget.defaultOptions;
      if (options.fontSize < 72) {
        options.fontSize++;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    }
  });

  commands.addCommand('terminal:decrease-font', {
    label: 'Decrease Terminal Font Size',
    execute: () => {
      let options = TerminalWidget.defaultOptions;
      if (options.fontSize > 9) {
        options.fontSize--;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    }
  });

  commands.addCommand('terminal:toggle-theme', {
    label: 'Toggle Terminal Theme',
    caption: 'Switch Terminal Background and Font Colors',
    execute: () => {
      let options = TerminalWidget.defaultOptions;
      if (options.background === 'black') {
        options.background = 'white';
        options.color = 'black';
      } else {
        options.background = 'black';
        options.color = 'white';
      }
      tracker.forEach(widget => {
        widget.background = options.background;
        widget.color = options.color;
      });
    }
  });
}
