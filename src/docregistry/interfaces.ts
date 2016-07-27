// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IContents, IKernel, ISession
} from 'jupyter-js-services';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';


/**
 * The interface for a document model.
 */
export
interface IDocumentModel extends IDisposable {
  /**
   * A signal emitted when the document content changes.
   */
  contentChanged: ISignal<IDocumentModel, void>;

  /**
   * A signal emitted when the model state changes.
   */
  stateChanged: ISignal<IDocumentModel, IChangedArgs<any>>;

  /**
   * The dirty state of the model.
   *
   * #### Notes
   * This should be cleared when the document is loaded from
   * or saved to disk.
   */
  dirty: boolean;

  /**
   * The read-only state of the model.
   */
  readOnly: boolean;

  /**
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  defaultKernelName: string;

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  defaultKernelLanguage: string;

  /**
   * Serialize the model to a string.
   */
  toString(): string;

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): any;

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: any): void;
}


/**
 * The document context object.
 */
export interface IDocumentContext<T extends IDocumentModel> extends IDisposable {
  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<IDocumentContext<T>, IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<IDocumentContext<T>, string>;

  /**
   * A signal emitted when the contentsModel changes.
   */
  contentsModelChanged: ISignal<IDocumentContext<T>, IContents.IModel>;

  /**
   * A signal emitted when the context is fully populated for the first time.
   */
  populated: ISignal<IDocumentContext<T>, void>;

  /**
   * The unique id of the context.
   *
   * #### Notes
   * This is a read-only property.
   */
  id: string;

  /**
   * Get the model associated with the document.
   *
   * #### Notes
   * This is a read-only property
   */
  model: T;

  /**
   * The current kernel associated with the document.
   *
   * #### Notes
   * This is a read-only propery.
   */
  kernel: IKernel;

  /**
   * The current path associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  path: string;

  /**
   * The current contents model associated with the document
   *
   * #### Notes
   * This is a read-only property.  The model will have an
   * empty `contents` field.  It will be `null` until the
   * first save or load to disk.
   */
  contentsModel: IContents.IModel;

  /**
   * Get the kernel spec information.
   *
   * #### Notes
   * This is a read-only property.
   */
  kernelspecs: IKernel.ISpecModels;

  /**
   * Test whether the context is fully populated.
   *
   * #### Notes
   * This is a read-only property.
   */
  isPopulated: boolean;

  /**
   * Change the current kernel associated with the document.
   *
   * #### Notes
   * If no options are given, the session is shut down.
   */
  changeKernel(options?: IKernel.IModel): Promise<IKernel>;

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void>;

  /**
   * Save the document to a different path chosen by the user.
   */
  saveAs(): Promise<void>;

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void>;

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISession.IModel[]>;

  /**
   * Resolve a url to a correct server path.
   */
  resolveUrl(url: string): string;

  /**
   * Add a sibling widget to the document manager.
   *
   * @param widget - The widget to add to the document manager.
   *
   * @returns A disposable used to remove the sibling if desired.
   *
   * #### Notes
   * It is assumed that the widget has the same model and context
   * as the original widget.
   */
  addSibling(widget: Widget): IDisposable;
}


/**
 * The options used to register a widget factory.
 */
export
interface IWidgetFactoryOptions {
  /**
   * The file extensions the widget can view.
   *
   * #### Notes
   * Use "*" to denote all files. Specific file extensions must be preceded
   * with '.', like '.png', '.txt', etc.
   */
  fileExtensions: string[];

  /**
   * The name of the widget to display in dialogs.
   */
  displayName: string;

  /**
   * The registered name of the model type used to create the widgets.
   */
  modelName: string;

  /**
   * The file extensions for which the factory should be the default.
   *
   * #### Notes
   * Use "*" to denote all files. Specific file extensions must be preceded
   * with '.', like '.png', '.txt', etc. Entries in this attribute must also
   * be included in the fileExtensions attribute.
   *
   * **See also:** [[fileExtensions]].
   */
  defaultFor?: string[];

  /**
   * Whether the widgets prefer having a kernel started.
   */
  preferKernel?: boolean;

  /**
   * Whether the widgets can start a kernel when opened.
   */
  canStartKernel?: boolean;
}


/**
 * The interface for a widget factory.
 */
export
interface IWidgetFactory<T extends Widget, U extends IDocumentModel> extends IDisposable {
  /**
   * A signal emitted when a widget is created.
   */
  widgetCreated: ISignal<IWidgetFactory<T, U>, T>;

  /**
   * Create a new widget.
   *
   * #### Notes
   * It should emit the [widgetCreated] signal with the new widget.
   */
  createNew(context: IDocumentContext<U>, kernel?: IKernel.IModel): T;
}


/**
 * An interface for a widget extension.
 */
export
interface IWidgetExtension<T extends Widget, U extends IDocumentModel> {
  /**
   * Create a new extension for a given widget.
   */
   createNew(widget: T, context: IDocumentContext<U>): IDisposable;
}


/**
 * The interface for a model factory.
 */
export
interface IModelFactory extends IDisposable {
  /**
   * The name of the model.
   *
   * #### Notes
   * This is a read-only property.
   */
  name: string;

  /**
   * The type of the file (defaults to `"file"`).
   *
   * #### Notes
   * This is a read-only property.
   */
  fileType: IContents.FileType;

  /**
   * The format of the file (default to `"text"`).
   *
   * This is a read-only property.
   */
  fileFormat: IContents.FileFormat;

  /**
   * Create a new model for a given path.
   *
   * @param languagePreference - An optional kernel language preference.
   *
   * @returns A new document model.
   */
  createNew(languagePreference?: string): IDocumentModel;

  /**
   * Get the preferred kernel language given an extension.
   */
  preferredLanguage(ext: string): string;
}


/**
 * A kernel preference for a given file path and widget.
 */
export
interface IKernelPreference {
  /**
   * The preferred kernel language.
   */
  language: string;

  /**
   * Whether to prefer having a kernel started when opening.
   */
  preferKernel: boolean;

  /**
   * Whether a kernel when can be started when opening.
   */
  canStartKernel: boolean;
}


/**
 * An interface for a file type.
 */
export
interface IFileType {
  /**
   * The name of the file type.
   */
  name: string;

  /**
   * The extension of the file type (e.g. `".txt"`).
   */
  extension: string;

  /**
   * The optional mimetype of the file type.
   */
  mimetype?: string;

  /**
   * The optional icon class to use for the file type.
   */
  icon?: string;

  /**
   * The type of the new file (defaults to `"file"`).
   */
  fileType?: IContents.FileType;

  /**
   * The format of the new file (default to `"text"`).
   */
  fileFormat?: IContents.FileFormat;
}


/**
 * An interface for a "Create New" item.
 */
export
interface IFileCreator {
  /**
   * The name of the file creator.
   */
  name: string;

  /**
   * The filetype name associated with the creator.
   */
  fileType: string;

  /**
   * The optional widget name.
   */
  widgetName?: string;

  /**
   * The optional kernel name.
   */
  kernelName?: string;
}
