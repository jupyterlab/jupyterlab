// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ToolbarButton, showErrorMessage } from '@jupyterlab/apputils';
import { fileUploadIcon } from '@jupyterlab/ui-components';

import { FileBrowserModel } from './model';

/**
 * A widget which provides an upload button.
 */
export class Uploader extends ToolbarButton {
  /**
   * Construct a new file browser buttons widget.
   */
  constructor(options: Uploader.IOptions) {
    super({
      icon: fileUploadIcon,
      onClick: () => {
        this._input.click();
      },
      tooltip: 'Upload Files'
    });
    this.fileBrowserModel = options.model;
    this._input.onclick = this._onInputClicked;
    this._input.onchange = this._onInputChanged;
    this.addClass('jp-id-upload');
  }

  /**
   * The underlying file browser fileBrowserModel for the widget.
   *
   * This cannot be named model as that conflicts with the model property of VDomRenderer.
   */
  readonly fileBrowserModel: FileBrowserModel;

  /**
   * The 'change' handler for the input field.
   */
  private _onInputChanged = () => {
    const files = Array.prototype.slice.call(this._input.files) as File[];
    const pending = files.map(file => this.fileBrowserModel.upload(file));
    void Promise.all(pending).catch(error => {
      void showErrorMessage('Upload Error', error);
    });
  };

  /**
   * The 'click' handler for the input field.
   */
  private _onInputClicked = () => {
    // In order to allow repeated uploads of the same file (with delete in between),
    // we need to clear the input value to trigger a change event.
    this._input.value = '';
  };

  private _input = Private.createUploadInput();
}

/**
 * The namespace for Uploader class statics.
 */
export namespace Uploader {
  /**
   * The options used to create an uploader.
   */
  export interface IOptions {
    /**
     * A file browser fileBrowserModel instance.
     */
    model: FileBrowserModel;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Create the upload input node for a file buttons widget.
   */
  export function createUploadInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    return input;
  }
}
