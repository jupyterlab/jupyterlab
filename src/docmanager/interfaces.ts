// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelId, IContentsOpts, IKernel,
  IKernelSpecIds, ISessionId
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

  /**
   * Initialize the model state.
   */
  initialize(): void;
}


/**
 * The document context object.
 */
export interface IDocumentContext extends IDisposable {
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
  model: IDocumentModel;

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
   * empty `contents` field.
   */
  contentsModel: IContentsModel;

  /**
   * Get the kernel spec information.
   *
   * #### Notes
   * This is a read-only property.
   */
  kernelspecs: IKernelSpecIds;

  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<IDocumentContext, IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<IDocumentContext, string>;

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernelId): Promise<IKernel>;

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void>;

  /**
   * Save the document to a different path.
   */
  saveAs(path: string): Promise<void>;

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void>;

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISessionId[]>;

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
   * Use ".*" to denote all files.
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
   * Use ".*" to denote all files.
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
interface IWidgetFactory<T extends Widget> extends IDisposable {
  /**
   * Create a new widget.
   */
  createNew(model: IDocumentModel, context: IDocumentContext, kernel?: IKernelId): T;

  /**
   * Take an action on a widget before closing it.
   *
   * @returns A promise that resolves to true if the document should close
   *   and false otherwise.
   */
  beforeClose(model: IDocumentModel, context: IDocumentContext, widget: Widget): Promise<boolean>;
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
   * The contents options used to fetch/save files.
   *
   * #### Notes
   * This is a read-only property.
   */
  contentsOptions: IContentsOpts;

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
}


/**
 * An interface for a "Create New" item.
 */
export
interface IFileCreator {
  /**
   * The display name of the item.
   */
  name: string;

  /**
   * The contents options used to create the file.
   */
  options: IContentsOpts;

  /**
   * The optional widget name.
   */
  widgetName?: string;

  /**
   * The optional kernel name.
   */
  kernelName?: string;
}
