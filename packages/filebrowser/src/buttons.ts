// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  Kernel
} from '@jupyterlab/services';

import {
  each, toArray
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  FileBrowserModel
} from './model';

import * as utils
  from './utils';


/**
 * The class name added to a file buttons widget.
 */
const FILE_BUTTONS_CLASS = 'jp-FileButtons';

/**
 * The class name added to a button node.
 */
const BUTTON_CLASS = 'jp-FileButtons-button';

/**
 * The class name added to a button content node.
 */
const CONTENT_CLASS = 'jp-FileButtons-buttonContent';

/**
 * The class name added to a button icon node.
 */
const ICON_CLASS = 'jp-FileButtons-buttonIcon';

/**
 * The class name added to the create button.
 */
const CREATE_CLASS = 'jp-id-create';

/**
 * The class name added to the add button.
 */
const MATERIAL_CREATE = 'jp-AddIcon';

/**
 * The class name added to the upload button.
 */
const MATERIAL_UPLOAD = 'jp-UploadIcon';

/**
 * The class name added to the refresh button.
 */
const MATERIAL_REFRESH = 'jp-RefreshIcon';

/**
 * The class name added to the down caret.
 */
const MATERIAL_DOWNCARET = 'jp-DownCaretIcon';

/**
 * The class name added to a material icon button.
 */
const MATERIAL_CLASS = 'jp-MaterialIcon';

/**
 * The class name added to the upload button.
 */
const UPLOAD_CLASS = 'jp-id-upload';

/**
 * The class name added to the refresh button.
 */
const REFRESH_CLASS = 'jp-id-refresh';

/**
 * The class name added to an active create button.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The class name added to a dropdown icon.
 */
const DROPDOWN_CLASS = 'jp-FileButtons-dropdownIcon';


/**
 * A widget which hosts the file browser buttons.
 */
export
class FileButtons extends Widget {
  /**
   * Construct a new file browser buttons widget.
   */
  constructor(options: FileButtons.IOptions) {
    super();
    this.addClass(FILE_BUTTONS_CLASS);
    this.model = options.model;
    this.manager = this.model.manager;

    this._buttons.create.onmousedown = this._onCreateButtonPressed.bind(this);
    this._buttons.upload.onclick = this._onUploadButtonClicked.bind(this);
    this._buttons.refresh.onclick = this._onRefreshButtonClicked.bind(this);
    this._input.onchange = this._onInputChanged.bind(this);

    this.node.appendChild(this._buttons.create);
    this.node.appendChild(this._buttons.upload);
    this.node.appendChild(this._buttons.refresh);

    this._commands = options.commands;
  }

  /**
   * The document manager used by the widget.
   */
  readonly manager: IDocumentManager;

  /**
   * The underlying file browser model for the widget.
   */
  readonly model: FileBrowserModel;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._buttons = null;
    this._commands = null;
    this._input = null;
    super.dispose();
  }

  /**
   * Get the create button node.
   */
  get createNode(): HTMLButtonElement {
    return this._buttons.create;
  }

  /**
   * Get the upload button node.
   */
  get uploadNode(): HTMLButtonElement {
    return this._buttons.upload;
  }

  /**
   * Get the refresh button node.
   */
  get refreshNode(): HTMLButtonElement {
    return this._buttons.refresh;
  }

  /**
   * Open a file by path.
   *
   * @param path - The path of the file.
   *
   * @param widgetName - The name of the widget factory to use.
   *
   * @param kernel - The kernel model to use.
   *
   * @return The widget for the path.
   */
  open(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    let widget = this.manager.openOrReveal(path, widgetName, kernel);
    return widget;
  }

  /**
   * Create a new file by path.
   *
   * @param path - The path of the file.
   *
   * @param widgetName - The name of the widget factory to use.
   *
   * @param kernel - The kernel model to use.
   *
   * @return The widget for the path.
   */
  createNew(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    return this.manager.createNew(path, widgetName, kernel);
  }

  /**
   * The 'mousedown' handler for the create button.
   */
  private _onCreateButtonPressed(event: MouseEvent) {
    // Do nothing if nothing if it's not a left press.
    if (event.button !== 0) {
      return;
    }

    // Do nothing if the create button is already active.
    let button = this._buttons.create;
    if (button.classList.contains(ACTIVE_CLASS)) {
      return;
    }

    // Create a new dropdown menu and snap the button geometry.
    let commands = this._commands;
    let dropdown = Private.createDropdownMenu(this, commands);
    let rect = button.getBoundingClientRect();

    // Mark the button as active.
    button.classList.add(ACTIVE_CLASS);

    // Setup the `aboutToClose` signal handler. The menu is disposed on an
    // animation frame to allow a mouse press event which closed the
    // menu to run its course. This keeps the button from re-opening.
    dropdown.aboutToClose.connect(this._onDropDownAboutToClose, this);

    // Setup the `disposed` signal handler. This restores the button
    // to the non-active state and allows a new menu to be opened.
    dropdown.disposed.connect(this._onDropDownDisposed, this);

    // Popup the menu aligned with the bottom of the create button.
    dropdown.open(rect.left, rect.bottom, { forceX: false, forceY: false });
  };

  /**
   * Handle a dropdwon about to close.
   */
  private _onDropDownAboutToClose(sender: Menu): void {
    requestAnimationFrame(() => { sender.dispose(); });
  }

  /**
   * Handle a dropdown disposal.
   */
  private _onDropDownDisposed(sender: Menu): void {
    this._buttons.create.classList.remove(ACTIVE_CLASS);
  }

  /**
   * The 'click' handler for the upload button.
   */
  private _onUploadButtonClicked(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    this._input.click();
  }

  /**
   * The 'click' handler for the refresh button.
   */
  private _onRefreshButtonClicked(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    // Force a refresh of the current directory.
    this.model.refresh();
  }

  /**
   * The 'change' handler for the input field.
   */
  private _onInputChanged(): void {
    let files = Array.prototype.slice.call(this._input.files);
    Private.uploadFiles(this, files as File[]);
  }

  private _buttons = Private.createButtons();
  private _commands: CommandRegistry = null;
  private _input = Private.createUploadInput();
}


