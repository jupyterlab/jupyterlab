// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer, IMainMenu, InstanceTracker, IStateDB
} from '@jupyterlab/apputils';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  FileBrowserModel, FileBrowser, IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import {
  DisposableSet
} from '@phosphor/disposable';

import {
  Menu
} from '@phosphor/widgets';


/**
 * The command IDs used by the file browser plugin.
 */
namespace CommandIDs {
  export
  const hideBrowser = 'filebrowser-main:hide'; // For main browser only.

  export
  const rename = 'filebrowser:rename';

  export
  const showBrowser = 'filebrowser-main:activate'; // For main browser only.

  export
  const toggleBrowser = 'filebrowser-main:toggle'; // For main browser only.
};

/**
 * The default file browser extension.
 */
const fileBrowserPlugin: JupyterLabPlugin<void> = {
  activate: activateFileBrowser,
  id: 'jupyter.extensions.filebrowser',
  requires: [
    IFileBrowserFactory,
    IDocumentManager,
    IMainMenu,
    ICommandPalette,
    ILayoutRestorer
  ],
  autoStart: true
};

/**
 * The default file browser factory provider.
 */
const factoryPlugin: JupyterLabPlugin<IFileBrowserFactory> = {
  activate: activateFactory,
  id: 'jupyter.services.filebrowser',
  provides: IFileBrowserFactory,
  requires: [IDocumentManager, IStateDB],
  autoStart: true
};

/**
 * The file browser namespace token.
 */
const namespace = 'filebrowser';


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [factoryPlugin, fileBrowserPlugin];
export default plugins;


/**
 * Activate the file browser factory provider.
 */
function activateFactory(app: JupyterLab, docManager: IDocumentManager, state: IStateDB): IFileBrowserFactory {
  const { commands, shell } = app;
  const tracker = new InstanceTracker<FileBrowser>({ namespace, shell });

  return {
    createFileBrowser(id: string, options: IFileBrowserFactory.IOptions = {}): FileBrowser {
      const model = new FileBrowserModel({
        manager: options.documentManager || docManager,
        state: options.state === null ? null : options.state || state
      });
      const widget = new FileBrowser({
        id, model, commands: options.commands || commands
      });
      const { registry } = docManager;

      // Add a context menu handler to the file browser's directory listing.
      let node = widget.node.getElementsByClassName('jp-DirListing-content')[0];
      node.addEventListener('contextmenu', (event: MouseEvent) => {
        event.preventDefault();
        let command =  'file-operations:open';
        let path = widget.pathForClick(event) || '';
        let ext = DocumentRegistry.extname(path);
        let factories = registry.preferredWidgetFactories(ext).map(f => f.name);
        let openWith: Menu = null;

        if (path && factories.length > 1) {
          openWith = new Menu({ commands });
          openWith.title.label = 'Open With...';
          factories.forEach(factory => {
            openWith.addItem({ args: { factory, path }, command });
          });
        }

        const menu = createContextMenu(widget, openWith);
        menu.open(event.clientX, event.clientY);
      });

      // Track the newly created file browser.
      tracker.add(widget);

      return widget;
    },
    tracker
  };
}


/**
 * Activate the file browser in the sidebar.
 */
function activateFileBrowser(app: JupyterLab, factory: IFileBrowserFactory, docManager: IDocumentManager, mainMenu: IMainMenu, palette: ICommandPalette, restorer: ILayoutRestorer): void {
  const { commands } = app;
  const fbWidget = factory.createFileBrowser('filebrowser', {
    commands,
    documentManager: docManager
  });

  // Let the application restorer track the primary file browser (that is
  // automatically created) for restoration of application state (e.g. setting
  // the file browser as the current side bar widget).
  //
  // All other file browsers created by using the factory function are
  // responsible for their own restoration behavior, if any.
  restorer.add(fbWidget, namespace);

  addCommands(app, factory.tracker, fbWidget);

  fbWidget.title.label = 'Files';
  app.shell.addToLeftArea(fbWidget, { rank: 100 });

  // If the layout is a fresh session without saved data, open file browser.
  app.restored.then(layout => {
    if (layout.fresh) {
      app.commands.execute(CommandIDs.showBrowser, void 0);
    }
  });
}


