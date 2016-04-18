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
