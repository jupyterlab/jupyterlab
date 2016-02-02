// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileHandler
} from 'jupyter-js-filebrowser';

import {
  Container, Token
} from 'phosphor-di';

import {
  Widget
} from 'phosphor-widget';

import {
  IServicesProvider, IDocumentManager, IFileHandler
} from '../index';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function resolve(container: Container): Promise<IFileHandler> {
  return container.resolve({
    requires: [IServicesProvider, IDocumentManager],
    create: (services: IServicesProvider, manager: IDocumentManager) => {
      let handler = new FileHandler(services.contentsManager);
      manager.registerDefault(handler);
      return handler;
    }
  });
}
