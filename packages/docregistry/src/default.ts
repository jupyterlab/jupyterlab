// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Mode
} from '@jupyterlab/codemirror';

import {
  Contents
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  ActivityMonitor, IChangedArgs, IModelDB
} from '@jupyterlab/coreutils';

import {
  IRenderMime, MimeModel
} from '@jupyterlab/rendermime';

import {
  DocumentRegistry
} from './index';


/**
 * The default implementation of a document model.
 */
export
class DocumentModel extends CodeEditor.Model implements DocumentRegistry.ICodeModel  {
  /**
   * Construct a new document model.
   */
  constructor(languagePreference?: string, modelDB?: IModelDB) {
    super({modelDB});
    this._defaultLang = languagePreference || '';
    this.value.changed.connect(this.triggerContentChange, this);
  }

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<this, void> {
    return this._contentChanged;
  }

  /**
   * A signal emitted when the document state changes.
   */
  get stateChanged(): ISignal<this, IChangedArgs<any>> {
    return this._stateChanged;
  }

  /**
   * The dirty state of the document.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(newValue: boolean) {
    if (newValue === this._dirty) {
      return;
    }
    let oldValue = this._dirty;
    this._dirty = newValue;
    this.triggerStateChange({ name: 'dirty', oldValue, newValue });
  }

  /**
   * The read only state of the document.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(newValue: boolean) {
    if (newValue === this._readOnly) {
      return;
    }
    let oldValue = this._readOnly;
    this._readOnly = newValue;
    this.triggerStateChange({ name: 'readOnly', oldValue, newValue });
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
    return this._defaultLang;
  }

  /**
   * Serialize the model to a string.
   */
  toString(): string {
    return this.value.text;
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    this.value.text = value;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): any {
    return JSON.stringify(this.value.text);
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
   * Trigger a state change signal.
   */
  protected triggerStateChange(args: IChangedArgs<any>): void {
    this._stateChanged.emit(args);
  }

  /**
   * Trigger a content changed signal.
   */
  protected triggerContentChange(): void {
    this._contentChanged.emit(void 0);
    this.dirty = true;
  }

  private _defaultLang = '';
  private _dirty = false;
  private _readOnly = false;
  private _contentChanged = new Signal<this, void>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);
}


/**
 * An implementation of a model factory for text files.
 */
export
class TextModelFactory implements DocumentRegistry.CodeModelFactory {
  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'text';
  }

  /**
   * The type of the file.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentType(): Contents.ContentType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): Contents.FileFormat {
    return 'text';
  }

  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model factory.
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
  createNew(languagePreference?: string, modelDB?: IModelDB): DocumentRegistry.ICodeModel {
    return new DocumentModel(languagePreference, modelDB);
  }

  /**
   * Get the preferred kernel language given an extension.
   */
  preferredLanguage(ext: string): string {
    let mode = Mode.findByExtension(ext.slice(1));
    return mode && mode.mode;
  }

  private _isDisposed = false;
}


/**
 * An implementation of a model factory for base64 files.
 */
export
class Base64ModelFactory extends TextModelFactory {
  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'base64';
  }

  /**
   * The type of the file.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentType(): Contents.ContentType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): Contents.FileFormat {
    return 'base64';
  }
}


/**
 * The default implemetation of a widget factory.
 */
export
abstract class ABCWidgetFactory<T extends DocumentRegistry.IReadyWidget, U extends DocumentRegistry.IModel> implements DocumentRegistry.IWidgetFactory<T, U> {
  /**
   * Construct a new `ABCWidgetFactory`.
   */
  constructor(options: DocumentRegistry.IWidgetFactoryOptions) {
    this._name = options.name;
    this._readOnly = options.readOnly === undefined ? false : options.readOnly;
    this._defaultFor = options.defaultFor ? options.defaultFor.slice() : [];
    this._fileExtensions = options.fileExtensions.slice();
    this._modelName = options.modelName || 'text';
    this._preferKernel = !!options.preferKernel;
    this._canStartKernel = !!options.canStartKernel;
  }

