// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Toolbar, ToolbarButton
} from '@jupyterlab/apputils';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  Contents
} from '@jupyterlab/services';

import {
  IIterator
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

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
  Uploader
} from './upload';

import {
  showErrorMessage
} from './utils';


/**
 * The class name added to file browsers.
 */
const FILE_BROWSER_CLASS = 'jp-FileBrowser';

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
 * The class name added to the refresh button.
 */
const REFRESH_BUTTON = 'jp-RefreshIcon';

/**
 * The class name added to a material icon button.
 */
const MATERIAL_CLASS = 'jp-MaterialIcon';


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
    this.id = options.id;

    const model = this.model = options.model;
    const renderer = options.renderer;

    model.connectionFailure.connect(this._onConnectionFailure, this);
    this._manager = model.manager;
    this._crumbs = new BreadCrumbs({ model });
    this.toolbar = new Toolbar<Widget>();

    let directoryPending = false;
    let newFolder = new ToolbarButton({
      className: 'jp-newFolderIcon',
      onClick: () => {
        if (directoryPending === true) {
          return;
        }
        directoryPending = true;
        this._manager.newUntitled({
          path: model.path,
          type: 'directory'
        }).then(model => {
          this._listing.selectItemByName(model.name);
          directoryPending = false;
        }).catch(err => {
          directoryPending = false;
        });
      },
      tooltip: 'New Folder'
    });
    newFolder.addClass(MATERIAL_CLASS);

    let uploader = new Uploader({ model });

    let refresher = new ToolbarButton({
      className: REFRESH_BUTTON,
      onClick: () => {
        model.refresh();
      },
      tooltip: 'Refresh File List'
    });
    refresher.addClass(MATERIAL_CLASS);

    this.toolbar.addItem('newFolder', newFolder);
    this.toolbar.addItem('upload', uploader);
    this.toolbar.addItem('refresher', refresher);

    this._listing = new DirListing({ model, renderer });

    this._crumbs.addClass(CRUMBS_CLASS);
    this.toolbar.addClass(TOOLBAR_CLASS);
    this._listing.addClass(LISTING_CLASS);

    let layout = new PanelLayout();
    layout.addWidget(this.toolbar);
    layout.addWidget(this._crumbs);
    layout.addWidget(this._listing);

    this.layout = layout;
    model.restore(this.id);
  }

  /**
   * The model used by the file browser.
   */
  readonly model: FileBrowserModel;

  /**
   * The toolbar used by the file browser.
   */
  readonly toolbar: Toolbar<Widget>;

  /**
   * Create an iterator over the listing's selected items.
   *
   * @returns A new iterator over the listing's selected items.
   */
  selectedItems(): IIterator<Contents.IModel> {
    return this._listing.selectedItems();
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
  pathForClick(event: MouseEvent): string | undefined {
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

  private _crumbs: BreadCrumbs;
  private _listing: DirListing;
  private _manager: DocumentManager;
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
     * The widget/DOM id of the file browser.
     */
    id: string;

    /**
     * A file browser model instance.
     */
    model: FileBrowserModel;

    /**
     * An optional renderer for the directory listing area.
     *
     * The default is a shared instance of `DirListing.Renderer`.
     */
    renderer?: DirListing.IRenderer;
  }
}
