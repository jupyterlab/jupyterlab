// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  showErrorMessage,
  VDomRenderer
} from '@jupyterlab/apputils';

import {
  Button
} from '@jupyterlab/ui';

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
   * Construct a new kernel name widget.
   */
  constructor(options: Uploader.IOptions) {
    super();
    this.props = options;
    this.state = { value: '' };
    this.addClass('jp-Toolbar-item');
    this.removeClass('p-Widget');
  }

  /**
   * The 'change' handler for the input field.
   */
  private _onInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.prototype.slice.call(event.target.files) as File[];
    const pending = files.map((file) => this.props.model.upload(file));
    Promise.all(pending).catch((error) => {
      showErrorMessage('Upload Error', error);
    });
  }

  /**
   * The 'click' handler for the input field.
   */
  private _onInputClicked = () => {
    // In order to allow repeated uploads of the same file (with delete in between),
    // we need to clear the input value to trigger a change event.
    this.state = { value: '' };
    this.render();
  }

  /**
   * Render the Toolbar to virtual DOM nodes.
   */
  protected render(): React.ReactElement<any> {
    const className = `${UPLOAD_CLASS} jp-Toolbar-button`;
    return (
      <Button
        className={className}
        onClick={() => {
          this._input.click();
        }}
        tooltip="Upload Files"
      >
        <span className={CONTENT_CLASS}>
          <span
            className={
              ICON_CLASS + ' ' + MATERIAL_CLASS + ' ' + MATERIAL_UPLOAD
            }
          />
        </span>
        <input
          ref={(ref) => {
            this._input = ref;
          }}
          style={{ display: 'none' }}
          value={this.state.value}
          onClick={this._onInputClicked}
          onChange={this._onInputChanged}
          type="file"
          multiple
        />
      </Button>
    );
  }

  props: Uploader.IOptions;
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
