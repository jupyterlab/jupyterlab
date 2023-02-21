// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Contents, ServerConnection } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { SidePanel } from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';
import { BreadCrumbs } from './crumbs';
import { DirListing } from './listing';
import { FilterFileBrowserModel } from './model';

/**
 * The class name added to file browsers.
 */
const FILE_BROWSER_CLASS = 'jp-FileBrowser';

/**
 * The class name added to file browser panel (gather filter, breadcrumbs and listing).
 */
const FILE_BROWSER_PANEL_CLASS = 'jp-FileBrowser-Panel';

/**
 * The class name added to the filebrowser crumbs node.
 */
const CRUMBS_CLASS = 'jp-FileBrowser-crumbs';

/**
 * The class name added to the filebrowser toolbar node.
 */
const TOOLBAR_CLASS = 'jp-FileBrowser-toolbar';

/**
 * The class name added to the filebrowser listing node.
 */
const LISTING_CLASS = 'jp-FileBrowser-listing';

/**
 * A widget which hosts a file browser.
 *
 * The widget uses the Jupyter Contents API to retrieve contents,
 * and presents itself as a flat list of files and directories with
 * breadcrumbs.
 */
export class FileBrowser extends SidePanel {
  /**
   * Construct a new file browser.
   *
   * @param options - The file browser options.
   */
  constructor(options: FileBrowser.IOptions) {
    super({ content: new Panel(), translator: options.translator });
    this.addClass(FILE_BROWSER_CLASS);
    this.toolbar.addClass(TOOLBAR_CLASS);
    this.id = options.id;
    const translator = (this.translator = options.translator ?? nullTranslator);

    const model = (this.model = options.model);
    const renderer = options.renderer;

    model.connectionFailure.connect(this._onConnectionFailure, this);
    this._manager = model.manager;

    // a11y
    this.toolbar.node.setAttribute('role', 'navigation');
    this.toolbar.node.setAttribute(
      'aria-label',
      this._trans.__('file browser')
    );

    this._directoryPending = false;

    // File browser widgets container
    this.mainPanel = new Panel();
    this.mainPanel.addClass(FILE_BROWSER_PANEL_CLASS);
    this.mainPanel.title.label = this._trans.__('File Browser');

    this.crumbs = new BreadCrumbs({ model, translator });
    this.crumbs.addClass(CRUMBS_CLASS);

    this.listing = this.createDirListing({
      model,
      renderer,
      translator
    });
    this.listing.addClass(LISTING_CLASS);

    this.mainPanel.addWidget(this.crumbs);
    this.mainPanel.addWidget(this.listing);

    this.addWidget(this.mainPanel);

    if (options.restore !== false) {
      void model.restore(this.id);
    }
  }

  /**
   * The model used by the file browser.
   */
  readonly model: FilterFileBrowserModel;

  /**
   * Whether to show active file in file browser
   */
  get navigateToCurrentDirectory(): boolean {
    return this._navigateToCurrentDirectory;
  }

  set navigateToCurrentDirectory(value: boolean) {
    this._navigateToCurrentDirectory = value;
  }

  /**
   * Whether to show the last modified column
   */
  get showLastModifiedColumn(): boolean {
    return this._showLastModifiedColumn;
  }

  set showLastModifiedColumn(value: boolean) {
    if (this.listing.setColumnVisibility) {
      this.listing.setColumnVisibility('last_modified', value);
      this._showLastModifiedColumn = value;
    } else {
      console.warn('Listing does not support toggling column visibility');
    }
  }

  /**
   * Whether to show the file size column
   */
  get showFileSizeColumn(): boolean {
    return this._showFileSizeColumn;
  }

  set showFileSizeColumn(value: boolean) {
    if (this.listing.setColumnVisibility) {
      this.listing.setColumnVisibility('file_size', value);
      this._showFileSizeColumn = value;
    } else {
      console.warn('Listing does not support toggling column visibility');
    }
  }

  /**
   * Whether to show hidden files
   */
  get showHiddenFiles(): boolean {
    return this._showHiddenFiles;
  }

  set showHiddenFiles(value: boolean) {
    this.model.showHiddenFiles(value);
    this._showHiddenFiles = value;
  }

  /**
   * Whether to show checkboxes next to files and folders
   */
  get showFileCheckboxes(): boolean {
    return this._showFileCheckboxes;
  }

  set showFileCheckboxes(value: boolean) {
    if (this.listing.setColumnVisibility) {
      this.listing.setColumnVisibility('is_selected', value);
      this._showFileCheckboxes = value;
    } else {
      console.warn('Listing does not support toggling column visibility');
    }
  }

  /**
   * Create an iterator over the listing's selected items.
   *
   * @returns A new iterator over the listing's selected items.
   */
  selectedItems(): IterableIterator<Contents.IModel> {
    return this.listing.selectedItems();
  }

  /**
   * Select an item by name.
   *
   * @param name - The name of the item to select.
   */
  async selectItemByName(name: string): Promise<void> {
    await this.listing.selectItemByName(name);
  }

