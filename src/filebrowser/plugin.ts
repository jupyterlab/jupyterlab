// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DisposableSet
} from 'phosphor/lib/core/disposable';

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  DocumentManager
} from '../docmanager';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  IMainMenu
} from '../mainmenu/plugin';

import {
  IServiceManager
} from '../services/plugin';

import {
  WidgetTracker
} from '../widgettracker';

import {
  IWidgetOpener, FileBrowserWidget
} from './browser';

import {
  FileBrowserModel
} from './model';


/* tslint:disable */
/**
 * The path tracker token.
 */
export
const IPathTracker = new Token<IPathTracker>('jupyter.services.file-browser');
/* tslint:enable */


/**
 * An interface a file browser path tracker.
 */
export
interface IPathTracker {
  /**
   * A signal emitted when the current path changes.
   */
  pathChanged: ISignal<IPathTracker, IChangedArgs<string>>;

  /**
   * The current path of the filebrowser.
   *
   * #### Notes
   * This is a read-only property.
   */
  path: string;
}


/**
 * The default file browser provider.
 */
export
const fileBrowserProvider: JupyterLabPlugin<IPathTracker> = {
  id: 'jupyter.services.file-browser',
  provides: IPathTracker,
  requires: [IServiceManager, IDocumentRegistry, IMainMenu, ICommandPalette],
  activate: activateFileBrowser,
  autoStart: true
};


/**
 * The map of command ids used by the file browser.
 */
const cmdIds = {
  newText: 'file-operations:new-text-file',
  newNotebook: 'file-operations:new-notebook',
  save: 'file-operations:save',
  restoreCheckpoint: 'file-operations:restore-checkpoint',
  saveAs: 'file-operations:saveAs',
  close: 'file-operations:close',
  closeAll: 'file-operations:closeAll',
  showBrowser: 'file-browser:activate',
  hideBrowser: 'file-browser:hide',
  toggleBrowser: 'file-browser:toggle'
};


/**
 * Activate the file browser.
 */
function activateFileBrowser(app: JupyterLab, manager: IServiceManager, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette): IPathTracker {
  let id = 0;
  let tracker = new WidgetTracker<Widget>();

  let opener: IWidgetOpener = {
    open: widget => {
      if (!widget.id) {
        widget.id = `document-manager-${++id}`;
      }
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
        tracker.addWidget(widget);
      }
    }
  };
  let { commands, keymap } = app;
  let docManager = new DocumentManager({ registry, manager, opener });
  let fbModel = new FileBrowserModel({ manager });
  let fbWidget = new FileBrowserWidget({
    commands: commands,
    keymap: keymap,
    manager: docManager,
    model: fbModel,
    opener: opener
  });

  // Add a context menu to the dir listing.
  let node = fbWidget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let path = fbWidget.pathForClick(event) || '';
    let ext = '.' + path.split('.').pop();
    let widgetNames = registry.listWidgetFactories(ext);
    let prefix = `file-browser-contextmenu-${++Private.id}`;
    let openWith: Menu = null;
    if (path && widgetNames.length > 1) {
      let disposables = new DisposableSet();
      let command: string;

      openWith = new Menu({ commands, keymap });
      openWith.title.label = 'Open With...';
      openWith.disposed.connect(() => disposables.dispose());

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

  addCommands(app, tracker, fbWidget, docManager);

  let category = 'File Operations';
  [
    cmdIds.newText,
    cmdIds.newNotebook,
    cmdIds.save,
    cmdIds.restoreCheckpoint,
    cmdIds.saveAs,
    cmdIds.close,
    cmdIds.closeAll,
  ].forEach(command => palette.addItem({ command, category }));

  mainMenu.addMenu(createMenu(app), {rank: 1});

  fbWidget.title.label = 'Files';
  fbWidget.id = 'file-browser';
  app.shell.addToLeftArea(fbWidget, { rank: 40 });
  app.commands.execute(cmdIds.showBrowser, void 0);

  return fbModel;
}


/**
 * Add the filebrowser commands to the application's command registry.
 */
