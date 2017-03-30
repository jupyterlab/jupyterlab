// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Token
} from '@phosphor/coreutils';

import {
  FileBrowser
} from './browser';


/* tslint:disable */
/**
 * The path tracker token.
 */
export
const IFileBrowserFactory = new Token<IFileBrowserFactory>('jupyter.services.file-browser');
/* tslint:enable */


/**
 * The file browser factory interface.
 */
export
interface IFileBrowserFactory {
  /**
   * Create a new file browser instance.
   */
  createFileBrowser(options: IFileBrowserFactory.IOptions): FileBrowser;
}


/**
 * A namespace for file browser factory interfaces.
 */
export
namespace IFileBrowserFactory {
  /**
   * The options for creating a file browser using a file browser factory.
   */
  export
  interface IOptions {
    /**
     * The command registry used by the file browser.
     */
    commands: CommandRegistry;

    /**
     * The document manager used by the file browser.
     */
    documentManager: IDocumentManager;

    /**
     * The service manager used by the file browser.
     */
    serviceManager: IServiceManager;
  }
}
