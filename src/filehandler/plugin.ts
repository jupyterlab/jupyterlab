// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileHandlerRegistry, FileHandler, FileCreator
} from 'jupyter-js-ui/lib/filehandler';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  JupyterServices
} from '../services/plugin';


/**
 * The default document manager provider.
 */
export
const fileHandlerProvider = {
  id: 'jupyter.services.fileHandlerRegistry',
  provides: FileHandlerRegistry,
  resolve: () => {
    return new FileHandlerRegistry();
  }
};


/**
 * The default file handler extension.
 */
export
const fileHandlerExtension = {
  id: 'jupyter.extensions.fileHandler',
  requires: [FileHandlerRegistry, JupyterServices],
  activate: activateFileHandler
};


function activateFileHandler(app: Application, registry: FileHandlerRegistry, services: JupyterServices): Promise<void> {
  let contents = services.contentsManager;
  let activeId = '';
  let id = 0;
  let fileHandler = new FileHandler(contents);
  let dirCreator = new FileCreator(contents, 'directory');
  let fileCreator = new FileCreator(contents, 'file');

  registry.addDefaultHandler(fileHandler);
  registry.addCreator(
    'New Directory', dirCreator.createNew.bind(dirCreator));
  registry.addCreator('New File', fileCreator.createNew.bind(fileCreator));

  return Promise.resolve(void 0);
};


  // // Create a command to add a new empty text file.
  // // This requires an id and an instance of a command object.
  // let newTextFileId = 'file-operations:new-text-file';

  // // Add the command to the command registry and command palette plugins.
  // app.commands.add([
  //   {
  //     id: newTextFileId,
  //     handler: () => {
  //       registry.createNew('file', model.path).then(model => {
  //         registry.open(model);
  //       });
  //     }
  //   }
  // ]);
  // app.palette.add([
  //   {
  //     command: newTextFileId,
  //     category: 'File Operations',
  //     text: 'New Text File',
  //     caption: 'Create a new text file'
  //   }
  // ]);

  // // Add the command for saving a document.
  // let saveDocumentId = 'file-operations:save';

  // app.commands.add([
  //   {
  //     id: saveDocumentId,
  //     handler: () => {
  //       registry.save(modelRegistry[activeId]);
  //     }
  //   }
  // ]);
  // app.palette.add([
  //   {
  //     command: saveDocumentId,
  //     category: 'File Operations',
  //     text: 'Save Document',
  //     caption: 'Save the current document'
  //   }
  // ]);

  // // Add the command for reverting a document.
  // let revertDocumentId = 'file-operations:revert';

  // app.commands.add([
  //   {
  //     id: revertDocumentId,
  //     handler: () => {
  //       registry.revert(modelRegistry[activeId]);
  //     }
  //   }
  // ]);
  // app.palette.add([
  //   {
  //     command: revertDocumentId,
  //     category: 'File Operations',
  //     text: 'Revert Document',
  //     caption: 'Revert the current document'
  //   }
  // ]);

  // // Add the command for closing a document.
  // let closeDocumentId = 'file-operations:close';

  // app.commands.add([
  //   {
  //     id: closeDocumentId,
  //     handler: () => {
  //       registry.close(modelRegistry[activeId]);
  //     }
  //   }
  // ]);
  // app.palette.add([
  //   {
  //     command: closeDocumentId,
  //     category: 'File Operations',
  //     text: 'Close Document',
  //     caption: 'Close the current document'
  //   }
  // ]);

  // // Add the command for closing all documents.
  // let closeAllId = 'file-operations:close-all';

  // app.commands.add([
  //   {
  //     id: closeAllId,
  //     handler: () => {
  //       for (let id of Object.keys(widgetRegistry)) {
  //         widgetRegistry[id].close();
  //       }
  //     }
  //   }
  // ]);
  // app.palette.add([
  //   {
  //     command: closeAllId,
  //     category: 'File Operations',
  //     text: 'Close All',
  //     caption: 'Close all open documents'
  //   }
  // ]);

// let modelRegistry: { [key: string]: IContentsModel } = Object.create(null);
// let widgetRegistry: { [key: string]: IContentsModel } = Object.create(null);


  // // Add the focus handling here.
  // // Need to know which *widget* was last focused.
  // // Which means we need all of the widgets.
  // // For now, we keep references to all of them
  // document.addEventListener('focus', event => {
  //   for (let widget of Object.keys(modelRegistry)) {
  //     let target = event.target as HTMLElement;
  //     if (widget.isAttached && widget.isVisible) {
  //       if (widget.node.contains(target)) {
  //         activeId = widget.id;
  //         return;
  //       }
  //     }
  //   }
  // });



