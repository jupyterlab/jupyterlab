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
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IFrame
} from '../iframe';

import {
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IMainMenu
} from '../mainmenu';


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
export
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.help-handler',
  requires: [IMainMenu, ICommandPalette, ILayoutRestorer],
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
function activateHelpHandler(app: JupyterLab, mainMenu: IMainMenu, palette: ICommandPalette, layout: ILayoutRestorer): void {
  let iframe: IFrame = null;
  const category = 'Help';
  const namespace = 'help-doc';
  const command = `${namespace}:open`;
  const menu = createMenu();
  const tracker = new InstanceTracker<IFrame>({ namespace });

  // Handle state restoration.
  layout.restore(tracker, {
    command,
    args: widget => ({ isHidden: widget.isHidden, url: widget.url }),
    name: widget => namespace
  });

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

    RESOURCES.forEach(args => { menu.addItem({ args, command }); });

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
      if (!iframe) {
        iframe = newIFrame(namespace);
        iframe.url = url;

        // Add the iframe to the instance tracker.
        tracker.add(iframe, { area: 'right' });

        // If the help widget visibility changes, update the tracker.
        installMessageHook(iframe, (iframe: IFrame, msg: Message) => {
          switch (msg) {
            case WidgetMessage.AfterShow:
            case WidgetMessage.BeforeHide:
              requestAnimationFrame(() => { tracker.save(iframe); });
              break;
            default:
              break;
          }
          return true;
        });
      }

      attachHelp();
      if (isHidden) {
        hideHelp();
      } else {
        showHelp();
      }
    }
  });

  app.commands.addCommand(`${namespace}:activate`, {
    execute: () => { showHelp(); }
  });
  app.commands.addCommand(`${namespace}:hide`, {
    execute: () => { hideHelp(); }
  });
  app.commands.addCommand(`${namespace}:toggle`, {
    execute: () => { toggleHelp(); }
  });

  RESOURCES.forEach(args => { palette.addItem({ args, command, category }); });

  let openClassicNotebookId = 'classic-notebook:open';
  app.commands.addCommand(openClassicNotebookId, {
    label: 'Open Classic Notebook',
    execute: () => { window.open(utils.getBaseUrl() + 'tree'); }
  });
  palette.addItem({ command: openClassicNotebookId, category });
  mainMenu.addMenu(menu, {});
}
