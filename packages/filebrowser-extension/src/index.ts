// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each, map, toArray
} from '@phosphor/algorithm';

import {
  DisposableSet
} from '@phosphor/disposable';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer, IMainMenu, IStateDB
} from '@jupyterlab/apputils';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  IDocumentRegistry, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  FileBrowserModel, FileBrowser, IPathTracker
} from '@jupyterlab/filebrowser';

import {
  IServiceManager
} from '@jupyterlab/services';


/**
 * The command IDs used by the file browser plugin.
 */
namespace CommandIDs {
  export
  const save = 'file-operations:save';

  export
  const restoreCheckpoint = 'file-operations:restore-checkpoint';

  export
  const saveAs = 'file-operations:save-as';

  export
  const close = 'file-operations:close';

  export
  const closeAllFiles = 'file-operations:close-all-files';

  export
  const open = 'file-operations:open';

  export
  const newTextFile = 'file-operations:new-text-file';

  export
  const newNotebook = 'file-operations:new-notebook';

  export
  const showBrowser = 'file-browser:activate';

  export
  const hideBrowser = 'file-browser:hide';

  export
  const toggleBrowser = 'file-browser:toggle';
};

/**
 * The default file browser provider.
 */
const plugin: JupyterLabPlugin<IPathTracker> = {
  activate,
  id: 'jupyter.services.file-browser',
  provides: IPathTracker,
  requires: [
    IServiceManager,
    IDocumentManager,
    IDocumentRegistry,
    IMainMenu,
    ICommandPalette,
    ILayoutRestorer,
    IStateDB
  ],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * The filebrowser plugin state namespace.
 */
const NAMESPACE = 'filebrowser';


/**
 * Activate the file browser.
 */
function activate(app: JupyterLab, manager: IServiceManager, documentManager: IDocumentManager, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette, restorer: ILayoutRestorer, state: IStateDB): IPathTracker {
  const { commands } = app;
  let fbModel = new FileBrowserModel({ manager });
  let fbWidget = new FileBrowser({
    commands,
    manager: documentManager,
    model: fbModel
  });

  // Let the application restorer track the file browser for restoration of
  // application state (e.g. setting the file browser as the current side bar
  // widget).
  restorer.add(fbWidget, NAMESPACE);

  let category = 'File Operations';
  let creatorCmds: { [key: string]: DisposableSet } = Object.create(null);
  let addCreator = (name: string) => {
    let disposables = creatorCmds[name] = new DisposableSet();
    let command = Private.commandForName(name);
    disposables.add(commands.addCommand(command, {
      execute: () => fbWidget.createFrom(name),
      label: `New ${name}`
    }));
    disposables.add(palette.addItem({ command, category }));
  };

  // Restore the state of the file browser on reload.
  const key = `${NAMESPACE}:cwd`;
  let connect = () => {
    // Save the subsequent state of the file browser in the state database.
    fbModel.pathChanged.connect((sender, args) => {
      state.save(key, { path: args.newValue });
    });
  };
  Promise.all([state.fetch(key), app.started, manager.ready]).then(([cwd]) => {
    if (!cwd) {
      return;
    }
    let path = cwd['path'] as string;
    return manager.contents.get(path)
      .then(() => fbModel.cd(path))
      .catch(() => state.remove(key));
  }).then(connect)
    .catch(() => state.remove(key).then(connect));

  each(registry.creators(), creator => { addCreator(creator.name); });

  // Add a context menu to the dir listing.
  let node = fbWidget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let path = fbWidget.pathForClick(event) || '';
    let ext = DocumentRegistry.extname(path);
    let factories = registry.preferredWidgetFactories(ext);
    let widgetNames = toArray(map(factories, factory => factory.name));
    let prefix = `file-browser-contextmenu-${++Private.id}`;
    let openWith: Menu = null;
    if (path && widgetNames.length > 1) {
      let disposables = new DisposableSet();
      let command: string;

      openWith = new Menu({ commands });
      openWith.title.label = 'Open With...';
      openWith.disposed.connect(() => { disposables.dispose(); });

      for (let widgetName of widgetNames) {
        command = `${prefix}:${widgetName}`;
        disposables.add(commands.addCommand(command, {
          execute: () => fbWidget.openPath(path, widgetName),
          label: widgetName
        }));
        openWith.addItem({ command });
      }
    }

    let menu = createContextMenu(fbWidget, openWith);
    menu.open(event.clientX, event.clientY);
  });

  addCommands(app, fbWidget, documentManager);

  [
    CommandIDs.save,
    CommandIDs.restoreCheckpoint,
    CommandIDs.saveAs,
    CommandIDs.close,
    CommandIDs.closeAllFiles
  ].forEach(command => { palette.addItem({ command, category }); });

  let menu = createMenu(app, Object.keys(creatorCmds));
  mainMenu.addMenu(menu, { rank: 1 });

  fbWidget.title.label = 'Files';
  fbWidget.id = 'file-browser';
  app.shell.addToLeftArea(fbWidget, { rank: 40 });

  // If the layout is a fresh session without saved data, open file browser.
  app.restored.then(layout => {
    if (layout.fresh) {
      app.commands.execute(CommandIDs.showBrowser, void 0);
    }
  });

  // Handle fileCreator items as they are added.
  registry.changed.connect((sender, args) => {
    if (args.type === 'fileCreator') {
      menu.dispose();
      let name = args.name;
      if (args.change === 'added') {
        addCreator(name);
      } else {
        creatorCmds[name].dispose();
        delete creatorCmds[name];
      }
      menu = createMenu(app, Object.keys(creatorCmds));
      mainMenu.addMenu(menu, { rank: 1 });
    }
  });

  return fbModel;
}


