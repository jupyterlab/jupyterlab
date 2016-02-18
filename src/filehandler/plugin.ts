// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileHandler, AbstractFileHandler, DocumentManager
} from 'jupyter-js-docmanager';

import {
  Widget
} from 'phosphor-widget';

import {
  ServicesProvider
} from '../services/plugin';


/**
 * The default file handler provider.
 */
export
const fileHandlerProvider = {
  id: 'jupyter.services.fileHandler',
  provides: FileHandler,
  requires: [DocumentManager, ServicesProvider],
  resolve: (manager: DocumentManager, services: ServicesProvider) => {
    let handler = new FileHandler(services.contentsManager);
    manager.registerDefault(handler);
    return handler;
  },
};
