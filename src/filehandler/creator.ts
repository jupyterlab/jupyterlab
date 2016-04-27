// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IContentsManager
} from 'jupyter-js-services';

import {
  showDialog
} from '../dialog';


/**
 * A class that creates files for a file registry.
 */
export
class FileCreator {
  /**
   * Create the dialog for the file creator.
   */
  static createDialog(): HTMLElement {
    let node = document.createElement('div');
    let input = document.createElement('input');
    node.appendChild(input);
    return node;
  }

  /**
   * Construct a new file creator.
   */
  constructor(manager: IContentsManager, displayName = 'File') {
    this._manager = manager;
    this._displayName = displayName;
    let constructor = this.constructor as typeof FileCreator;
    this._body = constructor.createDialog();
  }

  /**
   * Create a new file object in the given directory.
   */
  createNew(path: string, host?: HTMLElement): Promise<IContentsModel> {
    this.host = host || this._host;
    return this.createUntitled(path).then(contents => {
      return this.doRename(contents);
    }).catch(error => {
      return this.showErrorMessage(error);
    });
  }

  /**
   * Get the contents manager used by the creator.
   *
   * #### Notes
   * This is a read-only property.
   */
  protected get manager(): IContentsManager {
    return this._manager;
  }

  /**
   * Get the host node for file creation dialogs.
   *
   * #### Notes
   * This is a read-only property.
   */
  protected get host(): HTMLElement {
    return this._host;
  }
  protected set host(value: HTMLElement) {
    this._host = value;
  }

  /**
   * The input node with the file name.
   *
   * #### Notes
   * This is a read-only property.
   */
  protected get fileNode(): HTMLInputElement {
    return this.body.getElementsByTagName('input')[0];
  }

  /**
   * The dialog body.
   *
   * #### Notes
   * This is a read-only property.
   */
  protected get body(): HTMLElement {
    return this._body;
  }

  /**
   * The dialog display name.
   *
   * #### Notes
   * This is a read-only property.
   */
  protected get displayName(): string {
    return this._displayName;
  }

  /**
   * Rename a file or directory.
   */
  protected doRename(contents: IContentsModel): Promise<IContentsModel> {
    let edit = this.fileNode;
    edit.value = contents.name;
    let dname = contents.path.slice(0, -contents.name.length);
    return showDialog({
      title: `Create a New ${this._displayName}`,
      body: this.body,
      host: this._host,
      okText: 'CREATE'
    }).then(value => {
      if (value === null) {
        return this.manager.delete(contents.path).then(() => void 0);
      }
      if (value.text === 'CREATE') {
        if (edit.value === contents.name) {
          return contents;
        }
        return this.manager.rename(contents.path, `${dname}/${edit.value}`);
      } else {
        return this.manager.delete(contents.path).then(() => void 0);
      }
    }).catch(error => {
      if (error.statusText === 'Conflict') {
        return this.handleExisting(edit.value, contents);
      }
      return this.showErrorMessage(error);
    });
  }

  /**
   * Show an error message.
   */
  protected showErrorMessage(error: Error): Promise<IContentsModel> {
    return showDialog({
      title: `${this.displayName} Creation Error`,
      body: error.message,
      host: this.host,
      okText: 'DISMISS'
    }).then(() => { return void 0; });
  }

  /**
   * Handle an existing file name.
   */
  protected handleExisting(name: string, contents: IContentsModel): Promise<IContentsModel> {
    return showDialog({
      title: `${this.displayName} already exists`,
      body: `${this.displayName} "${name}" already exists, try again?`,
      host: this.host
    }).then(value => {
      if (value.text === 'OK') {
        return this.doRename(contents);
      } else {
        return this.manager.delete(contents.path).then(() => void 0);
      }
    });
  }

  /**
   * Create a new untitled file on the current path.
   */
  protected createUntitled(path: string): Promise<IContentsModel> {
    return this.manager.newUntitled(path, {
      type: 'file', ext: '.txt'
    });
  }

  private _manager: IContentsManager = null;
  private _host: HTMLElement = document.body;
  private _displayName = '';
  private _body: HTMLElement = null;
}



/**
 * A file creator which creates directories.
 */
export
class DirectoryCreator extends FileCreator {
  /**
   * Construct a new directory creator.
   */
  constructor(manager: IContentsManager, displayName = 'Directory') {
    super(manager, displayName);
  }

  /**
   * Create a new untitled directory on the given path.
   */
  protected createUntitled(path: string): Promise<IContentsModel> {
    return this.manager.newUntitled(path, { type: 'directory' });
  }

}
