// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  IFrame
} from '../iframe';

import {
  MainMenu, mainMenuProvider
} from '../mainmenu/plugin';

import {
  MenuItem, Menu, IMenuItemOptions, MenuItemType
} from 'phosphor-menus';



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
  },
  {
    text: 'Python Reference',
    id: 'help-doc:python-reference',
    url: 'https://docs.python.org/3.5/'
  },
  {
    text: 'IPython Reference',
    id: 'help-doc:ipython-reference',
    url: 'http://ipython.org/documentation.html?v=20160707164940'
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
    url: 'https://help.github.com/articles/getting-started-with-writing-and-formatting-on-github/'
  }
];


/**
 * The help handler extension.
 */
export
const helpHandlerExtension = {
  id: 'jupyter.extensions.helpHandler',
  requires: [MainMenu],
  activate: activateHelpHandler
};


/**
 * Activate the help handler extension.
 *
 * @param app - The phosphide application object.
 *
 * returns A promise that resolves when the extension is activated.
 */
function activateHelpHandler(app: Application, mainMenu: MainMenu): Promise<void> {
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
  //console.log(JSON.stringify(helpCommandItems));
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



  let menu = new Menu([
    new MenuItem({
      text: 'About JupyterLab',
      handler: () => {
        app.commands.execute('about-jupyterlab:show');
      }
    }),
    new MenuItem({
      type: MenuItem.Separator
    }),
    new MenuItem({
      text: 'Notebook Tutorial',
      handler: () => {
        handleMenu('http://nbviewer.jupyter.org/github/jupyter/notebook/' +
        'blob/master/docs/source/examples/Notebook/Notebook Basics.ipynb');
      }
    }),
    new MenuItem({
      type: MenuItem.Separator
    }),
    new MenuItem({
      text: 'IPython Reference',
      handler: () => {
        handleMenu('http://ipython.org/documentation.html?v=20160707164940');
      }
    }),
    new MenuItem({
      text: 'Markdown Reference',
      handler: () => {
        handleMenu('http://help.github.com/articles/getting-started-with-writing-and-formatting-on-github/');
      }
    }),
    new MenuItem({
      text: 'Matplotlib Reference',
      handler: () => {
        handleMenu('http://matplotlib.org/contents.html?v=20160707164940');
      }
    }),
    new MenuItem({
      text: 'Numpy Reference',
      handler: () => {
        handleMenu('http://docs.scipy.org/doc/numpy/reference/');
      }
    }),
    new MenuItem({
      text: 'Pandas Reference',
      handler: () => {
        handleMenu('http://pandas.pydata.org/pandas-docs/stable/?v=20160707164940');
      }
    }),
    new MenuItem({
      text: 'Python Reference',
      handler: () => {
        handleMenu('https://docs.python.org/3.5/');
      }
    }),
    new MenuItem({
      text: 'Scipy Lecture Notes',
      handler: () => {
        handleMenu('http://www.scipy-lectures.org/');
      }
    }),
    new MenuItem({
      text: 'Scipy Reference',
      handler: () => {
        handleMenu('http://docs.scipy.org/doc/scipy/reference/');
      }
    }),
    new MenuItem({
      text: 'SymPy Reference',
      handler: () => {
        handleMenu('http://docs.sympy.org/latest/index.html?v=20160707164940');
      }
    })
  ]);


  let helpMenu = new MenuItem ({
    text: 'Help',
    submenu: menu
  });

  mainMenu.addItem(helpMenu);

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

  function toggleHelp(): void {
    if (widget.isHidden) {
      showHelp();
    } else {
      hideHelp();
    }
  }

  function handleMenu(url: string): void {
    attachHelp();
    showHelp();
    widget.loadURL(url);
  }
}
