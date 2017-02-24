// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/application';

import {
  IInstanceTracker
} from '../common/instancetracker';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  TerminalWidget
} from './widget';

export * from './widget';


/**
 * The command IDs used by the terminal plugin.
 */
export
namespace CommandIDs {
  export
  const createNew: string = 'terminal:create-new';

  export
  const open: string = 'terminal:open';

  export
  const refresh: string = 'terminal:refresh';

  export
  const increaseFont: string = 'terminal:increase-font';

  export
  const decreaseFont: string = 'terminal:decrease-font';

  export
  const toggleTheme: string = 'terminal:toggle-theme';
};


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

  commands.addCommand(CommandIDs.increaseFont, {
    label: 'Increase Terminal Font Size',
    execute: () => {
      let options = TerminalWidget.defaultOptions;
      if (options.fontSize < 72) {
        options.fontSize++;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    }
  });

  commands.addCommand(CommandIDs.decreaseFont, {
    label: 'Decrease Terminal Font Size',
    execute: () => {
      let options = TerminalWidget.defaultOptions;
      if (options.fontSize > 9) {
        options.fontSize--;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    }
  });

  commands.addCommand(CommandIDs.toggleTheme, {
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
