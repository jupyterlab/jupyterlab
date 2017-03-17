// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from '@jupyterlab/services';

import {
  each
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  FileButtons
} from './buttons';

import {
  BreadCrumbs
} from './crumbs';

import {
  DirListing
} from './listing';

import {
  FileBrowserModel
} from './model';

import {
  FILE_BROWSER_CLASS, showErrorMessage
} from './utils';

/**
 * The class name added to the filebrowser crumbs node.
 */
const CRUMBS_CLASS = 'jp-FileBrowser-crumbs';

/**
 * The class name added to the filebrowser buttons node.
 */
const BUTTON_CLASS = 'jp-FileBrowser-buttons';

/**
 * The class name added to the filebrowser listing node.
 */
const LISTING_CLASS = 'jp-FileBrowser-listing';


/**
 * A widget which hosts a file browser.
 *
 * The widget uses the Jupyter Contents API to retreive contents,
 * and presents itself as a flat list of files and directories with
 * breadcrumbs.
 */
export
class FileBrowser extends Widget {
  /**
   * Construct a new file browser.
   *
   * @param model - The file browser view model.
   */
  constructor(options: FileBrowser.IOptions) {
    super();
    this.addClass(FILE_BROWSER_CLASS);
    let commands = this._commands = options.commands;
    let manager = this._manager = options.manager;
    let model = this._model = options.model;
    let renderer = options.renderer;

    model.connectionFailure.connect(this._onConnectionFailure, this);
    this._crumbs = new BreadCrumbs({ model });
    this._buttons = new FileButtons({
      commands, manager, model
    });
    this._listing = new DirListing({ manager, model, renderer });

    this._crumbs.addClass(CRUMBS_CLASS);
    this._buttons.addClass(BUTTON_CLASS);
    this._listing.addClass(LISTING_CLASS);

    let layout = new PanelLayout();
    layout.addWidget(this._buttons);
    layout.addWidget(this._crumbs);
    layout.addWidget(this._listing);

    this.layout = layout;
  }

  /**
   * Get the command registry used by the file browser.
   */
  get commands(): CommandRegistry {
    return this._commands;
  }

  /**
   * Get the model used by the file browser.
   */
  get model(): FileBrowserModel {
    return this._model;
  }


  /**
   * Dispose of the resources held by the file browser.
   */
  dispose() {
    this._model = null;
    this._crumbs = null;
    this._buttons = null;
    this._listing = null;
    this._manager = null;
    super.dispose();
  }

  /**
   * Open the currently selected item(s).
   *
   * Changes to the first directory encountered.
   */
  open(): void {
    let foundDir = false;
    each(this._model.items(), item => {
      if (!this._listing.isSelected(item.name)) {
        return;
      }
      if (item.type === 'directory') {
        if (!foundDir) {
          foundDir = true;
          this._model.cd(item.name);
        }
      } else {
        this.openPath(item.path);
      }
    });
  }

  /**
   * Open a file by path.
   *
   * @param path - The path to of the file to open.
   *
   * @param widgetName - The name of the widget factory to use.
   *
   * @returns The widget for the file.
   */
  openPath(path: string, widgetName='default'): Widget {
    return this._buttons.open(path, widgetName);
  }

  /**
   * Create a file from a creator.
   *
   * @param creatorName - The name of the widget creator.
   *
   * @returns A promise that resolves with the created widget.
   */
  createFrom(creatorName: string): Promise<Widget> {
    return this._buttons.createFrom(creatorName);
  }

  /**
   * Create a new untitled file in the current directory.
   *
   * @param options - The options used to create the file.
   *
   * @returns A promise that resolves with the created widget.
   */
  createNew(options: Contents.ICreateOptions): Promise<Widget> {
    let model = this.model;
    return model.newUntitled(options).then(contents => {
      if (!this.isDisposed) {
        return this._buttons.createNew(contents.path);
      }
    });
  }

  /**
   * Rename the first currently selected item.
   *
   * @returns A promise that resolves with the new name of the item.
   */
  rename(): Promise<string> {
    return this._listing.rename();
  }

  /**
   * Cut the selected items.
   */
  cut(): void {
    this._listing.cut();
  }

  /**
   * Copy the selected items.
   */
  copy(): void {
    this._listing.copy();
  }

  /**
   * Paste the items from the clipboard.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  paste(): Promise<void> {
    return this._listing.paste();
  }

  /**
   * Delete the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  delete(): Promise<void> {
    return this._listing.delete();
  }

  /**
   * Duplicate the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  duplicate(): Promise<void> {
    return this._listing.duplicate();
  }

  /**
   * Download the currently selected item(s).
   */
  download(): void {
    this._listing.download();
  }

  /**
   * Shut down kernels on the applicable currently selected items.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  shutdownKernels(): Promise<void> {
    return this._listing.shutdownKernels();
  }

  /**
   * Select next item.
   */
  selectNext(): void {
    this._listing.selectNext();
  }

  /**
   * Select previous item.
   */
  selectPrevious(): void {
    this._listing.selectPrevious();
  }

  /**
   * Find a path given a click.
   *
   * @param event - The mouse event.
   *
   * @returns The path to the selected file.
   */
  pathForClick(event: MouseEvent): string {
    return this._listing.pathForClick(event);
  }

  /**
   * Handle a connection lost signal from the model.
   */
  private _onConnectionFailure(sender: FileBrowserModel, args: Error): void {
    if (this._showingError) {
      return;
    }
    this._showingError = true;
    showErrorMessage('Server Connection Error', args).then(() => {
      this._showingError = false;
    });
  }

  private _buttons: FileButtons = null;
  private _commands: CommandRegistry = null;
  private _crumbs: BreadCrumbs = null;
  private _listing: DirListing = null;
  private _manager: DocumentManager = null;
  private _model: FileBrowserModel = null;
  private _showingError = false;
}


/**
 * The namespace for the `FileBrowser` class statics.
 */
export
namespace FileBrowser {
  /**
   * An options object for initializing a file browser widget.
   */
  export
  interface IOptions {
    /**
     * The command registry for use with the file browser.
     */
    commands: CommandRegistry;

    /**
     * A file browser model instance.
     */
    model: FileBrowserModel;

    /**
     * A document manager instance.
     */
    manager: DocumentManager;

    /**
     * An optional renderer for the directory listing area.
     *
     * The default is a shared instance of `DirListing.Renderer`.
     */
    renderer?: DirListing.IRenderer;
  }
}
