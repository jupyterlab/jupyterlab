// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  CommandIDs as AboutCommandIDs
} from '../about';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IFrame
} from '../common/iframe';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  ICommandPalette
} from '../commandpalette';

import {
  CommandIDs as FAQCommandIDs
} from '../faq';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IMainMenu
} from '../mainmenu';

import {
  CommandIDs as StateDBCommandIDs
} from '../statedb';

import {
  CommandIDs
} from './';


/**
 * A flag denoting whether the application is loaded over HTTPS.
 */
const LAB_IS_SECURE = window.location.protocol === 'https:';

/**
 * The class name added to the help widget.
 */
const HELP_CLASS = 'jp-Help';

/**
 * A list of help resources.
 */

const RESOURCES = [
  {
    text: 'Scipy Lecture Notes',
    url: 'http://www.scipy-lectures.org/'
  },
  {
    text: 'Numpy Reference',
    url: 'https://docs.scipy.org/doc/numpy/reference/'
  },
  {
    text: 'Scipy Reference',
    url: 'https://docs.scipy.org/doc/scipy/reference/'
  },
  {
    text: 'Notebook Tutorial',
    url: 'https://nbviewer.jupyter.org/github/jupyter/notebook/' +
      'blob/master/docs/source/examples/Notebook/Notebook Basics.ipynb'
  },
  {
    text: 'Python Reference',
    url: 'https://docs.python.org/3.5/'
  },
  {
    text: 'IPython Reference',
    url: 'https://ipython.org/documentation.html?v=20160707164940'
  },
  {
    text: 'Matplotlib Reference',
    url: 'http://matplotlib.org/contents.html?v=20160707164940'
  },
  {
    text: 'SymPy Reference',
    url: 'http://docs.sympy.org/latest/index.html?v=20160707164940'
  },
  {
    text: 'Pandas Reference',
    url: 'http://pandas.pydata.org/pandas-docs/stable/?v=20160707164940'
  },
  {
    text: 'Markdown Reference',
    url: 'https://help.github.com/articles/' +
      'getting-started-with-writing-and-formatting-on-github/'
  }
];

RESOURCES.sort((a: any, b: any) => {
  return a.text.localeCompare(b.text);
});


/**
 * The help handler extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.help-handler',
  requires: [IMainMenu, ICommandPalette, IInstanceRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the help handler extension.
 *
 * @param app - The phosphide application object.
 *
 * returns A promise that resolves when the extension is activated.
 */
function activate(app: JupyterLab, mainMenu: IMainMenu, palette: ICommandPalette, restorer: IInstanceRestorer): void {
  let iframe: IFrame = null;
  const category = 'Help';
  const namespace = 'help-doc';
  const command = CommandIDs.open;
  const menu = createMenu();
  const tracker = new InstanceTracker<IFrame>({ namespace });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: widget => ({ isHidden: widget.isHidden, url: widget.url }),
    name: widget => namespace
  });

  /**
   * Create a new IFrame widget.
   */
  function newIFrame(url: string): IFrame {
    let iframe = new IFrame();
    iframe.addClass(HELP_CLASS);
    iframe.title.label = category;
    iframe.id = `${namespace}`;
    iframe.url = url;
    return iframe;
  }

  /**
   * Create a menu for the help plugin.
   */
  function createMenu(): Menu {
    let { commands, keymap } = app;
    let menu = new Menu({ commands, keymap });
    menu.title.label = category;

    menu.addItem({ command: AboutCommandIDs.open });
    menu.addItem({ command: FAQCommandIDs.open });
    menu.addItem({ command: CommandIDs.launchClassic });
    menu.addItem({ type: 'separator' });
    RESOURCES.forEach(args => { menu.addItem({ args, command }); });
    menu.addItem({ type: 'separator' });
    menu.addItem({ command: CommandIDs.close });
    menu.addItem({ command: StateDBCommandIDs.clear });

    return menu;
  }

  /**
   * Show the help widget.
   */
  function showHelp(): void {
    if (!iframe) {
      return;
    }
    app.shell.activateRight(iframe.id);
  }

  /**
   * Hide the help widget.
   */
  function hideHelp(): void {
    if (iframe && !iframe.isHidden) {
      app.shell.collapseRight();
    }
  }

  app.commands.addCommand(command, {
    label: args => args['text'] as string,
    execute: args => {
      const url = args['url'] as string;
      const isHidden = args['isHidden'] as boolean || false;

      // If help resource will generate a mixed content error, load externally.
      if (LAB_IS_SECURE && utils.urlParse(url).protocol !== 'https:') {
        window.open(url);
        return;
      }

      if (iframe) {
        iframe.url = url;
      } else {
        iframe = newIFrame(url);
        tracker.add(iframe);
      }

      tracker.save(iframe);

      if (!iframe.isAttached) {
        app.shell.addToRightArea(iframe);
      }

      if (isHidden) {
        hideHelp();
      } else {
        showHelp();
      }
    }
  });

  app.commands.addCommand(CommandIDs.close, {
    label: 'Close Help',
    execute: () => {
      if (iframe) {
        iframe.dispose();
        iframe = null;
      }
    }
  });

  app.commands.addCommand(CommandIDs.toggle, {
    execute: () => {
      if (!iframe) {
        return;
      }
      if (iframe.isHidden) {
        showHelp();
      } else {
        hideHelp();
      }
    }
  });

  app.commands.addCommand(CommandIDs.launchClassic, {
    label: 'Launch Classic Notebook',
    execute: () => { window.open(utils.getBaseUrl() + 'tree'); }
  });

  app.commands.addCommand(CommandIDs.show, { execute: showHelp });
  app.commands.addCommand(CommandIDs.hide, { execute: hideHelp });

  RESOURCES.forEach(args => { palette.addItem({ args, command, category }); });
  palette.addItem({ command: CommandIDs.close, category });
  palette.addItem({ command: StateDBCommandIDs.clear, category });
  palette.addItem({ command: CommandIDs.launchClassic, category });

  mainMenu.addMenu(menu, {});
}
