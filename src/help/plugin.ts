// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  MenuItem, Menu
} from 'phosphor-menus';

import {
  Widget
} from 'phosphor-widget';

import {
  IFrame
} from '../iframe';

import {
  MainMenu
} from '../mainmenu/plugin';



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
const helpHandlerExtension = {
  id: 'jupyter.extensions.help-handler',
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
  let iframe = new IFrame();
  iframe.addClass(HELP_CLASS);
  iframe.title.text = 'Help';
  iframe.id = 'help-doc';

  let helpCommandItems = COMMANDS.map(command => {
    return {
      id: command.id,
      handler: () => {
        Private.attachHelp(app, iframe);
        Private.showHelp(app, iframe);
        iframe.loadURL(command.url);
      }
    };
  });

  app.commands.add(helpCommandItems);

  app.commands.add([
    {
      id: 'help-doc:activate',
      handler: () => { Private.showHelp(app, iframe); }
    },
    {
      id: 'help-doc:hide',
      handler: () => { Private.hideHelp(app, iframe); }
    },
    {
      id: 'help-doc:toggle',
      handler: () => { Private.toggleHelp(app, iframe); }
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
      text: 'Frequently Asked Questions',
      handler: () => {
        app.commands.execute('faq-jupyterlab:show');
      }
    }),
    new MenuItem({
      text: 'Notebook Tutorial',
      handler: () => {
        app.commands.execute('help-doc:notebook-tutorial');
      }
    }),
    new MenuItem({
      type: MenuItem.Separator
    }),
    new MenuItem({
      text: 'IPython Reference',
      handler: () => {
        app.commands.execute('help-doc:ipython-reference');
      }
    }),
    new MenuItem({
      text: 'Markdown Reference',
      handler: () => {
        app.commands.execute('help-doc:markdown-reference');
      }
    }),
    new MenuItem({
      text: 'Matplotlib Reference',
      handler: () => {
        app.commands.execute('help-doc:mathplotlib-reference');
      }
    }),
    new MenuItem({
      text: 'Numpy Reference',
      handler: () => {
        app.commands.execute('help-doc:numpy-reference');
      }
    }),
    new MenuItem({
      text: 'Pandas Reference',
      handler: () => {
        app.commands.execute('help-doc:pandas-reference');
      }
    }),
    new MenuItem({
      text: 'Python Reference',
      handler: () => {
        app.commands.execute('help-doc:python-reference');
      }
    }),
    new MenuItem({
      text: 'Scipy Lecture Notes',
      handler: () => {
        app.commands.execute('help-doc:scipy-lecture-notes');
      }
    }),
    new MenuItem({
      text: 'Scipy Reference',
      handler: () => {
        app.commands.execute('help-doc:scipy-reference');
      }
    }),
    new MenuItem({
      text: 'SymPy Reference',
      handler: () => {
        app.commands.execute('help-doc:sympy-reference');
      }
    })
  ]);


  let helpMenu = new MenuItem({ text: 'Help', submenu: menu });

  mainMenu.addItem(helpMenu);

  return Promise.resolve(void 0);
}


/**
 * A namespace for help plugin private functions.
 */
namespace Private {
  /**
   * Attach the help iframe widget to the application shell.
   */
  export
  function attachHelp(app: Application, iframe: Widget): void {
    if (!iframe.isAttached) {
      app.shell.addToRightArea(iframe);
    }
  }

  /**
   * Show the help widget.
   */
  export
  function showHelp(app: Application, iframe: Widget): void {
    app.shell.activateRight(iframe.id);
  }

  /**
   * Hide the help widget.
   */
  export
  function hideHelp(app: Application, iframe: Widget): void {
    if (!iframe.isHidden) {
      app.shell.collapseRight();
    }
  }

  /**
   * Toggle whether the help widget is shown or hidden.
   */
  export
  function toggleHelp(app: Application, iframe: Widget): void {
    if (iframe.isHidden) {
      showHelp(app, iframe);
    } else {
      hideHelp(app, iframe);
    }
  }
}
