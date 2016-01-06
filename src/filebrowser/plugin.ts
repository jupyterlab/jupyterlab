// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowser, FileBrowserModel
} from 'jupyter-js-filebrowser';

import {
  IAppShell
} from 'phosphide';

import {
  Container, Token
} from 'phosphor-di';

import {
  IFileBrowser
} from './index';

import {
  IServicesFactory
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
  container.register(IFileBrowser, FileBrowserProvider);
}


/**
 * An implementation of the IFileBrowser provider.
 */
class FileBrowserProvider implements IFileBrowser {

  /**
   * The dependencies required by the application shell.
   */
  static requires: Token<any>[] = [IAppShell, IServicesFactory];

  /**
   * Create a new application shell instance.
   */
  static create(shell: IAppShell, services: IServicesFactory): IServicesFactory {
    return new IServicesFactory(shell, services);
  }

  /**
   * Construct a new filebrowser provider instance.
   */
  constructor(shell: IAppShell, services: IServicesFactory) {
    this._shell = shell;
    let contents = services.createContentsManager();
    let sessions = services.createNotebookSessionManager();
    let model = new FileBrowserModel('', contents, sessions);
    this._browser = new FileBrowser(model);
    this._browser.title.text = 'File Browser';
    this._shell.addToLeftArea(this._browser, { rank: 10 });
  }

  /**
   * Get the filebrowser instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get fileBrowser(): FileBrowser {
    return this._browser;
  }

  private _shell: IAppShell = null;
  private _browser: FileBrowser = null;

}
