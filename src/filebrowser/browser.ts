// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from '@jupyterlab/services';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  Keymap
} from 'phosphor/lib/ui/keymap';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  DocumentManager
} from '../docmanager';

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
const REFRESH_DURATION = 10000;


/**
 * An interface for a widget opener.
 */
export
interface IWidgetOpener {
  open(widget: Widget): void;
}


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
  constructor(options: FileBrowserWidget.IOptions) {
    super();
    this.addClass(FILE_BROWSER_CLASS);
    let commands = this._commands = options.commands;
    let keymap = this._keymap = options.keymap;
    let manager = this._manager = options.manager;
    let model = this._model = options.model;
    let opener = this._opener = options.opener;
    let renderer = options.renderer;

    model.refreshed.connect(this._handleRefresh, this);
    this._crumbs = new BreadCrumbs({ model });
    this._buttons = new FileButtons({
      commands, keymap, manager, model, opener
    });
    this._listing = new DirListing({ manager, model, opener, renderer });

    model.fileChanged.connect((fbModel, args) => {
      let oldPath = args.oldValue && args.oldValue.path || null;
      if (args.newValue) {
        manager.handleRename(oldPath, args.newValue.path);
      } else {
        manager.handleDelete(oldPath);
      }
    });

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
   *
   * #### Notes
   * This is a read-only property.
   */
  get commands(): CommandRegistry {
    return this._commands;
  }

  /**
   * Get the keymap manager used by the file browser.
   *
   * #### Notes
   * This is a read-only property.
   */
  get keymap(): Keymap {
    return this._keymap;
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
   * Dispose of the resources held by the file browser.
   */
  dispose() {
    this._model = null;
    this._crumbs = null;
    this._buttons = null;
    this._listing = null;
    this._manager = null;
    this._opener = null;
    super.dispose();
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
   */
  open(): void {
    let foundDir = false;
    each(this._model.items, item => {
      if (!this._listing.isSelected(item.name)) {
        return;
      }
      if (item.type === 'directory') {
        if (!foundDir) {
          foundDir = true;
          this._model.cd(item.name).catch(error =>
            showErrorMessage(this, 'Open directory', error)
          );
        }
      } else {
        this.openPath(item.path);
      }
    });
  }

  /**
   * Open a file by path.
   */
  openPath(path: string, widgetName='default'): Widget {
    return this._buttons.open(path, widgetName);
  }

  /**
   * Create a file from a creator.
   */
  createFrom(creatorName: string): Promise<Widget> {
    return this._buttons.createFrom(creatorName);
  }

  /**
   * Create a new untitled file in the current directory.
   */
  createNew(options: Contents.ICreateOptions): Promise<Widget> {
    let model = this.model;
    return model.newUntitled(options).then(contents => {
      return this._buttons.createNew(contents.path);
    });
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
  download(): void {
    this._listing.download();
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
    return this._model.refresh().catch(error => {
      showErrorMessage(this, 'Server Connection Error', error);
    });
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
   */
  pathForClick(event: MouseEvent): string {
    return this._listing.pathForClick(event);
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

  private _buttons: FileButtons = null;
  private _commands: CommandRegistry = null;
  private _crumbs: BreadCrumbs = null;
  private _keymap: Keymap = null;
  private _listing: DirListing = null;
  private _manager: DocumentManager = null;
  private _model: FileBrowserModel = null;
  private _opener: IWidgetOpener = null;
  private _timeoutId = -1;
}


/**
 * The namespace for the `FileBrowserWidget` class statics.
 */
export
namespace FileBrowserWidget {
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
     * The keymap for use with the file browser.
     */
    keymap: Keymap;

    /**
     * A file browser model instance.
     */
    model: FileBrowserModel;

    /**
     * A document manager instance.
     */
    manager: DocumentManager;

    /**
     * A widget opener function.
     */
    opener: IWidgetOpener;

    /**
     * An optional renderer for the directory listing area.
     *
     * The default is a shared instance of `DirListing.Renderer`.
     */
    renderer?: DirListing.IRenderer;
  }
}
