// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';

import {
  CodeEditor,
  CodeEditorData,
  ICodeEditorData
} from '@jupyterlab/codeeditor';

import { Mode } from '@jupyterlab/codemirror';

import { IChangedArgs, PathExt } from '@jupyterlab/coreutils';

import { createDatastore, DatastoreExt } from '@jupyterlab/datastore';

import { Contents } from '@jupyterlab/services';

import { JSONValue } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { Widget } from '@phosphor/widgets';

import { DocumentRegistry, IDocumentWidget } from './index';

/**
 * The default implementation of a text document model.
 */
export class TextDocumentModel extends CodeEditor.Model
  implements DocumentRegistry.ICodeModel {
  /**
   * Construct a new document model.
   */
  constructor(options: TextDocumentModel.IOptions = {}) {
    super({
      data: options.data || {
        datastore: CodeEditorData.createStore(),
        record: {
          schema: CodeEditorData.SCHEMA,
          record: 'data'
        }
      }
    });

    this._defaultLang = options.languagePreference || '';
    // We don't want to trigger a content change for text selection changes,
    // only actual content changes to the data owned by the document
    this._listener = DatastoreExt.listenField(
      this.data.datastore,
      { ...this.data.record, field: 'text' },
      this.triggerContentChange,
      this
    );
    this.ready = Promise.resolve(undefined);
  }

  /**
   * Whether the model is ready for collaboration.
   */
  readonly ready: Promise<void>;

  /**
   * Whether the model is collaborative.
   */
  readonly isCollaborative = true;

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<this, void> {
    return this._contentChanged;
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
    return this.value;
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    this.value = value;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONValue {
    return JSON.parse(this.value || 'null');
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: JSONValue): void {
    this.fromString(JSON.stringify(value));
  }

  /**
   * Dispose of resources held by the document model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this._listener) {
      this._listener.dispose();
    }
    super.dispose();
  }

  /**
   * Trigger a content changed signal.
   */
  protected triggerContentChange(): void {
    this._contentChanged.emit(void 0);
  }

  private _contentChanged = new Signal<this, void>(this);
  private _listener: IDisposable | null = null;
  private _defaultLang = '';
}

/**
 * A namespace for TextDocumentModel statics.
 */
export namespace TextDocumentModel {
  /**
   * Options for creating a new TextDocumentModel.
   */
  export interface IOptions {
    /**
     * A record in a datastore in which to hold the data.
     */
    data?: ICodeEditorData.DataLocation;

    /**
     * The preferred kernel language for the document.
     */
    languagePreference?: string;
  }
}

/**
 * An implementation of a string document model. Unlike the text document model,
 * it is not intended to be collaborative, so it has a lighter memory footprint.
 * It is intended to be used for large, static text data, such as CSVs.
 */
export class StringDocumentModel implements DocumentRegistry.IModel {
  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<this, void> {
    return this._contentChanged;
  }

  /**
   * Whether the model is collaborative.
   */
  readonly isCollaborative = false;

  /**
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  readonly defaultKernelName = '';

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  readonly defaultKernelLanguage = '';

  /**
   * Serialize the model to a string.
   */
  toString(): string {
    return this._value;
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    this._value = value;
    this._contentChanged.emit();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONValue {
    return JSON.parse(this._value || 'null');
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: JSONValue): void {
    this.fromString(JSON.stringify(value));
  }

  /**
   * Whether the model has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of resources held by the document model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._value = '';
  }

  private _contentChanged = new Signal<this, void>(this);
  private _isDisposed = false;
  private _value = '';
}

/**
 * An implementation of a model factory for text files.
 */
export class TextModelFactory implements DocumentRegistry.CodeModelFactory {
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
  async createNew(
    options: DocumentRegistry.IModelFactory.IOptions = {}
  ): Promise<DocumentRegistry.ICodeModel> {
    const { languagePreference, path } = options;
    if (path) {
      const datastore = await createDatastore(path, [CodeEditorData.SCHEMA]);
      const data = {
        datastore,
        record: {
          schema: CodeEditorData.SCHEMA,
          record: 'data'
        }
      };
      return new TextDocumentModel({ data, languagePreference });
    }
    return new TextDocumentModel({ languagePreference });
  }

  /**
   * Get the preferred kernel language given a file path.
   */
  preferredLanguage(path: string): string {
    let mode = Mode.findByFileName(path);
    return mode && mode.mode;
  }

  private _isDisposed = false;
}

/**
 * An implementation of a model factory for string documents.
 */
export class StringModelFactory
  implements DocumentRegistry.IModelFactory<StringDocumentModel> {
  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'string';
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
  async createNew(
    options: DocumentRegistry.IModelFactory.IOptions = {}
  ): Promise<StringDocumentModel> {
    return new StringDocumentModel();
  }

  /**
   * Get the preferred kernel language given the path.
   * Returns an empty string.
   */
  preferredLanguage(path: string): string {
    return '';
  }

  private _isDisposed = false;
}

/**
 * An implementation of a model factory for base64-encoded documents.
 */
export class Base64ModelFactory extends StringModelFactory {
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
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): Contents.FileFormat {
    return 'base64';
  }
}

/**
 * The default implementation of a widget factory.
 */
export abstract class ABCWidgetFactory<
  T extends IDocumentWidget,
  U extends DocumentRegistry.IModel = DocumentRegistry.IModel
> implements DocumentRegistry.IWidgetFactory<T, U> {
  /**
   * Construct a new `ABCWidgetFactory`.
   */
  constructor(options: DocumentRegistry.IWidgetFactoryOptions<T>) {
    this._name = options.name;
    this._readOnly = options.readOnly === undefined ? false : options.readOnly;
    this._defaultFor = options.defaultFor ? options.defaultFor.slice() : [];
    this._defaultRendered = (options.defaultRendered || []).slice();
    this._fileTypes = options.fileTypes.slice();
    this._modelName = options.modelName || 'text';
    this._preferKernel = !!options.preferKernel;
    this._canStartKernel = !!options.canStartKernel;
    this._shutdownOnClose = !!options.shutdownOnClose;
    this._toolbarFactory = options.toolbarFactory;
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
   * The file types the widget can view.
   */
  get fileTypes(): string[] {
    return this._fileTypes.slice();
  }

  /**
   * The registered name of the model type used to create the widgets.
   */
  get modelName(): string {
    return this._modelName;
  }

  /**
   * The file types for which the factory should be the default.
   */
  get defaultFor(): string[] {
    return this._defaultFor.slice();
  }

  /**
   * The file types for which the factory should be the default for
   * rendering a document model, if different from editing.
   */
  get defaultRendered(): string[] {
    return this._defaultRendered.slice();
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
   * Whether the kernel should be shutdown when the widget is closed.
   */
  get shutdownOnClose(): boolean {
    return this._shutdownOnClose;
  }
  set shutdownOnClose(value: boolean) {
    this._shutdownOnClose = value;
  }

  /**
   * Create a new widget given a document model and a context.
   *
   * #### Notes
   * It should emit the [widgetCreated] signal with the new widget.
   */
  createNew(context: DocumentRegistry.IContext<U>, source?: T): T {
    // Create the new widget
    const widget = this.createNewWidget(context, source);

    // Add toolbar items
    let items: DocumentRegistry.IToolbarItem[];
    if (this._toolbarFactory) {
      items = this._toolbarFactory(widget);
    } else {
      items = this.defaultToolbarFactory(widget);
    }
    items.forEach(({ name, widget: item }) => {
      widget.toolbar.addItem(name, item);
    });

    // Emit widget created signal
    this._widgetCreated.emit(widget);

    return widget;
  }

  /**
   * Create a widget for a context.
   */
  protected abstract createNewWidget(
    context: DocumentRegistry.IContext<U>,
    source?: T
  ): T;

  /**
   * Default factory for toolbar items to be added after the widget is created.
   */
  protected defaultToolbarFactory(widget: T): DocumentRegistry.IToolbarItem[] {
    return [];
  }

  private _toolbarFactory: (
    widget: T
  ) => DocumentRegistry.IToolbarItem[] | undefined;
  private _isDisposed = false;
  private _name: string;
  private _readOnly: boolean;
  private _canStartKernel: boolean;
  private _shutdownOnClose: boolean;
  private _preferKernel: boolean;
  private _modelName: string;
  private _fileTypes: string[];
  private _defaultFor: string[];
  private _defaultRendered: string[];
  private _widgetCreated = new Signal<DocumentRegistry.IWidgetFactory<T, U>, T>(
    this
  );
}

/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * A document widget implementation.
 */
export class DocumentWidget<
  T extends Widget = Widget,
  U extends DocumentRegistry.IModel = DocumentRegistry.IModel
> extends MainAreaWidget<T> implements IDocumentWidget<T, U> {
  constructor(options: DocumentWidget.IOptions<T, U>) {
    // Include the context ready promise in the widget reveal promise
    options.reveal = Promise.all([options.reveal, options.context.ready]);
    super(options);

    this.context = options.context;

    // Handle context path changes
    this.context.pathChanged.connect(this._onPathChanged, this);
    this._onPathChanged(this.context, this.context.path);

    // Listen for changes in the dirty state.
    this.context.stateChanged.connect(this._onContextStateChanged, this);
    void this.context.ready.then(() => {
      this._handleDirtyState();
    });
  }

  /**
   * Set URI fragment identifier.
   */
  setFragment(fragment: string): void {
    /* no-op */
  }

  /**
   * Handle a path change.
   */
  private _onPathChanged(
    sender: DocumentRegistry.IContext<U>,
    path: string
  ): void {
    this.title.label = PathExt.basename(sender.localPath);
  }

  /**
   * Handle a change to the context state.
   */
  private _onContextStateChanged(
    sender: DocumentRegistry.IContext<DocumentRegistry.IModel>,
    args: IChangedArgs<any>
  ): void {
    if (args.name === 'dirty') {
      this._handleDirtyState();
    }
  }

  /**
   * Handle the dirty state of the context model.
   */
  private _handleDirtyState(): void {
    if (this.context.dirty) {
      this.title.className += ` ${DIRTY_CLASS}`;
    } else {
      this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    }
  }

  readonly context: DocumentRegistry.IContext<U>;
}

export namespace DocumentWidget {
  export interface IOptions<
    T extends Widget = Widget,
    U extends DocumentRegistry.IModel = DocumentRegistry.IModel
  > extends MainAreaWidget.IOptions<T> {
    context: DocumentRegistry.IContext<U>;
  }

  export interface IOptionsOptionalContent<
    T extends Widget = Widget,
    U extends DocumentRegistry.IModel = DocumentRegistry.IModel
  > extends MainAreaWidget.IOptionsOptionalContent<T> {
    context: DocumentRegistry.IContext<U>;
  }
}
