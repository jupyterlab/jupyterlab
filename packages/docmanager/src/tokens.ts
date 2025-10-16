// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext } from '@jupyterlab/apputils';
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
 * The document manager dialogs token.
 */
export const IDocumentManagerDialogs = new Token<IDocumentManagerDialogs>(
  '@jupyterlab/docmanager:IDocumentManagerDialogs',
  'A service for displaying dialogs related to document management.'
);

/**
 * Namespace for dialog-related interfaces (argument/result) used by IDocumentManagerDialogs.
 */
export namespace IDocumentManagerDialogs {
  /**
   * Options and result types for the {@link IDocumentManagerDialogs.confirmClose} dialog.
   */
  export namespace ConfirmClose {
    /**
     * Options for {@link IDocumentManagerDialogs.confirmClose} dialog.
     *
     * @property fileName - The name of the file to be closed.
     * @property isDirty - Whether the file has unsaved changes.
     */
    export interface IOptions {
      fileName: string;
      isDirty: boolean;
    }

    /**
     * Result of {@link IDocumentManagerDialogs.confirmClose} dialog.
     *
     * @property shouldClose - Indicates whether the document should be closed.
     * @property ignoreSave - If true, the document will be closed without saving changes.
     * @property doNotAskAgain - If true, the confirmation dialog should not be shown again for this document.
     */
    export interface IResult {
      shouldClose: boolean;
      ignoreSave: boolean;
      doNotAskAgain: boolean;
    }
  }

  /**
   * Options and result types for the {@link IDocumentManagerDialogs.saveBeforeClose} dialog.
   */
  export namespace SaveBeforeClose {
    /**
     * Options for {@link IDocumentManagerDialogs.saveBeforeClose} dialog.
     *
     * @property fileName - The name of the file to be saved.
     * @property writable - Whether the file is writable. If not specified, defaults to false
     */
    export interface IOptions {
      fileName: string;
      writable?: boolean;
    }

    /**
     * Result of {@link IDocumentManagerDialogs.saveBeforeClose} dialog.
     *
     * @property shouldClose - Indicates whether the document should be closed after the operation.
     * @property ignoreSave - Indicates whether the save operation should be ignored (i.e., close without saving).
     */
    export interface IResult {
      shouldClose: boolean;
      ignoreSave: boolean;
    }
  }

  /**
   * Options and result types for reload confirmation dialogs.
   */
  export namespace Reload {
    export interface IOptions {
      type: string;
    }
    export interface IResult {
      shouldReload: boolean;
    }
  }

  /**
   * Options and result types for delete confirmation dialogs.
   */
  export namespace Delete {
    export interface IOptions {
      path: string;
    }
    export interface IResult {
      shouldDelete: boolean;
    }
  }

  /**
   * Options and result types for choosing a checkpoint.
   */
  export namespace ChooseCheckpoint {
    export interface IOptions {
      checkpoints: Contents.ICheckpointModel[];
      fileType: string;
    }
    export interface IResult {
      checkpoint?: Contents.ICheckpointModel;
    }
  }

  /**
   * Options and result types for the revert confirmation dialog.
   */
  export namespace Revert {
    export interface IOptions {
      checkpoint: Contents.ICheckpointModel;
      fileType: string;
    }
    export interface IResult {
      shouldRevert: boolean;
    }
  }

  /**
   * Options and result types for prompting a rename on first save.
   */
  export namespace RenameOnSave {
    /**
     * Minimal options for prompting rename on first save.
     */
    export interface IOptions {
      /**
       * The current file name to pre-fill the input with.
       */
      name: string;
    }

    /**
     * Result of the rename prompt.
     */
    export interface IResult {
      /**
       * Whether user decided to rename.
       */
      accepted: boolean;
      /**
       * The new name if accepted.
       */
      newName?: string;
      /**
       * Whether the user checked the "do not ask again" box.
       */
      doNotAskAgain?: boolean;
    }
  }
}

/**
 * Dialog interfaces for document management.
 */
export interface IDocumentManagerDialogs {
  /**
   * Show a dialog to rename a file.
   *
   * @param context - The document context
   * @returns A promise that resolves when rename is complete or null if cancelled
   */
  rename(context: DocumentRegistry.Context): Promise<void | null>;

  /**
   * Show a dialog asking whether to close a document.
   *
   * This dialog is shown when closing a clean (non-dirty) document
   * and confirmClosingDocument is true.
   *
   * @param options - Options for the dialog
   * @returns A promise that resolves to a result object
   */
  confirmClose(
    options: IDocumentManagerDialogs.ConfirmClose.IOptions
  ): Promise<IDocumentManagerDialogs.ConfirmClose.IResult>;

  /**
   * Show a dialog asking whether to save before closing a dirty document.
   *
   * @param options - Options for the dialog
   * @returns A promise that resolves to a result object
   */
  saveBeforeClose(
    options: IDocumentManagerDialogs.SaveBeforeClose.IOptions
  ): Promise<IDocumentManagerDialogs.SaveBeforeClose.IResult>;

  /**
   * Dialog to confirm reload from disk.
   *
   * @param options - Options for the dialog
   * @returns A promise that resolves to a result object
   */
  reload(
    options: IDocumentManagerDialogs.Reload.IOptions
  ): Promise<IDocumentManagerDialogs.Reload.IResult>;

  /**
   * Dialog to confirm deletion of a file.
   *
   * @param options - Options for the dialog
   * @returns A promise that resolves to a result object
   */
  delete(
    options: IDocumentManagerDialogs.Delete.IOptions
  ): Promise<IDocumentManagerDialogs.Delete.IResult>;

  /**
   * Dialog to choose a checkpoint to revert to.
   *
   * This dialog only chooses which checkpoint to use; the actual revert
   * confirmation and restore operation is handled separately by the caller.
   *
   * @param options - Options for the dialog
   * @returns A promise that resolves to a result object
   */
  chooseCheckpoint(
    options: IDocumentManagerDialogs.ChooseCheckpoint.IOptions
  ): Promise<IDocumentManagerDialogs.ChooseCheckpoint.IResult>;

  /**
   * Prompt to rename on first save.
   *
   * @param options - Options for the dialog
   * @returns A promise that resolves to a result object
   */
  renameOnSave(
    options: IDocumentManagerDialogs.RenameOnSave.IOptions
  ): Promise<IDocumentManagerDialogs.RenameOnSave.IResult>;
  /**
   * Show a revert confirmation dialog for a chosen checkpoint.
   *
   * @param options - Options for the dialog
   * @returns A promise resolving to whether the user confirmed the revert.
   */
  revert(
    options: IDocumentManagerDialogs.Revert.IOptions
  ): Promise<IDocumentManagerDialogs.Revert.IResult>;
}

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
    options?: DocumentRegistry.IOpenOptions,
    kernelPreference?: ISessionContext.IKernelPreference
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
