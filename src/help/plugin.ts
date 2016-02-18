// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';

import {
  IFrame
} from './iframe';


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
  let widget = new IFrame();
  widget.addClass(HELP_CLASS);
  widget.title.text = 'Help';
  widget.id = 'help-doc';

  let helpCommandItems = COMMANDS.map(command => {
    return {
      id: command.id,
      handler: () => {
        attachHelp();
        showHelp();
        widget.loadURL(command.url);
      }
    };
  });

  app.commands.add(helpCommandItems);

  app.commands.add([
    {
      id: 'help-doc:activate',
      handler: showHelp
    },
    {
      id: 'help-doc:hide',
      handler: hideHelp
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

  return Promise.resolve(void 0);

  function attachHelp(): void {
    if (!widget.isAttached) app.shell.addToRightArea(widget);
  }

  function showHelp(): void {
    app.shell.activateRight(widget.id);
  }

  function hideHelp(): void {
    if (!widget.isHidden) app.shell.collapseRight();
  }
}
