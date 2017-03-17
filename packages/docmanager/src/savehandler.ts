// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Signal
} from '@phosphor/signaling';

import {
Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';


/**
 * A class that manages the auto saving of a document.
 *
 * #### Notes
 * Implements https://github.com/ipython/ipython/wiki/IPEP-15:-Autosaving-the-IPython-Notebook.
 */
export
class SaveHandler implements IDisposable {
  /**
   * Construct a new save handler.
   */
  constructor(options: SaveHandler.IOptions) {
    this._manager = options.manager;
    this._context = options.context;
    this._minInterval = options.saveInterval * 1000 || 120000;
    this._interval = this._minInterval;
    // Restart the timer when the contents model is updated.
    this._context.fileChanged.connect(this._setTimer, this);
    this._context.disposed.connect(this.dispose, this);
  }

  /**
   * The save interval used by the timer (in seconds).
   */
  get saveInterval(): number {
    return this._interval / 1000;
  }
  set saveInterval(value: number) {
    this._minInterval = this._interval = value * 1000;
    if (this._isActive) {
      this._setTimer();
    }
  }

  /**
   * Get whether the handler is active.
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Get whether the save handler is disposed.
   */
  get isDisposed(): boolean {
    return this._context === null;
  }

  /**
   * Dispose of the resources used by the save handler.
   */
  dispose(): void {
    if (this._context === null) {
      return;
    }
    this._context = null;
    clearTimeout(this._autosaveTimer);
    Signal.clearData(this);
  }

  /**
   * Start the autosaver.
   */
  start(): void {
    this._isActive = true;
    this._setTimer();
  }

  /**
   * Stop the autosaver.
   */
  stop(): void {
    this._isActive = false;
    clearTimeout(this._autosaveTimer);
  }

  /**
   * Set the timer.
   */
  private _setTimer(): void {
    clearTimeout(this._autosaveTimer);
    if (!this._isActive) {
      return;
    }
    this._autosaveTimer = window.setTimeout(() => {
      this._save();
    }, this._interval);
  }

  /**
   * Handle an autosave timeout.
   */
  private _save(): void {
    let context = this._context;

    // Trigger the next update.
    this._setTimer();

    if (!context) {
      return;
    }

    // Bail if the model is not dirty or it is read only, or the dialog
    // is already showing.
    if (!context.model.dirty || context.model.readOnly || this._inDialog) {
      return;
    }

    // Make sure the file has not changed on disk.
    let promise = this._manager.contents.get(context.path);
    promise.then(model => {
      if (!this.isDisposed && context.contentsModel &&
          model.last_modified !== context.contentsModel.last_modified) {
        return this._timeConflict(model.last_modified);
      }
      return this._finishSave();
    }, (err) => {
      return this._finishSave();
    }).catch(err => {
      console.error('Error in Auto-Save', err.message);
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
    this._inDialog = true;
    let revertBtn = Dialog.okButton({ label: 'REVERT' });
    let overwriteBtn = Dialog.warnButton({ label: 'OVERWRITE' });
    return showDialog({
      title: 'File Changed', body,
      buttons: [Dialog.cancelButton(), revertBtn, overwriteBtn]
    }).then(result => {
      if (this.isDisposed) {
        return;
      }
      this._inDialog = false;
      if (result.label === 'OVERWRITE') {
        return this._finishSave();
      } else if (result.label === 'REVERT') {
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
      if (this.isDisposed) {
        return;
      }
      let duration = new Date().getTime() - start;
      // New save interval: higher of 10x save duration or min interval.
      this._interval = Math.max(10 * duration, this._minInterval);
      // Restart the update to pick up the new interval.
      this._setTimer();
    });
  }

  private _autosaveTimer = -1;
  private _minInterval = -1;
  private _interval = -1;
  private _context: DocumentRegistry.Context = null;
  private _manager: ServiceManager.IManager = null;
  private _isActive = false;
  private _inDialog = false;
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
    context: DocumentRegistry.Context;

    /**
     * The service manager to use for checking last saved.
     */
    manager: ServiceManager.IManager;

    /**
     * The minimum save interval in seconds (default is two minutes).
     */
    saveInterval?: number;
  }
}
