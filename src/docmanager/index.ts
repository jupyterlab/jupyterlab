// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelId, IKernelSpecId, IContentsOpts, IKernel,
  INotebookSession
} from 'jupyter-js-services';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';


/**
 * The interface for a document model.
 */
export interface IDocumentModel {
  /**
   * Serialize the model.  It should return a JSON object or a string.
   */
  serialize(): any;

  /**
   * Deserialize the model from a string or a JSON object.
   */
  deserialize(value: any): void;

  /**
   * The default kernel name for the the document.
   */
  defaultKernelName: string;

  /**
   * The default kernel language for the document.
   */
  defaultKernelLanguage: string;
}


/**
 * A session info object for running sessions.
 */
export interface ISessionInfo {
  /**
   * The list of file paths associated with the running sessions.
   */
  paths: string[];

  /**
   * The list of kernel specs associated with the running sessions.
   */
  specs: IKernelSpecId[];
}


/**
 * The document context object.
 */
export interface IDocumentContext {
  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<IDocumentContext, IKernel>;

  /**
   * The current kernel associated with the document.
   */
  kernel: IKernel;

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernelId): Promise<IKernel>;

  /**
   * Save the the document contents to disk.
   */
  save(): Promise<void>;

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void>;

  /**
   * Get the list of running sessions.
   */
  listRunningSessions(): Promise<ISessionInfo>;

  /**
   * Add a sibling widget to the document manager.
   *
   * @param widget - The widget to add to the document manager.
   *
   * @returns A disposable used to remove the sibling if desired.
   */
  addSibling(widget: Widget): IDisposable;
}


/**
 * The interface for a widget factory.
 */
export
interface IWidgetFactory<T extends Widget> {
  /**
   * Create a new widget given a document model and a context.
   */
  createNew(model: IDocumentModel, context: IDocumentContext): T;

  /**
   * Get the default kernel name given a path and a list of specs.
   */
  getDefaultKernel(path: string, specs: IKernelSpecId[]): string;

  /**
   * Get the preferred kernel names given a path and a list of specs.
   */
  getPreferredKernels(path: string, specs: IKernelSpecId[]): string[];

  /**
   * Get the preferred widget title given a path.
   */
  getWidgetTitle(path: string): string;
}


/**
 * The options uses to register a widget factory.
 */
export
interface IWidgetFactoryOptions {
  /**
   * The type of file the widget can view.
   */
  fileType: string;

  /**
   * The name of the widget to display in dialogs.
   */
  displayedName: string;

  /**
   The object used to create new widgets.
   */
  widgetFactory: IWidgetFactory<Widget>;

  /**
   * The registered name of the model type used to create the widgets.
   */
  modelName: string;
}


/**
 * The interface for a model factory.
 */
export
interface IModelFactory {
  /**
   * Create a new model.
   */
   createNew(path: string, kernelSpecs: IKernelSpecId[]): IDocumentModel;
}


/**
 * The options used to register a model factory.
 */
export
interface IModelFactoryOptions {
  /**
   * The name of the model factory.
   */
  name: string;

  /**
   * The contents options used to fetch/save files.
   */
  contentsOptions: IContentsOpts;

  /**
   * The model factory used to create models.
   */
  factory: IModelFactory;
}


/**
 * The document manager.
 */
export
class DocumentManager {
  /**
   * A signal emitted when a file is opened.
   */
  get opened(): ISignal<DocumentManager, Widget> {
    return Private.openedSignal.bind(this);
  }

  /**
   * Register a widget factory with the document manager.
   *
   * @params options - The options used to register the factory.
   *
   * @returns A disposable used to unregister the factory.
   */
  registerWidgetFactory(options: IWidgetFactoryOptions): IDisposable {
    return void 0;
  }

  /**
   * Register the default widget factory of a given file type.
   *
   * @params options - The options used to register the factory.
   *
   * @returns A disposable used to unregister the factory.
   */
  registerDefaultWidgetFactory(options: IWidgetFactoryOptions): IDisposable {
    return void 0;
  }

  /**
   * Register a model factory.
   *
   * @param options - The options used to register the factory.
   *
   * @returns A disposable used to unregister the factory.
   */
  registerModelFactory(options: IModelFactoryOptions): IDisposable {
    return void 0;
  }

