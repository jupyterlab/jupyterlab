// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  installMessageHook, Message
} from 'phosphor/lib/core/messaging';

import {
  WidgetMessage
} from 'phosphor/lib/ui/widget';

import {
  Menu
} from 'phosphor/lib/ui/menu';

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

import {
  IStateDB
} from '../statedb';


/**
 * A flag denoting whether the application is loaded over HTTPS.
 */
const LAB_IS_SECURE = window.location.protocol === 'https:';

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
    url: 'https://docs.scipy.org/doc/numpy/reference/'
  },
  {
    text: 'Scipy Reference',
    id: 'help-doc:scipy-reference',
    url: 'https://docs.scipy.org/doc/scipy/reference/'
  },
  {
    text: 'Notebook Tutorial',
    id: 'help-doc:notebook-tutorial',
    url: 'https://nbviewer.jupyter.org/github/jupyter/notebook/' +
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
    url: 'https://ipython.org/documentation.html?v=20160707164940'
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
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.help-handler',
  requires: [IMainMenu, ICommandPalette, IStateDB],
  activate: activateHelpHandler,
  autoStart: true
};


/**
 * Activate the help handler extension.
 *
 * @param app - The phosphide application object.
 *
 * returns A promise that resolves when the extension is activated.
 */
function activateHelpHandler(app: JupyterLab, mainMenu: IMainMenu, palette: ICommandPalette, state: IStateDB): void {
  const category = 'Help';
  const namespace = 'help-doc';
  const key = `${namespace}:show`;
  const iframe = newIFrame(namespace);
  const menu = createMenu();

  /**
   * Create a new IFrame widget.
   *
   * #### Notes
   * Once layout restoration is fully supported, the hidden state of the IFrame
   * widget will be handled by the layout restorer and not by the message hook
   * handler in this function.
   */
  function newIFrame(id: string): IFrame {
    let iframe = new IFrame();
    iframe.addClass(HELP_CLASS);
    iframe.title.label = category;
    iframe.id = id;

    // If the help widget is being hidden, remove its state.
    installMessageHook(iframe, (iframe: IFrame, msg: Message) => {
      if (msg === WidgetMessage.BeforeHide) {
        state.remove(key);
      }
      return true;
    });

    return iframe;
  }

  /**
   * Create a menu for the help plugin.
   */
  function createMenu(): Menu {
    let { commands, keymap } = app;
    let menu = new Menu({ commands, keymap });
    menu.title.label = category;

    menu.addItem({ command: 'about-jupyterlab:show' });
    menu.addItem({ command: 'faq-jupyterlab:show' });
    menu.addItem({ command: 'classic-notebook:open' });

    COMMANDS.forEach(item => menu.addItem({ command: item.id }));

    menu.addItem({ command: 'statedb:clear' });

    return menu;
  }

  /**
   * Attach the help iframe widget to the application shell.
   */
  function attachHelp(): void {
    if (!iframe.isAttached) {
      app.shell.addToRightArea(iframe);
    }
  }

  /**
   * Show the help widget.
   */
  function showHelp(): void {
    app.shell.activateRight(iframe.id);
    state.save(key, { url: iframe.url });
  }

  /**
   * Hide the help widget.
   */
  function hideHelp(): void {
    if (!iframe.isHidden) {
      app.shell.collapseRight();
    }
  }

  /**
   * Toggle whether the help widget is shown or hidden.
   */
  function toggleHelp(): void {
    if (iframe.isHidden) {
      showHelp();
    } else {
      hideHelp();
    }
  }

  COMMANDS.forEach(command => app.commands.addCommand(command.id, {
    label: command.text,
    execute: () => {
      // If help resource will generate a mixed content error, load externally.
      if (LAB_IS_SECURE && utils.urlParse(command.url).protocol !== 'https:') {
        window.open(command.url);
        return;
      }
      attachHelp();
      iframe.url = command.url;
      showHelp();
    }
  }));

  app.commands.addCommand(`${namespace}:activate`, {
    execute: () => { showHelp(); }
  });
  app.commands.addCommand(`${namespace}:hide`, {
    execute: () => { hideHelp(); }
  });
  app.commands.addCommand(`${namespace}:toggle`, {
    execute: () => { toggleHelp(); }
  });

  COMMANDS.forEach(item => palette.addItem({ command: item.id, category }));

  let openClassicNotebookId = 'classic-notebook:open';
  app.commands.addCommand(openClassicNotebookId, {
    label: 'Open Classic Notebook',
    execute: () => { window.open(utils.getBaseUrl() + 'tree'); }
  });
  palette.addItem({ command: openClassicNotebookId, category });
  mainMenu.addMenu(menu, {});

  state.fetch(key).then(args => {
    if (!args) {
      state.remove(key);
      return;
    }
    let url = args['url'] as string;
    let filtered = COMMANDS.filter(command => command.url === url);
    if (filtered.length) {
      let command = filtered[0];
      app.commands.execute(command.id, void 0);
    }
  });
}
