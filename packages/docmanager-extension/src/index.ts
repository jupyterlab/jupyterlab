// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IMainMenu
} from '@jupyterlab/apputils';

import {
  createFromDialog, DocumentManager, IDocumentManager, IFileContainer,
  showErrorMessage
} from '@jupyterlab/docmanager';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  Contents, IServiceManager
} from '@jupyterlab/services';

import {
  each
} from '@phosphor/algorithm';

import {
  DisposableSet
} from '@phosphor/disposable';

import {
  Menu
} from '@phosphor/widgets';


/**
 * The command IDs used by the document manager plugin.
 */
namespace CommandIDs {
  export
  const close = 'file-operations:close';

  export
  const closeAllFiles = 'file-operations:close-all-files';

  export
  const createFrom = 'file-operations:create-from';

  export
  const deleteFile = 'file-operations:delete-file';

  export
  const newUntitled = 'file-operations:new-untitled';

  export
  const open = 'file-operations:open';

  export
  const restoreCheckpoint = 'file-operations:restore-checkpoint';

  export
  const save = 'file-operations:save';

  export
  const saveAs = 'file-operations:save-as';
};


/**
 * The default document manager provider.
 */
const plugin: JupyterLabPlugin<IDocumentManager> = {
  id: 'jupyter.services.document-manager',
  provides: IDocumentManager,
  requires: [IServiceManager, IDocumentRegistry, ICommandPalette, IMainMenu],
  activate: (app: JupyterLab, manager: IServiceManager, registry: IDocumentRegistry, palette: ICommandPalette, mainMenu: IMainMenu): IDocumentManager => {
    const opener: DocumentManager.IWidgetOpener = {
      open: widget => {
        if (!widget.id) {
          widget.id = `document-manager-${++Private.id}`;
        }
        if (!widget.isAttached) {
          app.shell.addToMainArea(widget);
        }
        app.shell.activateById(widget.id);
      }
    };
    const docManager = new DocumentManager({ registry, manager, opener });
    let menu = createMenu(app, docManager, registry);

    populateCreators(app, docManager, registry, palette, menu);
    mainMenu.addMenu(menu, { rank: 1 });

    // Register the file operations commands.
    addCommands(app, docManager, registry, palette);

    // Handle fileCreator items as they are added.
    registry.changed.connect((sender, args) => {
      if (args.type === 'fileCreator') {
        menu.dispose();
        menu = createMenu(app, docManager, registry);
        populateCreators(app, docManager, registry, palette, menu);
        mainMenu.addMenu(menu, { rank: 1 });
      }
    });

    return docManager;
  }
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Add the file operations commands to the application's command registry.
 */
function addCommands(app: JupyterLab, docManager: IDocumentManager, registry: IDocumentRegistry, palette: ICommandPalette): void {
  const { commands } = app;
  const category = 'File Operations';
  const isEnabled = () => {
    const { currentWidget } = app.shell;
    return !!(currentWidget && docManager.contextForWidget(currentWidget));
  };

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

  commands.addCommand(CommandIDs.createFrom, {
    label: args => (args['label'] || args['creatorName']) as string,
    execute: args => {
      const path = typeof args['path'] === 'undefined' ? docManager.cwd
        : args['path'] as string;
      const creatorName = args['creatorName'] as string;
      if (!creatorName) {
        const command = CommandIDs.createFrom;
        throw new Error(`${command} requires creatorName.`);
      }

      const items = args['items'] as string[];
      if (items) {
        const container: IFileContainer = { items, path };
        return createFromDialog(container, docManager, creatorName);
      }

      const { services } = docManager;
      return services.contents.get(path, { content: true }).then(contents => {
        const items = contents.content.map((item: Contents.IModel) => {
          return item.name;
        });
        const container: IFileContainer = { items, path };

        return createFromDialog(container, docManager, creatorName);
      });
    }
  });

  commands.addCommand(CommandIDs.deleteFile, {
    execute: args => {
      const path = typeof args['path'] === 'undefined' ? docManager.cwd
        : args['path'] as string;
      const basePath = (args['basePath'] as string) || '';

      if (!path) {
        const command = CommandIDs.deleteFile;
        throw new Error(`A non-empty path is required for ${command}.`);
      }
      return docManager.deleteFile(path, basePath);
    }
  });

  commands.addCommand(CommandIDs.newUntitled, {
    execute: args => {
      const errorTitle = args['error'] as string || 'Error';
      const path = typeof args['path'] === 'undefined' ? docManager.cwd
        : args['path'] as string;
      let options: Partial<Contents.ICreateOptions> = {
        type: args['type'] as Contents.ContentType,
        path
      };

      if (args['type'] === 'file') {
        options.ext = args['ext'] as string || '.txt';
      }

      return docManager.services.contents.newUntitled(options)
        .catch(error => showErrorMessage(errorTitle, error));
    },
    label: args => args['label'] as string || `New ${args['type'] as string}`
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      const path = typeof args['path'] === 'undefined' ? docManager.cwd
        : args['path'] as string;
      const factory = args['factory'] as string || void 0;
      return docManager.services.contents.get(path)
        .then(() => docManager.openOrReveal(path, factory));
    },
    icon: args => args['icon'] as string || '',
    label: args => (args['label'] || args['factory']) as string,
    mnemonic: args => args['mnemonic'] as number || -1
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

  commands.addCommand(CommandIDs.saveAs, {
    label: 'Save As...',
    caption: 'Save with new path and create checkpoint',
    isEnabled,
    execute: () => {
      if (isEnabled()) {
        let context = docManager.contextForWidget(app.shell.currentWidget);
        return context.saveAs().then(() => context.createCheckpoint());
      }
    }
  });

  [
    CommandIDs.save,
    CommandIDs.restoreCheckpoint,
    CommandIDs.saveAs,
    CommandIDs.close,
    CommandIDs.closeAllFiles
  ].forEach(command => { palette.addItem({ command, category }); });
}


/**
 * Create a top level menu for the file browser.
 */
function createMenu(app: JupyterLab, docManager: IDocumentManager, registry: IDocumentRegistry): Menu {
  const { commands } = app;
  const menu = new Menu({ commands });
  menu.title.label = 'File';
  [
    CommandIDs.save,
    CommandIDs.saveAs,
    CommandIDs.restoreCheckpoint,
    CommandIDs.close,
    CommandIDs.closeAllFiles
  ].forEach(command => { menu.addItem({ command }); });

  return menu;
}

/**
 * Populate the command palette and the file menu with the registered creators.
 */
function populateCreators(app: JupyterLab, docManager: IDocumentManager, registry: IDocumentRegistry, palette: ICommandPalette, menu: Menu): void {
  const category = 'File Operations';

  // Clear any previously added creator palette items.
  if (Private.creators) {
    Private.creators.dispose();
  }
  Private.creators = new DisposableSet();

  // Add the "create from" commands.
  each(registry.creators(), creator => {
    const command = CommandIDs.createFrom;
    const creatorName = creator.name;
    const label = `New ${creatorName}`;
    const args = { creatorName, label };
    menu.insertItem(0, { args, command });
    Private.creators.add(palette.addItem({ args, category, command }));
  });
}

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   */
  export
  let creators: DisposableSet | null = null;

  /**
   * A counter for unique IDs.
   */
  export
  let id = 0;
}