/**
 * Add the filebrowser commands to the application's command registry.
 */
function addCommands(app: JupyterLab, fbWidget: FileBrowser, docManager: IDocumentManager): void {
  let commands = app.commands;
  let isEnabled = () => {
    let currentWidget = app.shell.currentWidget;
    return !!(currentWidget && docManager.contextForWidget(currentWidget));
  };

  commands.addCommand(CommandIDs.save, {
    label: 'Save',
    caption: 'Save and create checkpoint',
    isEnabled,
    execute: () => {
      if (isEnabled()) {
        let context = docManager.contextForWidget(app.shell.currentWidget);
        return context.save().then(() => context.createCheckpoint());
      }
    }
  });

  commands.addCommand(CommandIDs.restoreCheckpoint, {
    label: 'Revert to Checkpoint',
    caption: 'Revert contents to previous checkpoint',
    isEnabled,
    execute: () => {
      if (isEnabled()) {
        let context = docManager.contextForWidget(app.shell.currentWidget);
        return context.restoreCheckpoint().then(() => context.revert());
      }
    }
  });

  commands.addCommand(CommandIDs.saveAs, {
    label: 'Save As...',
    caption: 'Save with new path and create checkpoint',
    isEnabled,
    execute: () => {
      if (isEnabled()) {
        let context = docManager.contextForWidget(app.shell.currentWidget);
        return context.saveAs().then(() => {
          return context.createCheckpoint();
        });
      }
    }
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      let path = args['path'] as string;
      let factory = args['factory'] as string || void 0;
      return docManager.services.contents.get(path)
        .then(() => fbWidget.openPath(path, factory));
    }
  });

  commands.addCommand(CommandIDs.close, {
    label: 'Close',
    execute: () => {
      if (app.shell.currentWidget) {
        app.shell.currentWidget.close();
      }
    }
  });

  commands.addCommand(CommandIDs.closeAllFiles, {
    label: 'Close All',
    execute: () => { app.shell.closeAll(); }
  });

  commands.addCommand(CommandIDs.showBrowser, {
    execute: () => { app.shell.activateById(fbWidget.id); }
  });

  commands.addCommand(CommandIDs.hideBrowser, {
    execute: () => {
      if (!fbWidget.isHidden) {
        app.shell.collapseLeft();
      }
    }
  });

  commands.addCommand(CommandIDs.toggleBrowser, {
    execute: () => {
      if (fbWidget.isHidden) {
        return commands.execute(CommandIDs.showBrowser, void 0);
      } else {
        return commands.execute(CommandIDs.hideBrowser, void 0);
      }
    }
  });
}


/**
 * Create a top level menu for the file browser.
 */
function createMenu(app: JupyterLab, creatorCmds: string[]): Menu {
  let { commands } = app;
  let menu = new Menu({ commands });
  menu.title.label = 'File';
  creatorCmds.forEach(name => {
    menu.addItem({ command: Private.commandForName(name) });
  });
  [
    CommandIDs.save,
    CommandIDs.restoreCheckpoint,
    CommandIDs.saveAs,
    CommandIDs.close,
    CommandIDs.closeAllFiles
  ].forEach(command => { menu.addItem({ command }); });

  return menu;
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
  let prefix = `file-browser-${++Private.id}`;
  let disposables = new DisposableSet();
  let command: string;

  // Remove all the commands associated with this menu upon disposal.
  menu.disposed.connect(() => { disposables.dispose(); });

  command = `${prefix}:open`;
  disposables.add(commands.addCommand(command, {
    execute: () => { fbWidget.open(); },
    icon: 'jp-MaterialIcon jp-OpenFolderIcon',
    label: 'Open',
    mnemonic: 0
  }));
  menu.addItem({ command });

  if (openWith) {
    menu.addItem({ type: 'submenu', submenu: openWith });
  }

  command = `${prefix}:rename`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.rename(),
    icon: 'jp-MaterialIcon jp-EditIcon',
    label: 'Rename',
    mnemonic: 0
  }));
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

  /**
   * Get the command for a name.
   */
  export
  function commandForName(name: string){
    name = name.split(' ').join('-').toLocaleLowerCase();
    return `file-operations:new-${name}`;
  }
}
