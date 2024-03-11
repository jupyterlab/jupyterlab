// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IChangedArgs } from '@jupyterlab/coreutils';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { Contents, Kernel, ServiceManager } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

/**
 * The document registry token.
 */
export const IDocumentManager = new Token<IDocumentManager>(
  '@jupyterlab/docmanager:IDocumentManager',
  `A service for the manager for all
  documents used by the application. Use this if you want to open and close documents,
  create and delete files, and otherwise interact with the file system.`
);

/**
 * The document widget opener token.
 */
export const IDocumentWidgetOpener = new Token<IDocumentWidgetOpener>(
  '@jupyterlab/docmanager:IDocumentWidgetOpener',
  `A service to open a widget.`
);

/**
 * The recent documents database token.
 */
export const IRecentsManager = new Token<IRecentsManager>(
  '@jupyterlab/docmanager:IRecentsManager',
  `A service providing information about recently opened and closed documents`
);

/**
 * The interface for a document manager.
 */
export interface IDocumentManager extends IDisposable {
  /**
   * The registry used by the manager.
   */
  readonly registry: DocumentRegistry;

  /**
   * The service manager used by the manager.
   */
  readonly services: ServiceManager.IManager;

  /**
   * A signal emitted when one of the documents is activated.
   */
  readonly activateRequested: ISignal<this, string>;

  /**
   * Whether to autosave documents.
   */
  autosave: boolean;

  /**
   * Whether to ask confirmation to close a tab or not.
   */
  confirmClosingDocument: boolean;

  /**
   * Determines the time interval for autosave in seconds.
   */
  autosaveInterval: number;

  /**
   * Defines max acceptable difference, in milliseconds, between last modified timestamps on disk and client.
   */
  lastModifiedCheckMargin: number;

  /**
   * Whether to ask the user to rename untitled file on first manual save.
   */
  renameUntitledFileOnSave: boolean;

  /**
   * Signal triggered when an attribute changes.
   */
  readonly stateChanged: ISignal<IDocumentManager, IChangedArgs<any>>;

  /**
   * Clone a widget.
   *
   * @param widget - The source widget.
   *
   * @returns A new widget or `undefined`.
   *
   * #### Notes
   *  Uses the same widget factory and context as the source, or returns
   *  `undefined` if the source widget is not managed by this manager.
   */
  cloneWidget(widget: Widget): IDocumentWidget | undefined;

  /**
   * Close all of the open documents.
   *
   * @returns A promise resolving when the widgets are closed.
   */
  closeAll(): Promise<void>;

  /**
   * Close the widgets associated with a given path.
   *
   * @param path - The target path.
   *
   * @returns A promise resolving when the widgets are closed.
   */
  closeFile(path: string): Promise<void>;

  /**
   * Get the document context for a widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The context associated with the widget, or `undefined` if no such
   * context exists.
   */
  contextForWidget(widget: Widget): DocumentRegistry.Context | undefined;

  /**
   * Copy a file.
   *
   * @param fromFile - The full path of the original file.
   *
   * @param toDir - The full path to the target directory.
   *
   * @returns A promise which resolves to the contents of the file.
   */
  copy(fromFile: string, toDir: string): Promise<Contents.IModel>;

  /**
   * Create a new file and return the widget used to view it.
   *
   * @param path - The file path to create.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  createNew(
    path: string,
    widgetName?: string,
    kernel?: Partial<Kernel.IModel>
  ): Widget | undefined;

  /**
   * Delete a file.
   *
   * @param path - The full path to the file to be deleted.
   *
   * @returns A promise which resolves when the file is deleted.
   *
   * #### Notes
   * If there is a running session associated with the file and no other
   * sessions are using the kernel, the session will be shut down.
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Duplicate a file.
   *
   * @param path - The full path to the file to be duplicated.
   *
   * @returns A promise which resolves when the file is duplicated.
   *
   */
  duplicate(path: string): Promise<Contents.IModel>;

  /**
   * See if a widget already exists for the given path and widget name.
   *
   * @param path - The file path to use.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @returns The found widget, or `undefined`.
   *
   * #### Notes
   * This can be used to find an existing widget instead of opening
   * a new widget.
   */
  findWidget(
    path: string,
    widgetName?: string | null
  ): IDocumentWidget | undefined;

  /**
   * Create a new untitled file.
   *
   * @param options - The file content creation options.
   */
  newUntitled(options: Contents.ICreateOptions): Promise<Contents.IModel>;

  /**
   * Open a file and return the widget used to view it.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  open(
    path: string,
    widgetName?: string,
    kernel?: Partial<Kernel.IModel>,
    options?: DocumentRegistry.IOpenOptions
  ): IDocumentWidget | undefined;

  /**
   * Open a file and return the widget used to view it.
   * Reveals an already existing editor.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  openOrReveal(
    path: string,
    widgetName?: string,
    kernel?: Partial<Kernel.IModel>,
    options?: DocumentRegistry.IOpenOptions
  ): IDocumentWidget | undefined;

  /**
   * Overwrite a file.
   *
   * @param oldPath - The full path to the original file.
   *
   * @param newPath - The full path to the new file.
   *
   * @returns A promise containing the new file contents model.
   */
  overwrite(oldPath: string, newPath: string): Promise<Contents.IModel>;

  /**
   * Rename a file or directory.
   *
   * @param oldPath - The full path to the original file.
   *
   * @param newPath - The full path to the new file.
   *
   * @returns A promise containing the new file contents model.  The promise
   * will reject if the newPath already exists.  Use [[overwrite]] to overwrite
   * a file.
   */
  rename(oldPath: string, newPath: string): Promise<Contents.IModel>;
}

/**
 * The interface for a widget opener.
 */
export interface IDocumentWidgetOpener {
  /**
   * Open the given widget.
   */
  open(widget: IDocumentWidget, options?: DocumentRegistry.IOpenOptions): void;

  /**
   * A signal emitted when a widget is opened
   */
  readonly opened: ISignal<IDocumentWidgetOpener, IDocumentWidget>;
}

/**
 * Recent opened items manager.
 */
export interface IRecentsManager extends IDisposable {
  /**
   * Get the recently opened documents.
   */
  readonly recentlyOpened: RecentDocument[];

  /**
   * Get the recently closed items.
   */
  readonly recentlyClosed: RecentDocument[];

  /**
   * Signal emitted when either of the list changes.
   */
  readonly changed: ISignal<IRecentsManager, void>;

  /**
   * Check if the recent item is valid, remove if it from both lists if it is not.
   */
  validate(recent: RecentDocument): Promise<boolean>;

  /**
   * Add a new path to the recent list.
   */
  addRecent(
    document: Omit<RecentDocument, 'root'>,
    event: 'opened' | 'closed'
  ): void;

  /**
   * Remove the document from recents list.
   */
  removeRecent(document: RecentDocument, event: 'opened' | 'closed'): void;
}

/**
 * The interface for a recent document.
 */
export type RecentDocument = {
  /**
   * The server root path.
   *
   * Allows to select only the currently accessible documents.
   */
  root: string;
  /**
   * The path to the document.
   */
  path: string;
  /**
   * The document content type or `directory` literal for directories.
   */
  contentType: string;
  /**
   * The factory that was used when the document was most recently opened or closed.
   */
  factory?: string;
};
