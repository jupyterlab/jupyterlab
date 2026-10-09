// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { fileUploadIcon, ToolbarButton } from '@jupyterlab/ui-components';
import type { FileBrowserModel } from './model';
import type { Contents } from '@jupyterlab/services';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

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
      tooltip: Private.translateToolTip(options.translator),
      enabled: options.model.allowFileUploads
    });
    this.fileBrowserModel = options.model;
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._input.onclick = this._onInputClicked;
    this._input.onchange = this._onInputChanged;
    this.addClass('jp-id-upload');
  }

  /**
   * A signal emitted with file info when a batch of upload completes.
   */
  get filesUploaded(): ISignal<this, Contents.IModel[]> {
    return this._filesUploaded;
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
    void Promise.all(pending)
      .then(models => {
        // emit the batch
        this._filesUploaded.emit(models);
      })
      .catch(error => {
        if (error?.name === 'UploadCancelledError') {
          return;
        }
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
  private _filesUploaded = new Signal<this, Contents.IModel[]>(this);
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
