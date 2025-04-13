// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Contents, ServerConnection } from '@jupyterlab/services';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  FilenameSearcher,
  IScore,
  SidePanel,
  Toolbar
} from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';
import { createRef } from 'react';
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
 * The class name added to the filebrowser filter toolbar node.
 */
const FILTER_TOOLBAR_CLASS = 'jp-FileBrowser-filterToolbar';

/**
 * The class name added to the filebrowser listing node.
 */
const LISTING_CLASS = 'jp-FileBrowser-listing';

/**
 * The class name added to the filebrowser filterbox node.
 */
const FILTERBOX_CLASS = 'jp-FileBrowser-filterBox';

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

    this.toolbar.node.setAttribute(
      'aria-label',
      this._trans.__('file browser')
    );

    // File browser widgets container
    this.mainPanel = new Panel();
    this.mainPanel.addClass(FILE_BROWSER_PANEL_CLASS);
    this.mainPanel.title.label = this._trans.__('File Browser');

    this.crumbs = new BreadCrumbs({ model, translator });
    this.crumbs.addClass(CRUMBS_CLASS);

    // The filter toolbar appears immediately below the breadcrumbs and above the directory listing.
    const searcher = FilenameSearcher({
      updateFilter: (
        filterFn: (item: string) => Partial<IScore> | null,
        query?: string
      ) => {
        this.model.setFilter(value => {
          return filterFn(value.name.toLowerCase());
        });
      },
      useFuzzyFilter: this.model.useFuzzyFilter,
      placeholder: this._trans.__('Filter files by name'),
      forceRefresh: false,
      showIcon: false,
      inputRef: this._fileFilterRef,
      filterSettingsChanged: this.model.filterSettingsChanged
    });
    searcher.addClass(FILTERBOX_CLASS);

    this.filterToolbar = new Toolbar();
    this.filterToolbar.addClass(FILTER_TOOLBAR_CLASS);
    this.filterToolbar.node.setAttribute(
      'aria-label',
      this._trans.__('File browser toolbar')
    );
    this.filterToolbar.addItem('fileNameSearcher', searcher);
    this.filterToolbar.setHidden(!this.showFileFilter);

    this.listing = this.createDirListing({
      model,
      renderer,
      translator,
      state: options.state
    });
    this.listing.addClass(LISTING_CLASS);

    this.mainPanel.addWidget(this.crumbs);
    this.mainPanel.addWidget(this.filterToolbar);
    this.mainPanel.addWidget(this.listing);

    this.addWidget(this.mainPanel);

    if (options.restore !== false) {
      void model.restore(this.id);
    }
    // restore listing regardless of the restore option
    void this.listing.restore(this.id);
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
   * Whether to show the full path in the breadcrumbs
   */
  get showFullPath(): boolean {
    return this.crumbs.fullPath;
  }

  set showFullPath(value: boolean) {
    this.crumbs.fullPath = value;
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
   * Whether to show a text box to filter files by name.
   */
  get showFileFilter(): boolean {
    return this._showFileFilter;
  }

  set showFileFilter(value: boolean) {
    // If the old value was true and the new value is false, clear the filter
    const oldValue = this.showFileFilter;
    if (oldValue && !value) {
      // Clear the search box input
      if (this._fileFilterRef.current) {
        this._fileFilterRef.current.value = '';
      }

      // Set a filter that doesn't exclude anything.
      this.model.setFilter(value => {
        return {};
      });
      this.model.refresh().catch(console.warn);
    }
    this._showFileFilter = value;

    // Update widget visibility
    this.filterToolbar.setHidden(!this.showFileFilter);
    if (this.showFileFilter) {
      this._fileFilterRef.current?.focus();
    }
  }

  /**
   * Whether to sort notebooks above other files
   */
  get sortNotebooksFirst(): boolean {
    return this._sortNotebooksFirst;
  }

  set sortNotebooksFirst(value: boolean) {
    if (this.listing.setNotebooksFirstSorting) {
      this.listing.setNotebooksFirstSorting(value);
      this._sortNotebooksFirst = value;
    } else {
      console.warn('Listing does not support sorting notebooks first');
    }
  }

  /**
   * Whether to allow single click files and directories
   */
  get singleClickNavigation(): boolean {
    return this._allowSingleClick;
  }

  set singleClickNavigation(value: boolean) {
    if (this.listing.setAllowSingleClickNavigation) {
      this.listing.setAllowSingleClickNavigation(value);
      this._allowSingleClick = value;
    } else {
      console.warn('Listing does not support single click navigation');
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

  private async _createNew(
    options: Contents.ICreateOptions
  ): Promise<Contents.IModel> {
    // normalize the path if the file is created from a custom drive
    if (options.path) {
      const localPath = this._manager.services.contents.localPath(options.path);
      options.path = this._toDrivePath(this.model.driveName, localPath);
    }
    try {
      const model = await this._manager.newUntitled(options);
      await this.listing.selectItemByName(model.name, true);
      await this.rename();
      return model;
    } catch (err) {
      void showErrorMessage(this._trans.__('Error'), err);
      throw err;
    }
  }

  /**
   * Create a new directory
   */
  async createNewDirectory(): Promise<Contents.IModel> {
    if (this._directoryPending) {
      return this._directoryPending;
    }
    this._directoryPending = this._createNew({
      path: this.model.path,
      type: 'directory'
    });
    try {
      return await this._directoryPending;
    } finally {
      this._directoryPending = null;
    }
  }

  /**
   * Create a new file
   */
  async createNewFile(
    options: FileBrowser.IFileOptions
  ): Promise<Contents.IModel> {
    if (this._filePending) {
      return this._filePending;
    }
    this._filePending = this._createNew({
      path: this.model.path,
      type: 'file',
      ext: options.ext
    });
    try {
      return await this._filePending;
    } finally {
      this._filePending = null;
    }
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
   * cd ..
   *
   * Go up one level in the directory tree.
   */
  async goUp() {
    return this.listing.goUp();
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

  /**
   * Given a drive name and a local path, return the full
   * drive path which includes the drive name and the local path.
   *
   * @param driveName the name of the drive
   * @param localPath the local path on the drive.
   *
   * @returns the full drive path
   */
  private _toDrivePath(driveName: string, localPath: string): string {
    if (driveName === '') {
      return localPath;
    } else {
      return `${driveName}:${PathExt.removeSlash(localPath)}`;
    }
  }

  protected filterToolbar: Toolbar;
  protected listing: DirListing;
  protected crumbs: BreadCrumbs;
  protected mainPanel: Panel;

  private _directoryPending: Promise<Contents.IModel> | null = null;
  private _filePending: Promise<Contents.IModel> | null = null;
  private _fileFilterRef = createRef<HTMLInputElement>();
  private _manager: IDocumentManager;
  private _navigateToCurrentDirectory: boolean;
  private _allowSingleClick: boolean = false;
  private _showFileCheckboxes: boolean = false;
  private _showFileFilter: boolean = false;
  private _showFileSizeColumn: boolean = false;
  private _showHiddenFiles: boolean = false;
  private _showLastModifiedColumn: boolean = true;
  private _sortNotebooksFirst: boolean = false;
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

    /**
     * An optional state database. If provided, the widget will restore
     * the columns sizes
     */
    state?: IStateDB;
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