  clearSelectedItems(): void {
    this.listing.clearSelectedItems();
  }

  /**
   * Rename the first currently selected item.
   *
   * @returns A promise that resolves with the new name of the item.
   */
  rename(): Promise<string> {
    return this.listing.rename();
  }

  /**
   * Cut the selected items.
   */
  cut(): void {
    this.listing.cut();
  }

  /**
   * Copy the selected items.
   */
  copy(): void {
    this.listing.copy();
  }

  /**
   * Paste the items from the clipboard.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  paste(): Promise<void> {
    return this.listing.paste();
  }

  /**
   * Create a new directory
   */
  createNewDirectory(): void {
    if (this._directoryPending === true) {
      return;
    }
    this._directoryPending = true;
    // TODO: We should provide a hook into when the
    // directory is done being created. This probably
    // means storing a pendingDirectory promise and
    // returning that if there is already a directory
    // request.
    void this._manager
      .newUntitled({
        path: this.model.path,
        type: 'directory'
      })
      .then(async model => {
        await this.listing.selectItemByName(model.name);
        await this.rename();
        this._directoryPending = false;
      })
      .catch(err => {
        void showErrorMessage(this._trans.__('Error'), err);
        this._directoryPending = false;
      });
  }

  /**
   * Create a new file
   */
  createNewFile(options: FileBrowser.IFileOptions): void {
    if (this._filePending === true) {
      return;
    }
    this._filePending = true;
    // TODO: We should provide a hook into when the
    // file is done being created. This probably
    // means storing a pendingFile promise and
    // returning that if there is already a file
    // request.
    void this._manager
      .newUntitled({
        path: this.model.path,
        type: 'file',
        ext: options.ext
      })
      .then(async model => {
        await this.listing.selectItemByName(model.name);
        await this.rename();
        this._filePending = false;
      })
      .catch(err => {
        void showErrorMessage(this._trans.__('Error'), err);
        this._filePending = false;
      });
  }

  /**
   * Delete the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  delete(): Promise<void> {
    return this.listing.delete();
  }

  /**
   * Duplicate the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  duplicate(): Promise<void> {
    return this.listing.duplicate();
  }

  /**
   * Download the currently selected item(s).
   */
  download(): Promise<void> {
    return this.listing.download();
  }

  /**
   * Shut down kernels on the applicable currently selected items.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  shutdownKernels(): Promise<void> {
    return this.listing.shutdownKernels();
  }

  /**
   * Select next item.
   */
  selectNext(): void {
    this.listing.selectNext();
  }

  /**
   * Select previous item.
   */
  selectPrevious(): void {
    this.listing.selectPrevious();
  }

  /**
   * Find a model given a click.
   *
   * @param event - The mouse event.
   *
   * @returns The model for the selected file.
   */
  modelForClick(event: MouseEvent): Contents.IModel | undefined {
    return this.listing.modelForClick(event);
  }

  /**
   * Create the underlying DirListing instance.
   *
   * @param options - The DirListing constructor options.
   *
   * @returns The created DirListing instance.
   */
  protected createDirListing(options: DirListing.IOptions): DirListing {
    return new DirListing(options);
  }

  protected translator: ITranslator;

  /**
   * Handle a connection lost signal from the model.
   */
  private _onConnectionFailure(
    sender: FilterFileBrowserModel,
    args: Error
  ): void {
    if (
      args instanceof ServerConnection.ResponseError &&
      args.response.status === 404
    ) {
      const title = this._trans.__('Directory not found');
      args.message = this._trans.__(
        'Directory not found: "%1"',
        this.model.path
      );
      void showErrorMessage(title, args);
    }
  }

  protected listing: DirListing;
  protected crumbs: BreadCrumbs;
  protected mainPanel: Panel;

  private _manager: IDocumentManager;
  private _directoryPending: boolean;
  private _filePending: boolean;
  private _navigateToCurrentDirectory: boolean;
  private _showLastModifiedColumn: boolean = true;
  private _showFileSizeColumn: boolean = false;
  private _showHiddenFiles: boolean = false;
  private _showFileCheckboxes: boolean = false;
}

/**
 * The namespace for the `FileBrowser` class statics.
 */
export namespace FileBrowser {
  /**
   * An options object for initializing a file browser widget.
   */
  export interface IOptions {
    /**
     * The widget/DOM id of the file browser.
     */
    id: string;

    /**
     * A file browser model instance.
     */
    model: FilterFileBrowserModel;

    /**
     * An optional renderer for the directory listing area.
     *
     * The default is a shared instance of `DirListing.Renderer`.
     */
    renderer?: DirListing.IRenderer;

    /**
     * Whether a file browser automatically restores state when instantiated.
     * The default is `true`.
     *
     * #### Notes
     * The file browser model will need to be restored manually for the file
     * browser to be able to save its state.
     */
    restore?: boolean;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * An options object for creating a file.
   */
  export interface IFileOptions {
    /**
     * The file extension.
     */
    ext: string;
  }
}
