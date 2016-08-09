// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from 'jupyter-js-services';

import {
okButton, cancelButton, showDialog
} from '../dialog';

import {
  IDocumentContext, IDocumentModel
} from '../docregistry';


/**
 * A class that manages the auto saving of a document.
 *
 * #### Notes
 * Implements https://github.com/ipython/ipython/wiki/IPEP-15:-Autosaving-the-IPython-Notebook.
 */
export
class SaveHandler {
  /**
   * Construct a new save handler.
   */
  constructor(options: SaveHandler.IOptions) {
    this._services = options.services;
    this._context = options.context;
    this._minInterval = options.saveInterval || 120;
    this._interval = this._minInterval;
  }

  /**
   * Start the autosaver.
   */
  start(): void {
    clearTimeout(this._autosaveTimer);
    setTimeout(() => this._save(), this._interval * 1000);
  }

  /**
   * Stop the autosaver.
   */
  stop(): void {
    clearTimeout(this._autosaveTimer);
  }

  /**
   * Handle an autosave timeout.
   */
  private _save(): void {
    let context = this._context;
    // Bail if the model is not dirty or it is read only.
    if (!this._context.model.dirty || this._context.model.readOnly) {
      // Trigger the next update.
      this.start();
      return;
    }

    // Make sure the file has not changed on disk.
    this._services.contents.get(context.path).then(model => {
      if (model.last_modified !== context.contentsModel.last_modified) {
        return this._timeConflict(model.last_modified);
      }
      return this._finishSave();
    }).then(() => {
      this.start();
    }).catch(err => {
      console.error('Error in Auto-Save', err);
    });
  }

  /**
   * Handle a time conflict.
   */
  private _timeConflict(modified: string): Promise<void> {
    let localTime = new Date(this._context.contentsModel.last_modified);
    let remoteTime = new Date(modified);
    console.warn(`Last saving peformed ${localTime} ` +
                 `while the current file seem to have been saved ` +
                 `${remoteTime}`);
    let body = `The file has changed on disk since the last time we ` +
               `opened or saved it. ` +
               `Do you want to overwrite the file on disk with the version ` +
               ` open here, or load the version on disk (revert)?`;
    return showDialog({
      title: 'File Changed', body, okText: 'OVERWRITE',
      buttons: [cancelButton, { text: 'REVERT' }, okButton]
    }).then(result => {
      if (result.text === 'OVERWRITE') {
        return this._finishSave();
      } else if (result.text === 'REVERT') {
        return this._context.revert();
      }
    });
  }

  /**
   * Perform the save, adjusting the save interval as necessary.
   */
  private _finishSave(): Promise<void> {
    let start = new Date().getTime();
    return this._context.save().then(() => {
      let duration = new Date().getTime() - start;
      // New save interval: higher of 10x save duration or min interval.
      this._interval = Math.max(10 * duration, this._minInterval);
    });
  }

  private _autosaveTimer = -1;
  private _minInterval = -1;
  private _interval = -1;
  private _context: IDocumentContext<IDocumentModel> = null;
  private _services: IServiceManager = null;
}


/**
 * A namespace for `SaveHandler` statics.
 */
export
namespace SaveHandler {
  /**
   * The options used to create a save handler.
   */
  export
  interface IOptions {
    /**
     * The context asssociated with the file.
     */
    context: IDocumentContext<IDocumentModel>;

    /**
     * The service manager to use for checking last saved.
     */
    services: IServiceManager;

    /**
     * The minimum save interval in seconds (default is two minutes).
     */
    saveInterval?: number;
  }
}
