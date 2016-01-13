// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileBrowserModel
} from 'jupyter-js-filebrowser';

import {
  IAppShell
} from 'phosphide';

import {
  Container, Token
} from 'phosphor-di';

import {
  IFileBrowserProvider
} from './index';

import {
  IServicesProvider
} from '../index';

import './plugin.css';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function register(container: Container): void {
  container.register(IFileBrowserProvider, FileBrowserProvider);
}


/**
 * An implementation of the FileBrowserProvider provider.
 */
class FileBrowserProvider implements IFileBrowserProvider {

  /**
   * The dependencies required by the application shell.
   */
  static requires: Token<any>[] = [IServicesProvider];

  /**
   * Create a new application shell instance.
   */
  static create(services: IServicesProvider): IFileBrowserProvider {
    return new FileBrowserProvider(services);
  }

  /**
   * Construct a new filebrowser provider instance.
   */
  constructor(services: IServicesProvider) {
    let contents = services.contentsManager;
    let sessions = services.notebookSessionManager;
    let model = new FileBrowserModel(contents, sessions);
    this._browser = new FileBrowserWidget(model);
    this._browser.title.text = 'Files';
  }

  /**
   * Get the filebrowser instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get fileBrowser(): FileBrowserWidget {
    return this._browser;
  }

  private _browser: FileBrowserWidget = null;
}
