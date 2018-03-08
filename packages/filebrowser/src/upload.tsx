// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  // ToolbarButton,
  showErrorMessage,
  VDomRenderer
} from '@jupyterlab/apputils';

import {
  FileBrowserModel
} from './model';

import * as React from 'react';

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
class Uploader extends VDomRenderer<null> {
  /**
   * Construct a new toolbar button.
   */
  constructor(options: Uploader.IOptions) {
    super();
    this.props = options;
    this.state = { value: '' };
  }

  handleInputChange = () => {
    const files = Array.prototype.slice.call(this._input.files) as File[];
    const pending = files.map((file) => this.props.model.upload(file));
    Promise.all(pending).catch((error) => {
      showErrorMessage('Upload Error', error);
    });
  }

  handleInputClick = () => {
    // In order to allow repeated uploads of the same file (with delete in between),
    // we need to clear the input value to trigger a change event.
    this.state = { value: '' };
    this.update();
  }

  /**
   * Render the Toolbar to virtual DOM nodes.
   */
  protected render(): React.ReactElement<any> {
    return (
      <div
        className={UPLOAD_CLASS}
        onClick={this.handleInputClick}
        title="Upload Files"
      >
        <span className={CONTENT_CLASS}>
          <span
            className={
              ICON_CLASS + ' ' + MATERIAL_CLASS + ' ' + MATERIAL_UPLOAD
            }
          />
        </span>
        <input
          ref={(ref) => (this._input = ref)}
          value={this.state.value}
          onClick={this.handleInputClick}
          onChange={this.handleInputChange}
          type="file"
          multiple
        />
      </div>
    );
  }

  private props: Uploader.IOptions;
  private state: { value: string };
  private _input: HTMLInputElement;
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
