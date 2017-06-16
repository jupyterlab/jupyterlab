// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IMainMenu
} from '@jupyterlab/apputils';

import {
  renameDialog, DocumentManager, IDocumentManager, showErrorMessage
} from '@jupyterlab/docmanager';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  Contents, Kernel, IServiceManager
} from '@jupyterlab/services';


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

  export
  const rename = 'file-operations:rename';
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
        widget.title.dataset = {
          'type': 'document-title',
          ...widget.title.dataset
        };
        if (!widget.isAttached) {
          app.shell.addToMainArea(widget);
        }
        app.shell.activateById(widget.id);
      }
    };
    const docManager = new DocumentManager({ registry, manager, opener });

    // Register the file operations commands.
    addCommands(app, docManager, registry, palette);

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

  commands.addCommand(CommandIDs.deleteFile, {
    execute: args => {
      const path = typeof args['path'] === 'undefined' ? ''
        : args['path'] as string;

      if (!path) {
        const command = CommandIDs.deleteFile;
        throw new Error(`A non-empty path is required for ${command}.`);
      }
      return docManager.deleteFile(path);
    }
  });

  commands.addCommand(CommandIDs.newUntitled, {
    execute: args => {
      const errorTitle = args['error'] as string || 'Error';
      const path = typeof args['path'] === 'undefined' ? ''
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
      const path = typeof args['path'] === 'undefined' ? ''
        : args['path'] as string;
      const factory = args['factory'] as string || void 0;
      const kernel = args['kernel'] as Kernel.IModel || void 0;
      return docManager.services.contents.get(path)
        .then(() => docManager.openOrReveal(path, factory, kernel));
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

  commands.addCommand(CommandIDs.rename, {
    isVisible: () => {
      const widget = app.shell.currentWidget;
      if (!widget) {
        return;
      }
      // Find the context for the widget.
      let context = docManager.contextForWidget(widget);
      return context !== null;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      if (!widget) {
        return;
      }
      // Find the context for the widget.
      let context = docManager.contextForWidget(widget);
      if (context) {
        return renameDialog(docManager, context.path);
      }
    },
    label: 'Rename'
  });

  app.contextMenu.addItem({
    command: CommandIDs.rename,
    selector: '[data-type="document-title"]',
    rank: 1
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
 * A namespace for private module data.
 */
namespace Private {
  /**
   * A counter for unique IDs.
   */
  export
  let id = 0;
}
