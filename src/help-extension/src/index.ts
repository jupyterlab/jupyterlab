// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  Message
} from '@phosphor/messaging';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IFrameWidget, ILayoutRestorer, InstanceTracker,
  IMainMenu
} from '@jupyterlab/apputils';

import {
  URLExt
} from '@jupyterlab/coreutils';


/**
 * The command IDs used by the help plugin.
 */
namespace CommandIDs {
  export
  const open = 'help-jupyterlab:open';

  export
  const activate = 'help-jupyterlab:activate';

  export
  const close = 'help-jupyterlab:close';

  export
  const show = 'help-jupyterlab:show';

  export
  const hide = 'help-jupyterlab:hide';

  export
  const toggle = 'help-jupyterlab:toggle';

  export
  const launchClassic = 'classic-notebook:launchClassic';
};


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
  requires: [IMainMenu, ICommandPalette, ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;

/*
  * An IFrameWidget the disposes itself when closed.
  *
  * This is needed to clear the state restoration db when IFrames are closed.
 */
class ClosableIFrame extends IFrameWidget {

  /**
   * Dispose of the IFrameWidget when closing.
   */
  protected onCloseRequest(msg: Message): void {
    this.dispose();
  }
}


/**
 * Activate the help handler extension.
 *
 * @param app - The phosphide application object.
 *
 * returns A promise that resolves when the extension is activated.
 */
function activate(app: JupyterLab, mainMenu: IMainMenu, palette: ICommandPalette, restorer: ILayoutRestorer): void {
  let counter = 0;
  const category = 'Help';
  const namespace = 'help-doc';
  const command = CommandIDs.open;
  const menu = createMenu();
  const { commands, shell } = app;
  const tracker = new InstanceTracker<ClosableIFrame>({ namespace, shell });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: widget => ({ url: widget.url, text: widget.title.label }),
    name: widget => widget.url
  });

  /**
   * Create a new ClosableIFrame widget.
   */
  function newClosableIFrame(url: string, text: string): ClosableIFrame {
    let iframe = new ClosableIFrame();
    iframe.addClass(HELP_CLASS);
    iframe.title.label = text;
    iframe.title.closable = true;
    iframe.id = `${namespace}-${++counter}`;
    iframe.url = url;
    tracker.add(iframe);
    return iframe;
  }

  /**
   * Create a menu for the help plugin.
   */
  function createMenu(): Menu {
    let { commands } = app;
    let menu = new Menu({ commands });
    menu.title.label = category;

    menu.addItem({ command: 'about-jupyterlab:open' });
    menu.addItem({ command: 'faq-jupyterlab:open' });
    menu.addItem({ command: CommandIDs.launchClassic });
    menu.addItem({ type: 'separator' });
    RESOURCES.forEach(args => { menu.addItem({ args, command }); });
    menu.addItem({ type: 'separator' });
    menu.addItem({ command: 'statedb:clear' });

    return menu;
  }

  commands.addCommand(command, {
    label: args => args['text'] as string,
    execute: args => {
      const url = args['url'] as string;
      const text = args['text'] as string;

      // If help resource will generate a mixed content error, load externally.
      if (LAB_IS_SECURE && URLExt.parse(url).protocol !== 'https:') {
        window.open(url);
        return;
      }

      let iframe = newClosableIFrame(url, text);
      shell.addToMainArea(iframe);
      tracker.activate(iframe);
    }
  });


  commands.addCommand(CommandIDs.launchClassic, {
    label: 'Launch Classic Notebook',
    execute: () => { window.open(utils.getBaseUrl() + 'tree'); }
  });

  RESOURCES.forEach(args => { palette.addItem({ args, command, category }); });
  palette.addItem({ command: 'statedb:clear', category });
  palette.addItem({ command: CommandIDs.launchClassic, category });

  mainMenu.addMenu(menu);
}
