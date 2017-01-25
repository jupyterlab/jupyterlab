// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  installMessageHook, Message
} from 'phosphor/lib/core/messaging';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  WidgetMessage
} from 'phosphor/lib/ui/widget';

import {
  cmdIds as aboutCmdIds
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
  cmdIds as faqCmdIds
} from '../faq';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IMainMenu
} from '../mainmenu';

import {
  cmdIds as statedbCmdIds
} from '../statedb';

import {
  cmdIds
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
  const command = cmdIds.open;
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
    // Add the iframe to the instance tracker.
    tracker.add(iframe);

    // If the help widget visibility changes, update the tracker.
    installMessageHook(iframe, (iframe: IFrame, msg: Message) => {
      switch (msg) {
        case WidgetMessage.AfterShow:
        case WidgetMessage.BeforeHide:
          // Wait until hide has completed.
          requestAnimationFrame(() => { tracker.save(iframe); });
          break;
        default:
          break;
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

    menu.addItem({ command: aboutCmdIds.show });
    menu.addItem({ command: faqCmdIds.show });
    menu.addItem({ command: cmdIds.openClassic });

    RESOURCES.forEach(args => { menu.addItem({ args, command }); });

    menu.addItem({ command: statedbCmdIds.clear });

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
        tracker.save(iframe);
      } else {
        iframe = newIFrame(url);
      }
      attachHelp();
      if (isHidden) {
        hideHelp();
      } else {
        showHelp();
      }
    }
  });

  app.commands.addCommand(cmdIds.show, {
    execute: () => { showHelp(); }
  });
  app.commands.addCommand(cmdIds.hide, {
    execute: () => { hideHelp(); }
  });
  app.commands.addCommand(cmdIds.toggle, {
    execute: () => { toggleHelp(); }
  });

  RESOURCES.forEach(args => { palette.addItem({ args, command, category }); });

  palette.addItem({ command: statedbCmdIds.clear, category });

  let openClassicNotebookId = cmdIds.openClassic;
  app.commands.addCommand(openClassicNotebookId, {
    label: 'Open Classic Notebook',
    execute: () => { window.open(utils.getBaseUrl() + 'tree'); }
  });
  palette.addItem({ command: openClassicNotebookId, category });
  mainMenu.addMenu(menu, {});
}