/**
 * Add the main file browser commands to the application's command registry.
 */
function addCommands(app: JupyterLab, tracker: InstanceTracker<FileBrowser>, mainBrowser: FileBrowser): void {
  const { commands } = app;

  commands.addCommand(CommandIDs.hideBrowser, {
    execute: () => {
      if (!mainBrowser.isHidden) {
        app.shell.collapseLeft();
      }
    }
  });

  commands.addCommand(CommandIDs.rename, {
    execute: () => {
      const widget = tracker.currentWidget;
      if (!widget) {
        return;
      }

      return widget.rename();
    },
    icon: 'jp-MaterialIcon jp-EditIcon',
    label: 'Rename',
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.showBrowser, {
    execute: () => { app.shell.activateById(mainBrowser.id); }
  });

  commands.addCommand(CommandIDs.toggleBrowser, {
    execute: () => {
      if (mainBrowser.isHidden) {
        return commands.execute(CommandIDs.showBrowser, void 0);
      } else {
        return commands.execute(CommandIDs.hideBrowser, void 0);
      }
    }
  });
}


/**
 * Create a context menu for the file browser listing.
 *
 * #### Notes
 * This function generates temporary commands with an incremented name. These
 * commands are disposed when the menu itself is disposed.
 */
function createContextMenu(fbWidget: FileBrowser, openWith: Menu):  Menu {
  let { commands } = fbWidget;
  let menu = new Menu({ commands });
  let prefix = `${namespace}-${++Private.id}`;
  let disposables = new DisposableSet();
  let command: string;

  // Remove all the commands associated with this menu upon disposal.
  menu.disposed.connect(() => { disposables.dispose(); });

  command = 'file-operations:open';
  menu.addItem({
    command,
    args: {
      icon: 'jp-MaterialIcon jp-OpenFolderIcon',
      label: 'Open',
      mnemonic: 0
    }
  });

  if (openWith) {
    menu.addItem({ type: 'submenu', submenu: openWith });
  }

  command = CommandIDs.rename;
  menu.addItem({ command });

  command = `${prefix}:delete`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.delete(),
    icon: 'jp-MaterialIcon jp-CloseIcon',
    label: 'Delete',
    mnemonic: 0
  }));
  menu.addItem({ command });

  command = `${prefix}:duplicate`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.duplicate(),
    icon: 'jp-MaterialIcon jp-CopyIcon',
    label: 'Duplicate'
  }));
  menu.addItem({ command });

  command = `${prefix}:cut`;
  disposables.add(commands.addCommand(command, {
    execute: () => { fbWidget.cut(); },
    icon: 'jp-MaterialIcon jp-CutIcon',
    label: 'Cut'
  }));
  menu.addItem({ command });

  command = `${prefix}:copy`;
  disposables.add(commands.addCommand(command, {
    execute: () => { fbWidget.copy(); },
    icon: 'jp-MaterialIcon jp-CopyIcon',
    label: 'Copy',
    mnemonic: 0
  }));
  menu.addItem({ command });

  command = `${prefix}:paste`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.paste(),
    icon: 'jp-MaterialIcon jp-PasteIcon',
    label: 'Paste',
    mnemonic: 0
  }));
  menu.addItem({ command });

  command = `${prefix}:download`;
  disposables.add(commands.addCommand(command, {
    execute: () => { fbWidget.download(); },
    icon: 'jp-MaterialIcon jp-DownloadIcon',
    label: 'Download'
  }));
  menu.addItem({ command });

  command = `${prefix}:shutdown`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.shutdownKernels(),
    icon: 'jp-MaterialIcon jp-StopIcon',
    label: 'Shutdown Kernel'
  }));
  menu.addItem({ command });

  menu.disposed.connect(() => { disposables.dispose(); });

  return menu;
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The ID counter prefix for new commands.
   *
   * #### Notes
   * Even though the commands are disposed when the menus are disposed,
   * in order to guarantee there are no race conditions, each set of commands
   * is prefixed.
   */
  export
  let id = 0;
}