function addCommands(app: JupyterLab, tracker: WidgetTracker<Widget>, fbWidget: FileBrowserWidget, docManager: DocumentManager): void {
  let commands = app.commands;
  let fbModel = fbWidget.model;

  commands.addCommand(cmdIds.newText, {
    label: 'New File',
    execute: () => fbWidget.createNew({ type: 'file' })
  });
  commands.addCommand(cmdIds.newNotebook, {
    label: 'New Notebook',
    execute: () => fbWidget.createNew({ type: 'notebook' })
  });
  commands.addCommand(cmdIds.save, {
    label: 'Save',
    caption: 'Save and create checkpoint',
    execute: () => {
      if (tracker.activeWidget) {
        let context = docManager.contextForWidget(tracker.activeWidget);
        return context.save().then(() => {
          return context.createCheckpoint();
        });
      }
    }
  });
  commands.addCommand(cmdIds.restoreCheckpoint, {
    label: 'Revert to Checkpoint',
    caption: 'Revert contents to previous checkpoint',
    execute: () => {
      if (tracker.activeWidget) {
        let context = docManager.contextForWidget(tracker.activeWidget);
        context.restoreCheckpoint().then(() => {
          context.revert();
        });
      }
    }
  });
  commands.addCommand(cmdIds.saveAs, {
    label: 'Save As...',
    caption: 'Save with new path and create checkpoint',
    execute: () => {
      if (tracker.activeWidget) {
        let context = docManager.contextForWidget(tracker.activeWidget);
        return context.saveAs().then(() => {
          return context.createCheckpoint();
        }).then(() => {
          return fbModel.refresh();
        });
      }
    }
  });
  commands.addCommand(cmdIds.close, {
    label: 'Close',
    execute: () => {
      if (tracker.activeWidget) {
        tracker.activeWidget.close();
      }
    }
  });
  commands.addCommand(cmdIds.closeAll, {
    label: 'Close All',
    execute: () => {
      for (let widget of tracker.widgets) {
        widget.close();
      }
    }
  });
  commands.addCommand(cmdIds.showBrowser, {
    execute: () => app.shell.activateLeft(fbWidget.id)
  });
  commands.addCommand(cmdIds.hideBrowser, {
    execute: () => {
      if (!fbWidget.isHidden) {
        app.shell.collapseLeft();
      }
    }
  });
  commands.addCommand(cmdIds.toggleBrowser, {
    execute: () => {
      if (fbWidget.isHidden) {
        commands.execute(cmdIds.showBrowser, void 0);
      } else {
        commands.execute(cmdIds.hideBrowser, void 0);
      }
    }
  });
}


/**
 * Create a top level menu for the file browser.
 */
function createMenu(app: JupyterLab): Menu {
  let { commands, keymap } = app;
  let menu = new Menu({ commands, keymap });
  menu.title.label = 'File';

  [
    cmdIds.newText,
    cmdIds.newNotebook,
    cmdIds.save,
    cmdIds.restoreCheckpoint,
    cmdIds.saveAs,
    cmdIds.close,
    cmdIds.closeAll,
  ].forEach(command => menu.addItem({ command }));

  return menu;
}


/**
 * Create a context menu for the file browser listing.
 */
function createContextMenu(fbWidget: FileBrowserWidget, openWith: Menu):  Menu {
  let { commands, keymap } = fbWidget;
  let menu = new Menu({ commands, keymap });
  let prefix = `file-browser-${++Private.id}`;
  let disposables = new DisposableSet();
  let command: string;

  // // Remove all the commands associated with this menu upon disposal.
  menu.disposed.connect(() => disposables.dispose());

  command = `${prefix}:open`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.open(),
    icon: 'fa fa-folder-open-o',
    label: 'Open',
    mnemonic: 0
  }));
  menu.addItem({ command });

  if (openWith) {
    menu.addItem({ type: 'submenu', menu: openWith });
  }

  command = `${prefix}:rename`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.rename(),
    icon: 'fa fa-edit',
    label: 'Rename',
    mnemonic: 0
  }));
  menu.addItem({ command });

  command = `${prefix}:delete`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.delete(),
    icon: 'fa fa-remove',
    label: 'Delete',
    mnemonic: 0
  }));
  menu.addItem({ command });

  command = `${prefix}:duplicate`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.duplicate(),
    icon: 'fa fa-copy',
    label: 'Duplicate'
  }));
  menu.addItem({ command });

  command = `${prefix}:cut`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.cut(),
    icon: 'fa fa-cut',
    label: 'Cut'
  }));
  menu.addItem({ command });

  command = `${prefix}:copy`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.copy(),
    icon: 'fa fa-copy',
    label: 'Copy',
    mnemonic: 0
  }));
  menu.addItem({ command });

  command = `${prefix}:paste`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.paste(),
    icon: 'fa fa-paste',
    label: 'Paste',
    mnemonic: 0
  }));
  menu.addItem({ command });

  command = `${prefix}:download`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.download(),
    icon: 'fa fa-download',
    label: 'Download'
  }));
  menu.addItem({ command });

  command = `${prefix}:shutdown`;
  disposables.add(commands.addCommand(command, {
    execute: () => fbWidget.shutdownKernels(),
    icon: 'fa fa-stop-circle-o',
    label: 'Shutdown Kernel'
  }));
  menu.addItem({ command });

  menu.disposed.connect(() => disposables.dispose());

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
