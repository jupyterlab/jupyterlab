// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { fileUploadIcon, ToolbarButton } from '@jupyterlab/ui-components';
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
      label: options.label,
      onClick: () => {
        this._input.click();
      },
      tooltip: Private.translateToolTip(options.translator)
    });
    this.fileBrowserModel = options.model;
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
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
      void showErrorMessage(
        this._trans._p('showErrorMessage', 'Upload Error'),
        error
      );
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

  protected translator: ITranslator;
  private _trans: TranslationBundle;
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

    /**
     * The language translator.
     */
    translator?: ITranslator;

    /**
     * An optional label.
     */
    label?: string;
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

  /**
   * Translate upload tooltip.
   */
  export function translateToolTip(translator?: ITranslator): string {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    return trans.__('Upload Files');
  }
}
