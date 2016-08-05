// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DisposableSet
} from 'phosphor/lib/core/disposable';

import {
  defineSignal, ISignal
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
} from '../commandpalette/plugin';

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
 * A class that tracks the current path of the file browser.
 */
class PathTracker implements IPathTracker {
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
  get path(): string {
    return Private.fbWidget ? Private.fbWidget.model.path : '';
  }
}


// Define the signals for the `PathTracker` class.
defineSignal(PathTracker.prototype, 'commandChanged');


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
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the notebook icon from the default theme.
 */
const NOTEBOOK_ICON_CLASS = 'jp-ImageNotebook';

/**
 * The class name for the text editor icon from the default theme.
 */
const TEXTEDITOR_ICON_CLASS = 'jp-ImageTextEditor';


/**
 * Activate the file browser.
 */
function activateFileBrowser(app: JupyterLab, manager: IServiceManager, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette): IPathTracker {
  let id = 0;
  let tracker = new WidgetTracker<Widget>();
  let activeWidget: Widget;

  tracker.activeWidgetChanged.connect((sender, widget) => {
    activeWidget = widget;
  });

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
  let fbWidget = Private.fbWidget = new FileBrowserWidget({
    commands: commands,
    keymap: keymap,
    manager: docManager,
    model: fbModel,
    opener: opener
  });

  fbModel.pathChanged.connect((sender, args) => {
    Private.pathTracker.pathChanged.emit(args);
  });

  // Add a context menu to the dir listing.
  let node = fbWidget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let path = fbWidget.pathForClick(event);
    let ext = '.' + path.split('.').pop();
    let widgetNames = registry.listWidgetFactories(ext);
    let prefix = `file-browser-contextmenu-${++Private.id}`;
    let openWith: Menu = null;
    if (widgetNames.length > 1) {
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

    let menu = createMenu(fbWidget, openWith);
    menu.open(event.clientX, event.clientY);
  });

//   // Add the command for a new items.
//   let newTextFileId = 'file-operations:new-text-file';

//   app.commands.add([
//     {
//       id: newTextFileId,
//       handler: () => {
//         let icon = `${PORTRAIT_ICON_CLASS} ${TEXTEDITOR_ICON_CLASS}`;
//         fbWidget.createNew({ type: 'file' }).then(widget => widget.title.icon = icon);
//       }
//     }
//   ]);

//   let newNotebookId = 'file-operations:new-notebook';

//   app.commands.add([
//     {
//       id: newNotebookId,
//       handler: () => {
//         let icon = `${PORTRAIT_ICON_CLASS} ${NOTEBOOK_ICON_CLASS}`;
//         fbWidget.createNew({ type: 'notebook' }).then(widget => {
//           widget.title.icon = icon;
//         });
//       }
//     }
//   ]);


//   // Add the command for saving a document.
//   let saveDocumentId = 'file-operations:save';

//   app.commands.add([
//     {
//       id: saveDocumentId,
//       handler: () => {
//         if (activeWidget) {
//           let context = docManager.contextForWidget(activeWidget);
//           context.save();
//         }
//       }
//     }
//   ]);
//   app.palette.add([
//     {
//       command: saveDocumentId,
//       category: 'File Operations',
//       text: 'Save Document',
//       caption: 'Save the current document'
//     }
//   ]);

//   // Add the command for reverting a document.
//   let revertDocumentId = 'file-operations:revert';

//   app.commands.add([
//     {
//       id: revertDocumentId,
//       handler: () => {
//         if (activeWidget) {
//           let context = docManager.contextForWidget(activeWidget);
//           context.revert();
//         }
//       }
//     }
//   ]);
//   app.palette.add([
//     {
//       command: revertDocumentId,
//       category: 'File Operations',
//       text: 'Revert Document',
//       caption: 'Revert the current document'
//     }
//   ]);


// // Add the command for saving a document with a new name.
//   let saveDocumentAsId = 'file-operations:saveas';

//   app.commands.add([
//     {
//       id: saveDocumentAsId,
//       handler: () => {
//         if (activeWidget) {
//           let context = docManager.contextForWidget(activeWidget);
//           context.saveAs().then(() => { fbModel.refresh(); });
//         }
//       }
//     }
//   ]);
//   app.palette.add([
//     {
//       command: saveDocumentAsId,
//       category: 'File Operations',
//       text: 'Save As...',
//       caption: 'Save the current document as...'
//     }
//   ]);

