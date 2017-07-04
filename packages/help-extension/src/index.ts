// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, IFrame, IMainMenu, InstanceTracker, showDialog
} from '@jupyterlab/apputils';

import {
  PageConfig, URLExt
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  h, VirtualDOM
} from '@phosphor/virtualdom';

import {
  Menu, PanelLayout, Widget
} from '@phosphor/widgets';

import '../style/index.css';

/**
 * The command IDs used by the help plugin.
 */
namespace CommandIDs {
  export
  const open = 'help:open';

  export
  const about = 'help:about';

  export
  const activate = 'help:activate';

  export
  const close = 'help:close';

  export
  const show = 'help:show';

  export
  const hide = 'help:hide';

  export
  const toggle = 'help:toggle';

  export
  const launchClassic = 'help:launch-classic-notebook';
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
    text: 'Notebook Reference',
    url: 'https://jupyter-notebook.readthedocs.io/en/latest/'
  },
  {
    text: 'IPython Reference',
    url: 'http://ipython.readthedocs.io/en/stable/'
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
    text: 'Python Reference',
    url: 'https://docs.python.org/3.5/'
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
  * An IFrame the disposes itself when closed.
  *
  * This is needed to clear the state restoration db when IFrames are closed.
 */
class HelpWidget extends Widget {
  /**
   * Construct a new help widget.
   */
  constructor(url: string) {
    super();
    let layout = this.layout = new PanelLayout();
    let iframe = new IFrame();
    iframe.url = url;
    layout.addWidget(iframe);
  }

  /**
   * Dispose of the IFrame when closing.
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
  const menu = createMenu();
  const { commands, shell, info} = app;
  const tracker = new InstanceTracker<HelpWidget>({ namespace });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: widget => ({ url: widget.url, text: widget.title.label }),
    name: widget => widget.url
  });

  /**
   * Create a new HelpWidget widget.
   */
  function newClosableIFrame(url: string, text: string): HelpWidget {
    let iframe = new HelpWidget(url);
    iframe.addClass(HELP_CLASS);
    iframe.title.label = text;
    iframe.title.closable = true;
    iframe.id = `${namespace}-${++counter}`;
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

    menu.addItem({ command: CommandIDs.about });
    menu.addItem({ command: 'faq-jupyterlab:open' });
    menu.addItem({ command: CommandIDs.launchClassic });
    menu.addItem({ type: 'separator' });
    RESOURCES.forEach(args => {
      menu.addItem({ args, command: CommandIDs.open });
    });
    menu.addItem({ type: 'separator' });
    menu.addItem({ command: 'apputils:clear-statedb' });

    return menu;
  }

  commands.addCommand(CommandIDs.about, {
    label: `About ${info.name}`,
    execute: () => {

      //Create the header of the about dialog
      let headerLogo = h.div({className: 'jp-About-header-logo'});
      let headerWordmark = h.div({className: 'jp-About-header-wordmark'});
      let release = 'alpha release';
      let versionNumber = `version: ${info.version}`;
      let versionInfo = h.span({className: 'jp-About-version-info'},
        h.span({className: 'jp-About-release'}, release),
        h.span({className: 'jp-About-version'}, versionNumber)
      );
      let title = VirtualDOM.realize(h.span({className: 'jp-About-header'},
        headerLogo,
        h.div({className: 'jp-About-header-info'},
          headerWordmark,
          versionInfo
        )
      ));

      //Create the body of the about dialog
      let jupyterURL = 'https://jupyter.org/about.html';
      let contributorsURL = 'https://github.com/jupyterlab/jupyterlab/graphs/contributors';
      let externalLinks = h.span({className: 'jp-About-externalLinks'},
        h.a({href: contributorsURL, target: '_blank', className: 'jp-Button-flat'}, "CONTRIBUTOR LIST"),
        h.a({href: jupyterURL, target: '_blank', className: 'jp-Button-flat'}, "ABOUT PROJECT JUPYTER")
      );
      let copyright = h.span({className: 'jp-About-copyright'}, "© 2017 Project Jupyter");
      let body = VirtualDOM.realize(h.div({ className: 'jp-About-body' },
        externalLinks,
        copyright
      ));

      showDialog({
        title,
        body,
        buttons: [Dialog.createButton({label: 'DISMISS', className: 'jp-About-button jp-mod-reject jp-mod-styled'})]
      });
    }
  });

  commands.addCommand(CommandIDs.open, {
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
      shell.activateById(iframe.id);
    }
  });


  commands.addCommand(CommandIDs.launchClassic, {
    label: 'Launch Classic Notebook',
    execute: () => { window.open(PageConfig.getBaseUrl() + 'tree'); }
  });

  RESOURCES.forEach(args => {
    palette.addItem({ args, command: CommandIDs.open, category });
  });
  palette.addItem({ command: 'apputils:clear-statedb', category });
  palette.addItem({ command: CommandIDs.launchClassic, category });

  mainMenu.addMenu(menu);
}
