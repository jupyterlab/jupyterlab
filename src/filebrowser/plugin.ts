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
  IFileBrowserProvider
} from './index';

import {
  IEditorHandler, IServicesProvider
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
 * Resolve the default file provider.
 */
export
function resolve(container: Container): Promise<void> {
  return container.resolve(FileBrowserProvider).then(() => { return; });
}


/**
 * An implementation of the FileBrowserProvider provider.
 */
class FileBrowserProvider implements IFileBrowserProvider {

  /**
   * The dependencies required by the application shell.
   */
  static requires: Token<any>[] = [IAppShell, IServicesProvider, IEditorHandler];

  /**
   * Create a new application shell instance.
   */
  static create(shell: IAppShell, services: IServicesProvider, editor: IEditorHandler): IFileBrowserProvider {
    return new FileBrowserProvider(shell, services, editor);
  }

  /**
   * Construct a new filebrowser provider instance.
   */
  constructor(shell: IAppShell, services: IServicesProvider, editor: IEditorHandler) {
    this._shell = shell;
    this._editor = editor;
    let contents = services.createContentsManager();
    let sessions = services.createNotebookSessionManager();
    let model = new FileBrowserModel('', contents, sessions);
    this._browser = new FileBrowser(model);
    this._browser.title.text = 'File Browser';
    this._shell.addToLeftArea(this._browser, { rank: 10 });
    model.changed.connect((instance, change) => {
      if (change.name === 'open' && change.newValue.type === 'file') {
        let newEditor = editor.createEditor();
        editor.setModeByFileName(newEditor, change.newValue.name);
        editor.setText(newEditor, change.newValue.content);
        newEditor.title.text = change.newValue.name;
        this._shell.addToMainArea(newEditor);
      }
    });
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
  private _editor: IEditorHandler = null;
  private _browser: FileBrowser = null;

}
