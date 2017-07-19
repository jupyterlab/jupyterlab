// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ToolbarButton
} from '@jupyterlab/apputils';

import {
  FileBrowserModel
} from './model';

import * as utils
  from './utils';


/**
 * The class name added to a button content node.
 */
const CONTENT_CLASS = 'jp-FileButtons-buttonContent';

/**
 * The class name added to a button icon node.
 */
const ICON_CLASS = 'jp-FileButtons-buttonIcon';

/**
 * The class name added to the upload button.
 */
const MATERIAL_UPLOAD = 'jp-UploadIcon';

/**
 * The class name added to a material icon button.
 */
const MATERIAL_CLASS = 'jp-MaterialIcon';

/**
 * The class name added to the upload button.
 */
const UPLOAD_CLASS = 'jp-id-upload';


/**
 * A widget which provides an upload button.
 */
export
class Uploader extends ToolbarButton {
  /**
   * Construct a new file browser buttons widget.
   */
  constructor(options: Uploader.IOptions) {
    super({
      className: UPLOAD_CLASS,
      onClick: () => {
        this._input.click();
      },
      tooltip: 'Upload File(s)'
    });
    let uploadContent = document.createElement('span');
    let uploadIcon = document.createElement('span');
    uploadContent.className = CONTENT_CLASS;
    uploadIcon.className = ICON_CLASS + ' ' + MATERIAL_CLASS + ' ' + MATERIAL_UPLOAD;
    uploadContent.appendChild(uploadIcon);
    this.node.appendChild(uploadContent);
    this.model = options.model;
    this._input.onclick = this._onInputClicked.bind(this);
    this._input.onchange = this._onInputChanged.bind(this);
  }

  /**
   * The underlying file browser model for the widget.
   */
  readonly model: FileBrowserModel;

  /**
   * The 'change' handler for the input field.
   */
  private _onInputChanged(): void {
    let files = Array.prototype.slice.call(this._input.files) as File[];
    let pending = files.map(file => this.model.upload(file));
    Promise.all(pending).catch(error => {
      utils.showErrorMessage('Upload Error', error);
    });
  }

  /**
   * The 'click' handler for the input field.
   */
  private _onInputClicked(): void {
    // In order to allow repeated uploads of the same file (with delete in between),
    // we need to clear the input value to trigger a change event.
    this._input.value = '';
  }

  private _input = Private.createUploadInput();
}


/**
 * The namespace for Uploader class statics.
 */
export
namespace Uploader {
  /**
   * The options used to create an uploader.
   */
  export
  interface IOptions {
    /**
     * A file browser model instance.
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
  export
  function createUploadInput(): HTMLInputElement {
    let input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    return input;
  }
}
