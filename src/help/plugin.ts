// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IFrame
} from '../iframe';

import {
  IMainMenu
} from '../mainmenu';


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
    url: '//docs.scipy.org/doc/numpy/reference/'
  },
  {
    text: 'Scipy Reference',
    id: 'help-doc:scipy-reference',
    url: '//docs.scipy.org/doc/scipy/reference/'
  },
  {
    text: 'Notebook Tutorial',
    id: 'help-doc:notebook-tutorial',
    url: '//nbviewer.jupyter.org/github/jupyter/notebook/' +
      'blob/master/docs/source/examples/Notebook/Notebook Basics.ipynb'
  },
  {
    text: 'Python Reference',
    id: 'help-doc:python-reference',
    url: '//docs.python.org/3.5/'
  },
  {
    text: 'IPython Reference',
    id: 'help-doc:ipython-reference',
    url: '//ipython.org/documentation.html?v=20160707164940'
  },
  {
    text: 'Matplotlib Reference',
    id: 'help-doc:mathplotlib-reference',
    url: 'http://matplotlib.org/contents.html?v=20160707164940'
  },
  {
    text: 'SymPy Reference',
    id: 'help-doc:sympy-reference',
    url: 'http://docs.sympy.org/latest/index.html?v=20160707164940'
  },
  {
    text: 'Pandas Reference',
    id: 'help-doc:pandas-reference',
    url: 'http://pandas.pydata.org/pandas-docs/stable/?v=20160707164940'
  },
  {
    text: 'Markdown Reference',
    id: 'help-doc:markdown-reference',
    url: '//help.github.com/articles/getting-started-with-writing-and-formatting-on-github/'
  }
];


/**
 * The help handler extension.
 */
export
const helpHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.help-handler',
  requires: [IMainMenu, ICommandPalette],
  activate: activateHelpHandler
};


/**
 * Activate the help handler extension.
 *
 * @param app - The phosphide application object.
 *
 * returns A promise that resolves when the extension is activated.
 */
function activateHelpHandler(app: JupyterLab, mainMenu: IMainMenu, palette: ICommandPalette): Promise<void> {
  let iframe = new IFrame();
  iframe.addClass(HELP_CLASS);
  iframe.title.label = 'Help';
  iframe.id = 'help-doc';

  COMMANDS.forEach(command => app.commands.addCommand(command.id, {
    execute: () => {
      Private.attachHelp(app, iframe);
      Private.showHelp(app, iframe);
      iframe.loadURL(command.url);
    }
  }));

  app.commands.addCommand('help-doc:activate', {
    execute: () => { Private.showHelp(app, iframe); }
  });
  app.commands.addCommand('help-doc:hide', {
    execute: () => { Private.hideHelp(app, iframe); }
  });
  app.commands.addCommand('help-doc:toggle', {
    execute: () => { Private.toggleHelp(app, iframe); }
  });

  COMMANDS.forEach(item => palette.addItem({
    command: item.id,
    category: 'Help'
  }));

  let menu = Private.createMenu(app);
  mainMenu.addMenu(menu, {});

  return Promise.resolve(void 0);
}


/**
 * A namespace for help plugin private functions.
 */
namespace Private {
  /**
   * Creates a menu for the help plugin.
   */
  export
  function createMenu(app: JupyterLab): Menu {
    let { commands, keymap } = app;
    let menu = new Menu({ commands, keymap });
    menu.title.label = 'Help';
    menu.addItem({ command: 'about-jupyterlab:show' });
    menu.addItem({ command: 'faq-jupyterlab:show' });

    COMMANDS.forEach(item => menu.addItem({ command: item.id }));
    return menu;
  }

  /**
   * Attach the help iframe widget to the application shell.
   */
  export
  function attachHelp(app: JupyterLab, iframe: Widget): void {
    if (!iframe.isAttached) {
      app.shell.addToRightArea(iframe);
    }
  }

  /**
   * Show the help widget.
   */
  export
  function showHelp(app: JupyterLab, iframe: Widget): void {
    app.shell.activateRight(iframe.id);
  }

  /**
   * Hide the help widget.
   */
  export
  function hideHelp(app: JupyterLab, iframe: Widget): void {
    if (!iframe.isHidden) {
      app.shell.collapseRight();
    }
  }

  /**
   * Toggle whether the help widget is shown or hidden.
   */
  export
  function toggleHelp(app: JupyterLab, iframe: Widget): void {
    if (iframe.isHidden) {
      showHelp(app, iframe);
    } else {
      hideHelp(app, iframe);
    }
  }
}
