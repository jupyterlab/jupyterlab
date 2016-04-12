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
   * Construct a new file creator.
   */
  constructor(manager: IContentsManager, type: string, host?: HTMLElement) {
    this._manager = manager;
    this._host = host || document.body;
    this._type = type;
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
   * Create a new file object in the given directory.
   */
  createNew(path: string): Promise<IContentsModel> {
    return this._createUntitled(path).then(contents => {
      return this.doRename(contents);
    });
  }

  /**
   * Rename a file or directory.
   */
  protected doRename(contents: IContentsModel): Promise<IContentsModel> {
    let edit = document.createElement('input');
    edit.value = contents.name;
    let dname = contents.path.slice(0, -contents.name.length);
    return showDialog({
      title: `Create a new ${contents.type}`,
      body: edit,
      host: this.host,
      okText: 'CREATE'
    }).then(value => {
      if (value.text === 'CREATE') {
        return this._manager.rename(contents.path, `${dname}/${edit.value}`);
      } else {
        return this._manager.delete(contents.path).then(() => void 0);
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
  private showErrorMessage(error: Error): Promise<IContentsModel> {
    return showDialog({
      title: 'File Creation Error',
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
      title: 'File already exists',
      body: `File "${name}" already exists, try again?`,
      host: this._host
    }).then(value => {
      if (value.text === 'OK') {
        return this.doRename(contents);
      } else {
        return this._manager.delete(contents.path).then(() => void 0);
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
}