/**
 * The namespace for the `FileButtons` class statics.
 */
export
namespace FileButtons {
  /**
   * An options object for initializing a file buttons widget.
   */
  export
  interface IOptions {
    /**
     * The command registry for use with the file buttons.
     */
    commands: CommandRegistry;

    /**
     * A file browser model instance.
     */
    model: FileBrowserModel;
  }
}


/**
 * The namespace for the `FileButtons` private data.
 */
namespace Private {
  /**
   * An object which holds the button nodes for a file buttons widget.
   */
  export
  interface IButtonGroup {
    create: HTMLButtonElement;
    upload: HTMLButtonElement;
    refresh: HTMLButtonElement;
  }

  /**
   * Create the button group for a file buttons widget.
   */
  export
  function createButtons(): IButtonGroup {
    let create = document.createElement('button');
    let upload = document.createElement('button');
    let refresh = document.createElement('button');

    let createContent = document.createElement('span');
    let uploadContent = document.createElement('span');
    let refreshContent = document.createElement('span');

    let createIcon = document.createElement('span');
    let uploadIcon = document.createElement('span');
    let refreshIcon = document.createElement('span');
    let dropdownIcon = document.createElement('span');

    create.type = 'button';
    upload.type = 'button';
    refresh.type = 'button';

    create.title = 'Create New...';
    upload.title = 'Upload File(s)';
    refresh.title = 'Refresh File List';

    create.className = `${BUTTON_CLASS} ${CREATE_CLASS}`;
    upload.className = `${BUTTON_CLASS} ${UPLOAD_CLASS}`;
    refresh.className = `${BUTTON_CLASS} ${REFRESH_CLASS}`;

    createContent.className = CONTENT_CLASS;
    uploadContent.className = CONTENT_CLASS;
    refreshContent.className = CONTENT_CLASS;

    // TODO make these icons configurable.
    createIcon.className = ICON_CLASS + ' ' + MATERIAL_CLASS + ' ' + MATERIAL_CREATE;
    uploadIcon.className = ICON_CLASS + ' ' + MATERIAL_CLASS + ' ' + MATERIAL_UPLOAD;
    refreshIcon.className = ICON_CLASS + ' ' + MATERIAL_CLASS + ' ' + MATERIAL_REFRESH;
    dropdownIcon.className = DROPDOWN_CLASS + ' ' + MATERIAL_CLASS + ' ' + MATERIAL_DOWNCARET;

    createContent.appendChild(createIcon);
    createContent.appendChild(dropdownIcon);
    uploadContent.appendChild(uploadIcon);
    refreshContent.appendChild(refreshIcon);

    create.appendChild(createContent);
    upload.appendChild(uploadContent);
    refresh.appendChild(refreshContent);

    return { create, upload, refresh };
  }

  /**
   * Create the upload input node for a file buttons widget.
   */
  export
  function createUploadInput(): HTMLInputElement {
    let input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    return input;
  }


  /**
   * Create a new dropdown menu for the create new button.
   */
  export
  function createDropdownMenu(widget: FileButtons, commands: CommandRegistry): Menu {
    const menu = new Menu({ commands });

    // Add new folder menu item.
    menu.addItem({
      args: {
        error: 'New Folder Error',
        label: 'Folder',
        path: widget.model.path,
        type: 'directory'
      },
      command: 'file-operations:new-untitled'
    });

    const { registry } = widget.manager;
    const items = toArray(widget.model.items()).map(item => item.path);
    const path = widget.model.path;
    each(registry.creators(), creator => {
      const command = 'file-operations:create-from';
      const creatorName = creator.name;
      const args = { creatorName, items, path };
      menu.addItem({ args, command });
    });
    return menu;
  }

  /**
   * Upload an array of files to the server.
   */
  export
  function uploadFiles(widget: FileButtons, files: File[]): void {
    let pending = files.map(file => uploadFile(widget, file));
    Promise.all(pending).catch(error => {
      utils.showErrorMessage('Upload Error', error);
    });
  }

  /**
   * Upload a file to the server.
   */
  function uploadFile(widget: FileButtons, file: File): Promise<any> {
    return widget.model.upload(file).catch(error => {
      let exists = error.message.indexOf('already exists') !== -1;
      if (exists) {
        return uploadFileOverride(widget, file);
      }
      throw error;
    });
  }

  /**
   * Upload a file to the server checking for override.
   */
  function uploadFileOverride(widget: FileButtons, file: File): Promise<any> {
    let overwrite = Dialog.warnButton({ label: 'OVERWRITE' });
    let options = {
      title: 'Overwrite File?',
      body: `"${file.name}" already exists, overwrite?`,
      buttons: [Dialog.cancelButton(), overwrite]
    };
    return showDialog(options).then(button => {
      if (widget.isDisposed || button.accept) {
        return;
      }
      return widget.model.upload(file, true);
    });
  }
}
