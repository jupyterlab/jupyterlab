// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  CodeCellModel, RawCellModel
} from '../cells/model';


/**
 * The definition of a model object for a console widget.
 */
export
interface IConsoleModel extends IDisposable {
  /**
   * A signal emitted when a prompt is added.
   */
  promptAdded: ISignal<IConsoleModel, CodeCellModel>;

  /**
   * The console's banner model.
   *
   * #### Notes
   * This is a read-only property.
   */
  banner: RawCellModel;

  /**
   * The console's current prompt cell model.
   *
   * #### Notes
   * This is a read-only property.
   */
  prompt: CodeCellModel;

  /**
   * The console's prompt cells.
   *
   * ##### Notes
   * This is a read-only property.
   */
  prompts: CodeCellModel[];

  /**
   * Add a new prompt cell.
   */
  newPrompt(): void;
}


/**
 * An implementation of a console model.
 */
export
class ConsoleModel implements IConsoleModel {
  /**
   * Construct a new console model.
   */
  constructor() {
    this._banner = new RawCellModel();
    this._banner.source = '...';
    this.newPrompt();
  }

  /**
   * A signal emitted when a prompt is added.
   */
  get promptAdded(): ISignal<IConsoleModel, CodeCellModel> {
    return Private.promptAddedSignal.bind(this);
  }

  /**
   * The console's banner model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get banner(): RawCellModel {
    return this._banner;
  }

  /**
   * The console's current prompt cell model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get prompt(): CodeCellModel {
    return this._prompts[this._prompts.length - 1];
  }

  /**
   * The console's prompt cells.
   *
   * ##### Notes
   * This is a read-only property.
   */
  get prompts(): CodeCellModel[] {
    return this._prompts.slice();
  }

  /**
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._prompts === null;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    for (let cell of this._prompts) {
      cell.dispose();
    }
    this._banner.dispose();
    this._banner = null;
    this._prompts = null;
  }

  /**
   * Add a new prompt cell.
   */
  newPrompt(): void {
    let cell = new CodeCellModel();
    this._prompts.push(cell);
    this.promptAdded.emit(cell);
  }

  private _banner: RawCellModel = null;
  private _prompts: CodeCellModel[] = null;
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when a prompt is added.
   */
  export
  const promptAddedSignal = new Signal<IConsoleModel, CodeCellModel>();
}