  /**
   * Open a file and return the widget used to display the contents.
   *
   * @param fileName - The path to the file to open.
   *
   * @param widgetName - The registered widget name to use to display the file.
   *
   * @param kernel - The desired kernel name or id to use.
   *
   * @returns The widget used to view the file.
   *
   * #### Notes
   * Emits an [opened] signal when the widget is populated.
   */
  open(fileName: string, widgetName='default', kernel?: IKernelId): Widget {
    // Find out from the widgetFactory what modelFactory to should use.
    // Looks up the contents options to use for the modelFactory.
    // Fetch the content.
    // Call the modelFactory with the content synchronously get a model.
    // The model exposes the default kernel/language.
    // Document manager creates a execution/contents context.
    // Call _createWidget and return container widget.
    return void 0;
  }

  /**
   * Open a file using a dialog to ask the user for options.
   *
   * @param fileName - The path to the file to open.
   *
   * @param kernel - The desired kernel name or id to use.
   *
   * @param host - The host node used to display the dialog.
   *
   * @returns The widget used to view the file.
   *
    * #### Notes
   * Emits an [opened] signal when the widget is populated.
   */
  openWith(fileName: string, kernel?: IKernelId, host=document.body): Promise<Widget> {
    // -------------------------------------------
    //   (readonly) Name: 2016-05-01-104521.ipynb

    //     Widget: Dropdown of registered widget factories for the file type
    //     Kernelspec: default (which means the widget or the server decides what to do with it). Also list running sessions.

    //                                   | OPEN |
    // --------------------------------------------

    // Call open(filename, widgetName, kernel)
    return void 0;
  }

  /**
   * Create a new file of the given type using the default options.
   *
   * @param fileType - The type of file to create.
   *
   * @returns A Promise that resolves with the created widget.
   *
   * #### Notes
  * Emits an [opened] signal when the widget is populated.
   */
  createNew(fileType: string): Promise<Widget> {
    return void 0;
  }

  /**
   * Create a new file with a dialog asking for options.
   *
   * @param host - The host node used to display the dialog.
   *
   * @returns A Promise that resolves with the created widget.
   *
   * #### Notes
   * Emits an [opened] signal when the widget is populated.
   */
  createNewAdvanced(host=document.body): Promise<Widget> {
    // Create dialog

    // -------------------------------------------
    //   Name: 2016-05-01-104521.ipynb
    //     | Python file | Text file | Jupyter Notebook | More v |

    //   Advanced v
    //     Widget: Dropdown of registered widget factories for the file type
    //     Kernelspec: default (which means the widget or the server decides what to do with it). Also list running sessions.

    //                                   | CREATE |
    // --------------------------------------------
    // GET rest api call to see if filename already exists. If filename conflict, then pop up a rename/overwrite dialog. We could also do this live as the user types the filename and show an error indicator or a list of matching filenames.
    // call modelFactory createNew static function (which is passed the kernel name and language). Get model back synchronously.
    // Save the blank model to disk (async).
    // Call _createWidget and return container widget
    return void 0;
  }

  /**
   * Update the path of an open document.
   *
   * @param oldPath - The previous path.
   *
   * @param newPath - The new path.
   */
  renameFile(oldPath: string, newPath: string): void {
    // update all sessions
    // updates all container widget titles by calling getWidgetTitle on the facotries.
  }

  /**
   * Handle a file deletion on the currently open widgets.
   *
   * @param path - The path of the file to delete.
   */
  deleteFile(path: string): void {
    // Look up kernel (if exists) and if this session is the only session using the kernel, ask user if they want to shut down the kernel.
    // dispose everything in the path->(model, session, context, [list,of,widgets]) mapping for the path (disposing a session should not shut down the kernel - needs change in notebook server)
  }

  /**
   * Close the widgets associated with a given path.
   */
  close(path: string): void {

  }

  /**
   * Close all of the open documents.
   */
  closeAll(): void {

  }

  private _createWidget(model: IDocumentModel, context: IDocumentContext): Widget {
    // Call widget with new model and a context and optional kernel to hook up to. Async returned widget is added to the container widget. The widget factory is responsible for starting a kernel if it wants one.
    // store path->(model, session, context, [list,of,widgets])
    // Hand back container widget synchronously
    return void 0;
  }

  private _data: { [key: string]: Private.IDocumentData } = Object.create(null);
}


/**
 * A private namespace for DocumentManager data.
 */
namespace Private {
  /**
   * A signal emitted when a file is opened.
   */
  export
  const openedSignal = new Signal<DocumentManager, Widget>();

  /**
   * Data associated with a document.
   */
  export
  interface IDocumentData {
    model: IDocumentModel;
    session: INotebookSession;
    context: IDocumentContext;
    widgets: Widget[];
  }

}