//   // Add the command for closing a document.
//   let closeDocumentId = 'file-operations:close';

//   app.commands.add([
//     {
//       id: closeDocumentId,
//       handler: () => {
//         if (activeWidget) {
//           activeWidget.close();
//         }
//       }
//     }
//   ]);
//   app.palette.add([
//     {
//       command: closeDocumentId,
//       category: 'File Operations',
//       text: 'Close Document',
//       caption: 'Close the current document'
//     }
//   ]);

//   // Add the command for closing all documents.
//   let closeAllId = 'file-operations:close-all';

//   app.commands.add([
//     {
//       id: closeAllId,
//       handler: () => {
//         docManager.closeAll();
//       }
//     }
//   ]);
//   app.palette.add([
//     {
//       command: closeAllId,
//       category: 'File Operations',
//       text: 'Close All',
//       caption: 'Close all open documents'
//     }
//   ]);

//   app.palette.add([
//     {
//       command: newTextFileId,
//       category: 'File Operations',
//       text: 'New Text File',
//       caption: 'Create a new text file'
//     },
//     {
//       command: newNotebookId,
//       category: 'File Operations',
//       text: 'New Notebook',
//       caption: 'Create a new notebook'
//     }
//   ]);

//   app.commands.add([
//     {
//       id: 'file-browser:activate',
//       handler: showBrowser
//     },
//     {
//       id: 'file-browser:hide',
//       handler: hideBrowser
//     },
//     {
//       id: 'file-browser:toggle',
//       handler: toggleBrowser
//     }
//   ]);

  fbWidget.title.label = 'Files';
  fbWidget.id = 'file-browser';
  app.shell.addToLeftArea(fbWidget, { rank: 40 });
  showBrowser();

//   // Add top menu.
//   let newSubMenu = new Menu ([
//     new MenuItem({
//       text: 'Notebook',
//       handler: () => {
//         app.commands.execute(newNotebookId);
//       }
//     }),
//     new MenuItem({
//       text: 'Text File',
//       handler: () => {
//         app.commands.execute(newTextFileId);
//       }
//     })

//   ]);

//   let menu = new Menu ([
//     new MenuItem({
//       text: 'New',
//       submenu: newSubMenu

//     }),
//     new MenuItem({
//       text: 'Save Document',
//       handler: () => {
//         app.commands.execute(saveDocumentId);
//       }
//     }),
//     new MenuItem({
//       text: 'Save Document As...',
//       handler: () => {
//         app.commands.execute(saveDocumentAsId);
//       }
//     }),
//     new MenuItem({
//       text: 'Revert Document',
//       handler: () => {
//         app.commands.execute(revertDocumentId);
//       }
//     }),
//     new MenuItem({
//       text: 'Close Current',
//       handler: () => {
//         app.commands.execute(closeDocumentId);
//       }
//     }),
//     new MenuItem({
//       text: 'Close All',
//       handler: () => {
//         app.commands.execute(closeAllId);
//       }
//     }),

//   ]);

//   let fileMenu = new MenuItem({
//     text: 'File',
//     submenu: menu
//   });
//   mainMenu.addItem(fileMenu, {rank: 1});

  function showBrowser(): void {
    app.shell.activateLeft(fbWidget.id);
  }

  function hideBrowser(): void {
    if (!fbWidget.isHidden) {
      app.shell.collapseLeft();
    }
  }

  function toggleBrowser(): void {
    if (fbWidget.isHidden) {
      showBrowser();
    } else {
      hideBrowser();
    }
  }

  return Private.pathTracker;
}


/**
 * Create a context menu for the file browser listing.
 */
function createMenu(fbWidget: FileBrowserWidget, openWith: Menu):  Menu {
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
   * Even though the commands are disposed when the dropdown menu is disposed,
   * in order to guarantee there are no race conditions with other `FileButtons`
   * instances, each set of commands is prefixed.
   */
  export
  let id = 0;

  /**
   * The file browser widget instance.
   */
  export
  var fbWidget: FileBrowserWidget;

  export
  const pathTracker = new PathTracker();
}
