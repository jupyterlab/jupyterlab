// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelId
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  IDocumentModel, IWidgetFactory, IDocumentContext
} from './index';


/**
 * A document model for images
 */
export
class ImageModel implements IDocumentModel {
  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<IDocumentModel, void> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the document state changes.
   */
  get stateChanged(): ISignal<IDocumentModel, IChangedArgs<any>> {
    return Private.stateChangedSignal.bind(this);
  }

  /**
   * The dirty state of the document.
   */
  get dirty(): boolean {
    return false;
  }
  set dirty(value: boolean) {
    // No effect.
  }

  /**
   * The read only state of the document.
   */
  get readOnly(): boolean {
    return true;
  }
  set readOnly(value: boolean) {
    // No effect.
  }

  /**
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelName(): string {
    return '';
  }

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelLanguage(): string {
    return '';
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    this._isDisposed = true;
  }

  /**
   * Serialize the model to a string.
   */
  toString(): string {
    return this._source;
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    if (this._source === value) {
      return;
    }
    this._source = value;
    this.contentChanged.emit(void 0);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): any {
    return JSON.stringify(this._source);
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: any): void {
    this.fromString(JSON.parse(value));
  }

  /**
   * Initialize the model state.
   */
  initialize(): void {
    // No action necessary.
  }

  private _source = '';
  private _isDisposed = false;
}


/**
 * The default implementation of a model factory.
 */
export
class ImageModelFactory {
  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    this._isDisposed = true;
  }

  /**
   * Create a new model.
   *
   * @param languagePreference - An optional kernel language preference.
   *
   * @returns A new document model.
   */
  createNew(languagePreference?: string): IDocumentModel {
    return new ImageModel();
  }

  /**
   * Get the preferred kernel language given an extension.
   */
  preferredLanguage(ext: string): string {
    return void 0;
  }

  private _isDisposed = false;
}


/**
 * A document widget for images.
 */
export
class ImageWidget extends Widget {
  /**
   * Create the node for the image widget.
   */
  static createNode(): HTMLElement {
    return document.createElement('img');
  }

  /**
   * Construct a new image widget.
   */
  constructor(model: ImageModel, context: IDocumentContext) {
    super();
    this._model = model;
    this._context = context;
    this.node.tabIndex = -1;
    this.node.style.overflowX = 'auto';
    this.node.style.overflowY = 'auto';
    if (model.toString()) {
      this.update();
    }
    context.pathChanged.connect(() => {
      this.update();
    });
    model.contentChanged.connect(() => {
      this.update();
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    this._context = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this.title.text = this._context.path.split('/').pop();
    let node = this.node as HTMLImageElement;
    let content = this._model.toString();
    let model = this._context.contentsModel;
    node.src = `data:${model.mimetype};${model.format},${content}`;
  }

  private _model: ImageModel;
  private _context: IDocumentContext;
}


/**
 * A widget factory for images.
 */
export
class ImageWidgetFactory implements IWidgetFactory<ImageWidget> {
  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    this._isDisposed = true;
  }

  /**
   * Create a new widget given a document model and a context.
   */
  createNew(model: ImageModel, context: IDocumentContext, kernel?: IKernelId): ImageWidget {
    return new ImageWidget(model, context);
  }

  /**
   * Take an action on a widget before closing it.
   *
   * @returns A promise that resolves to true if the document should close
   *   and false otherwise.
   */
  beforeClose(model: IDocumentModel, context: IDocumentContext, widget: Widget): Promise<boolean> {
    // There is nothing specific to do.
    return Promise.resolve(true);
  }

  private _isDisposed = false;
}


/**
 * A private namespace for data.
 */
namespace Private {
  /**
   * A signal emitted when a document content changes.
   */
  export
  const contentChangedSignal = new Signal<IDocumentModel, void>();

  /**
   * A signal emitted when a document dirty state changes.
   */
  export
  const stateChangedSignal = new Signal<IDocumentModel, IChangedArgs<any>>();
}
