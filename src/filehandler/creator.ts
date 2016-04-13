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
  constructor(manager: IContentsManager, type: string) {
    this._manager = manager;
    this._type = type;
    this._displayType = type.charAt(0).toUpperCase() + type.slice(1);
    let constructor = this.constructor as typeof FileCreator;
    this._body = constructor.createDialog();
  }

  /**
   * Get the contents manager used by the creator.
   *
   * #### Notes
   * This is a read-only property.
   */
  get manager(): IContentsManager {
    return this._manager;
  }

  /**
   * Get the host node for file creation dialogs.
   *
   * #### Notes
   * This is a read-only property.
   */
  get host(): HTMLElement {
    return this._host;
  }

  /**
   * The input node with the file name.
   */
  get fileNode(): HTMLInputElement {
    return this._body.getElementsByTagName('input')[0];
  }

  /**
   * The dialog body.
   */
  get body(): HTMLElement {
    return this._body;
  }

  /**
   * Create a new file object in the given directory.
   */
  createNew(path: string, host?: HTMLElement): Promise<IContentsModel> {
    this._host = host || document.body;
    return this._createUntitled(path).then(contents => {
      return this.doRename(contents);
    });
  }

  /**
   * Rename a file or directory.
   */
  protected doRename(contents: IContentsModel): Promise<IContentsModel> {
    let edit = this.fileNode;
    edit.value = contents.name;
    let dname = contents.path.slice(0, -contents.name.length);
    return showDialog({
      title: `Create a New ${this._displayType}`,
      body: this.body,
      host: this._host,
      okText: 'CREATE'
    }).then(value => {
      if (value.text === 'CREATE') {
        return this.manager.rename(contents.path, `${dname}/${edit.value}`);
      } else {
        return this.manager.delete(contents.path).then(() => void 0);
      }
    }).catch(error => {
      if (error.statusText === 'Conflict') {
        return this.handleExisting(edit.value, contents);
      }
      return this.showErrorMessage(error);
    }
    );
  }

  /**
   * Show an error message.
   */
  protected showErrorMessage(error: Error): Promise<IContentsModel> {
    return showDialog({
      title: `${this._displayType} Creation Error`,
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
      title: `${this._displayType} already exists`,
      body: `${this._displayType} "${name}" already exists, try again?`,
      host: this._host
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
  private _createUntitled(path: string): Promise<IContentsModel> {
    let ext = this._type === 'file' ? '.txt' : '';
    return this._manager.newUntitled(path, {
      type: this._type, ext
    });
  }

  private _manager: IContentsManager = null;
  private _host: HTMLElement = null;
  private _type = 'file';
  private _displayType = '';
  private _body: HTMLElement = null;
}