  /**
   * A signal emitted when a widget is created.
   */
  get widgetCreated(): ISignal<DocumentRegistry.IWidgetFactory<T, U>, T> {
    return this._widgetCreated;
  }

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
   * Whether the widget factory is read only.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }

  /**
   * The name of the widget to display in dialogs.
   */
  get name(): string {
    return this._name;
  }

  /**
   * The file extensions the widget can view.
   */
  get fileExtensions(): string[] {
    return this._fileExtensions.slice();
  }

  /**
   * The registered name of the model type used to create the widgets.
   */
  get modelName(): string {
    return this._modelName;
  }

  /**
   * The file extensions for which the factory should be the default.
   */
  get defaultFor(): string[] {
    return this._defaultFor.slice();
  }

  /**
   * Whether the widgets prefer having a kernel started.
   */
  get preferKernel(): boolean {
    return this._preferKernel;
  }

  /**
   * Whether the widgets can start a kernel when opened.
   */
  get canStartKernel(): boolean {
    return this._canStartKernel;
  }

  /**
   * Create a new widget given a document model and a context.
   *
   * #### Notes
   * It should emit the [widgetCreated] signal with the new widget.
   */
  createNew(context: DocumentRegistry.IContext<U>): T {
    let widget = this.createNewWidget(context);
    this._widgetCreated.emit(widget);
    return widget;
  }

  /**
   * Create a widget for a context.
   */
  protected abstract createNewWidget(context: DocumentRegistry.IContext<U>): T;

  private _isDisposed = false;
  private _name: string;
  private _readOnly: boolean;
  private _canStartKernel: boolean;
  private _preferKernel: boolean;
  private _modelName: string;
  private _fileExtensions: string[];
  private _defaultFor: string[];
  private _widgetCreated = new Signal<DocumentRegistry.IWidgetFactory<T, U>, T>(this);
}



/**
 * A widget for rendered mimetype.
 */
export
class MimeRenderer extends Widget {
  /**
   * Construct a new markdown widget.
   */
  constructor(options: MimeRenderer.IOptions) {
    super();
    let layout = this.layout = new PanelLayout();
    let toolbar = new Widget();
    toolbar.addClass('jp-Toolbar');
    layout.addWidget(toolbar);
    let context = options.context;
    this.title.label = context.path.split('/').pop();
    this._rendermime = options.rendermime;
    this._rendermime.resolver = context;
    this._context = context;
    this._mimeType = options.mimeType;

    context.pathChanged.connect(this._onPathChanged, this);

    // Throttle the rendering rate of the widget.
    this._monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
      timeout: options.renderTimeout
    });
    this._monitor.activityStopped.connect(this.update, this);
  }

  /**
   * The markdown widget's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._monitor.dispose();
    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Handle an `after-attach` message to the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle an `update-request` message to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    let context = this._context;
    let model = context.model;
    let layout = this.layout as PanelLayout;
    let data: JSONObject = {};
    data[this._mimeType] = model.toString();
    let mimeModel = new MimeModel({ data, trusted: false });
    let widget = this._rendermime.render(mimeModel);
    if (layout.widgets.length === 2) {
      // The toolbar is layout.widgets[0]
      layout.widgets[1].dispose();
    }
    layout.addWidget(widget);
  }

  /**
   * Handle a path change.
   */
  private _onPathChanged(): void {
    this.title.label = this._context.path.split('/').pop();
  }

  private _context: DocumentRegistry.Context = null;
  private _monitor: ActivityMonitor<any, any> = null;
  private _rendermime: IRenderMime = null;
  private _mimeType: string;
}


/**
 * The namespace for MimeRenderer class statics.
 */
export
namespace MimeRenderer {
  /**
   * The options used to initialize a MimeRenderer.
   */
  export
  interface IOptions {
    /**
     * The document context.
     */
    context: DocumentRegistry.Context;

    /**
     * The rendermime instance.
     */
    rendermime: IRenderMime;

    /**
     * The mime type.
     */
    mimeType: string;

    /**
     * The render timeout.
     */
    renderTimeout: number;
  }
}


/**
 * An implementation of a widget factory for a rendered mimetype.
 */
export
class MimeRendererFactory extends ABCWidgetFactory<MimeRenderer, DocumentRegistry.IModel> {
  /**
   * Construct a new markdown widget factory.
   */
  constructor(options: MimeRendererFactory.IOptions) {
    super(options);
    this._rendermime = options.rendermime;
    this._mimeType = options.mimeType;
    this._renderTimeout = options.renderTimeout || 1000;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): MimeRenderer {
    return new MimeRenderer({
      context,
      rendermime: this._rendermime.clone(),
      mimeType: this._mimeType,
      renderTimeout: this._renderTimeout
    });
  }

  private _rendermime: IRenderMime = null;
  private _mimeType: string;
  private _renderTimeout: number;
}


/**
 * The namespace for MimeRendererFactory class statics.
 */
export
namespace MimeRendererFactory {
  /**
   * The options used to initialize a MimeRendererFactory.
   */
  export
  interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /**
     * The rendermime instance.
     */
    rendermime: IRenderMime;

    /**
     * The mime type.
     */
    mimeType: string;

    /**
     * The render timeout.
     */
    renderTimeout?: number;
  }
}
