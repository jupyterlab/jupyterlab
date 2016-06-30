// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  IFrame
} from './iframe';


import {
 CommandPalette, IStandardPaletteItemOptions, StandardPaletteModel
} from 'phosphor-commandpalette';


import {
  Widget
} from 'phosphor-widget';

import 'jupyterlab/lib/default-theme/index.css';


/**
 * The class name added to the help widget.
 */
const HELP_CLASS = 'jp-Help';


/**
 * A list of commands to add to the help widget.
 */
const COMMANDS = [
  {
    text: 'Scipy Lecture Notes',
    id: 'help-doc:scipy-lecture-notes',
    url: 'http://www.scipy-lectures.org/'
  },
  {
    text: 'Numpy Reference',
    id: 'help-doc:numpy-reference',
    url: 'http://docs.scipy.org/doc/numpy/reference/'
  },
  {
    text: 'Scipy Reference',
    id: 'help-doc:scipy-reference',
    url: 'http://docs.scipy.org/doc/scipy/reference/'
  },
  {
    text: 'Notebook Tutorial',
    id: 'help-doc:notebook-tutorial',
    url: 'http://nbviewer.jupyter.org/github/jupyter/notebook/' +
      'blob/master/docs/source/examples/Notebook/Notebook Basics.ipynb'
  }
];


/**
 * The help handler extension.
 */
export
const helpHandlerExtension = {
  id: 'jupyter.extensions.helpHandler',
  activate: activateHelpHandler
};


/**
 * Activate the help handler extension.
 *
 * @param app - The phosphide application object.
 *
 * returns A promise that resolves when the extension is activated.
 */
function activateHelpHandler(app: Application): Promise<void> {
  let helpPalette = new CommandPalette();
  let mPalette = new StandardPaletteModel();
  helpPalette.title.text = 'Help';
  helpPalette.id = 'help-doc';

  let widget = new IFrame();
  widget.addClass(HELP_CLASS);
  widget.id = 'help-doc'; 
  let helpCommandItems = COMMANDS.map(command => {
    return {
      id: command.id,
      handler: () => {
        widget.title.text = command.text;
        widget.title.closable = true;

        widget.loadURL(command.url);
        app.shell.addToMainArea(widget);
        let stack = widget.parent;
        if (!stack) {
          return;
        }
        let tabs = stack.parent;
        if (tabs instanceof TabPanel) {
          tabs.currentWidget = widget;
        }
      }
    };
  });

  let mainHelpPaletteItems = COMMANDS.map(command => {
    return {
      id: command.id,
      text: command.text,
      caption: `Open ${command.text}`,
      category: 'Help',
      handler: () => {
        widget.title.text = command.text;
        widget.title.closable = true;        

        widget.loadURL(command.url);
        app.shell.addToMainArea(widget);
        let stack = widget.parent;
        if (!stack) {
           return;
        }
        let tabs = stack.parent;
        if (tabs instanceof TabPanel) {
           tabs.currentWidget = widget;
        }
      }
    };
  });

  mPalette.addItems(mainHelpPaletteItems);
  helpPalette.model = mPalette;

  app.commands.add(helpCommandItems);

  app.commands.add([
    {
      id: 'help-doc:activate',
      handler: showHelp
    },
    {
      id: 'help-doc:hide',
      handler: hideHelp
    },
    {
      id: 'help-doc:toggle',
      handler: toggleHelp
    }
  ]);

  let helpPaletteItems = COMMANDS.map(command => {
    return {
      command: command.id,
      text: command.text,
      caption: `Open ${command.text}`,
      category: 'Help'
    };
  });

  app.palette.add(helpPaletteItems);
  attachHelp();

  return Promise.resolve(void 0);

  function attachHelp(): void {
    if (!helpPalette.isAttached) app.shell.addToLeftArea(helpPalette, {rank: 101});
  }

  function showHelp(): void {
    app.shell.activateLeft(helpPalette.id);
  }

  function hideHelp(): void {
    if (!helpPalette.isHidden) app.shell.collapseLeft();
  }

  function toggleHelp(): void {
    if (helpPalette.isHidden) {
      showHelp();
    } else {
      hideHelp();
    }
  }
}
