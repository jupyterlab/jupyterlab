// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

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
 * The duration of auto-refresh in ms.
 */
const REFRESH_DURATION = 30000;


/**
 * A widget which hosts a file browser.
 *
 * The widget uses the Jupyter Contents API to retreive contents,
 * and presents itself as a flat list of files and directories with
 * breadcrumbs.
 */
export
class FileBrowserWidget extends Widget {
  /**
   * Construct a new file browser.
   *
   * @param model - The file browser view model.
   */
  constructor(model: FileBrowserModel) {
    super();
    this.addClass(FILE_BROWSER_CLASS);
    this._model = model;
    this._model.refreshed.connect(this._handleRefresh, this)
    this._crumbs = new BreadCrumbs(model);
    this._buttons = new FileButtons(model);
    this._listing = new DirListing(model);

    this._crumbs.addClass(CRUMBS_CLASS);
    this._buttons.addClass(BUTTON_CLASS);
    this._listing.addClass(LISTING_CLASS);

    let layout = new PanelLayout();
    layout.addChild(this._crumbs);
    layout.addChild(this._buttons);
    layout.addChild(this._listing);

    this.layout = layout;
  }

  /**
   * Dispose of the resources held by the file browser.
   */
  dispose() {
    this._model = null;
    this._crumbs = null;
    this._buttons = null;
    this._listing = null;
    super.dispose();
  }

  /**
   * Get the model used by the file browser.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): FileBrowserModel {
    return this._model;
  }

  /**
   * Get the widget factory for the widget.
   */
  get widgetFactory(): (model: IContentsModel) => Widget {
    return this._listing.widgetFactory;
  }

  /**
   * Set the widget factory for the widget.
   */
  set widgetFactory(factory: (model: IContentsModel) => Widget) {
    this._listing.widgetFactory = factory;
  }

  /**
   * Change directory.
   */
  cd(path: string): Promise<void> {
    return this._model.cd(path);
  }

  /**
   * Open the currently selected item(s).
   *
   * Changes to the first directory encountered.
   * Emits [[openRequested]] signals for files.
   */
  open(): void {
    let foundDir = false;
    let items = this._model.sortedItems;
    for (let item of items) {
      if (!this._model.isSelected(item.name)) {
        continue;
      }
      if (item.type === 'directory' && !foundDir) {
        foundDir = true;
        this._model.open(item.name).catch(error =>
          showErrorMessage(this, 'Open directory', error)
        );
      } else {
        this.model.open(item.name);
      }
    }
  }

  /**
   * Create a new untitled file or directory in the current directory.
   */
  newUntitled(type: string, ext?: string): Promise<IContentsModel> {
    return this.model.newUntitled(type, ext);
  }

  /**
   * Rename the first currently selected item.
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
   */
  paste(): Promise<void> {
    return this._listing.paste();
  }

  /**
   * Delete the currently selected item(s).
   */
  delete(): Promise<void> {
    return this._listing.delete();
  }

  /**
   * Duplicate the currently selected item(s).
   */
  duplicate(): Promise<void> {
    return this._listing.duplicate();
  }

  /**
   * Download the currently selected item(s).
   */
  download(): Promise<void> {
    return this._listing.download();
  }

  /**
   * Shut down kernels on the applicable currently selected items.
   */
  shutdownKernels(): Promise<void> {
    return this._listing.shutdownKernels();
  }

  /**
   * Refresh the current directory.
   */
  refresh(): Promise<void> {
    return this._model.refresh().catch(
      error => showErrorMessage(this, 'Refresh Error', error)
    );
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
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.refresh();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.refresh();
  }

  /**
   * Handle a model refresh.
   */
  private _handleRefresh(): void {
    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(() => this.refresh(), REFRESH_DURATION);
  }

  private _model: FileBrowserModel = null;
  private _crumbs: BreadCrumbs = null;
  private _buttons: FileButtons = null;
  private _listing: DirListing = null;
  private _timeoutId = -1;
}
