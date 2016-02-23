// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelSpecId
} from 'jupyter-js-services';

import {
  showDialog
} from 'jupyter-js-domutils';

import {
  Menu, MenuItem
} from 'phosphor-menus';

import {
  Widget
} from 'phosphor-widget';

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
 * The class name added to a dropdown icon.
 */
const DROPDOWN_CLASS = 'jp-FileButtons-dropdownIcon';

/**
 * The class name added to the create button.
 */
const CREATE_CLASS = 'jp-id-create';

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
 * A widget which hosts the file browser buttons.
 */
export
class FileButtons extends Widget {
  /**
   * Construct a new file browser buttons widget.
   *
   * @param model - The file browser view model.
   */
  constructor(model: FileBrowserModel) {
    super();
    this.addClass(FILE_BUTTONS_CLASS);
    this._model = model;

    this._buttons.create.onmousedown = this._onCreateButtonPressed;
    this._buttons.upload.onclick = this._onUploadButtonClicked;
    this._buttons.refresh.onclick = this._onRefreshButtonClicked;
    this._input.onchange = this._onInputChanged;

    let node = this.node;
    node.appendChild(this._buttons.create);
    node.appendChild(this._buttons.upload);
    node.appendChild(this._buttons.refresh);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._model = null;
    this._buttons = null;
    this._input = null;
    super.dispose();
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): FileBrowserModel {
    return this._model;
  }

  /**
   * The 'mousedown' handler for the create button.
   */
  private _onCreateButtonPressed = (event: MouseEvent) => {
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
    let dropdown = Private.createDropdownMenu(this);
    let rect = button.getBoundingClientRect();

    // Mark the button as active.
    button.classList.add(ACTIVE_CLASS);

    // Setup the `closed` signal handler. The menu is disposed on an
    // animation frame to allow a mouse press event which closed the
    // menu to run its course. This keeps the button from re-opening.
    dropdown.closed.connect(() => {
      requestAnimationFrame(() => { dropdown.dispose(); });
    });

    // Setup the `disposed` signal handler. This restores the button
    // to the non-active state and allows a new menu to be opened.
    dropdown.disposed.connect(() => {
      button.classList.remove(ACTIVE_CLASS);
    });

    // Popup the menu aligned with the bottom of the create button.
    dropdown.popup(rect.left, rect.bottom, false, true);
  };

  /**
   * The 'click' handler for the upload button.
   */
  private _onUploadButtonClicked = (event: MouseEvent) => {
    if (event.button !== 0) return;
    this._input.click();
  };

  /**
   * The 'click' handler for the refresh button.
   */
  private _onRefreshButtonClicked = (event: MouseEvent) => {
    if (event.button !== 0) return;
    this._model.refresh();
  };

  /**
   * The 'change' handler for the input field.
   */
  private _onInputChanged = () => {
    let files = Array.prototype.slice.call(this._input.files);
    Private.uploadFiles(this, files as File[]);
  };

  private _model: FileBrowserModel;
  private _buttons = Private.createButtons();
  private _input = Private.createUploadInput();
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
    createIcon.className = ICON_CLASS + ' fa fa-plus';
    uploadIcon.className = ICON_CLASS + ' fa fa-upload';
    refreshIcon.className = ICON_CLASS + ' fa fa-refresh';
    dropdownIcon.className = DROPDOWN_CLASS + ' fa fa-caret-down';

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
   * Create a new untitled file.
   */
  export
  function createNewFile(widget: FileButtons): void {
    widget.model.newUntitled('file').then(contents => {
      widget.model.refresh().then(() => widget.model.open(contents.name));
    }).catch(error => {
      utils.showErrorMessage(widget, 'New File Error', error);
    });
  }

  /**
   * Create a new untitled folder.
   */
  export
  function createNewFolder(widget: FileButtons): void {
    widget.model.newUntitled('directory').then(contents => {
      widget.model.refresh();
    }).catch(error => {
      utils.showErrorMessage(widget, 'New Folder Error', error);
    });
  }

  /**
   * Create a new untitled notebook.
   */
  export
  function createNewNotebook(widget: FileButtons, spec: IKernelSpecId): void {
    widget.model.newUntitled('notebook').then(contents => {
      let started = widget.model.startSession(contents.path, spec.name);
      return started.then(() => contents);
    }).then(contents => {
      widget.model.refresh().then(() => widget.model.open(contents.name));
    }).catch(error => {
      utils.showErrorMessage(widget, 'New Notebook Error', error);
    });
  }

  /**
   * Create a new dropdown menu for the create new button.
   */
  export
  function createDropdownMenu(widget: FileButtons): Menu {
    let items = [
      new MenuItem({
        text: 'Text File',
        handler: () => { createNewFile(widget); }
      }),
      new MenuItem({
        text: 'Folder',
        handler: () => { createNewFolder(widget); }
      }),
      new MenuItem({
        type: MenuItem.Separator
      })
    ];
    // TODO the kernels below are suffixed with "Notebook" as a
    // temporary measure until we can update the Menu widget to
    // show text in a separator for a "Notebooks" group.
    let extra = widget.model.kernelSpecs.map(spec => {
      return new MenuItem({
        text: `${spec.spec.display_name} Notebook`,
        handler: () => { createNewNotebook(widget, spec); }
      });
    });
    return new Menu(items.concat(extra));
  }

  /**
   * Upload an array of files to the server.
   */
  export
  function uploadFiles(widget: FileButtons, files: File[]): void {
    let pending = files.map(file => uploadFile(widget, file));
    Promise.all(pending).then(() => {
      widget.model.refresh();
    }).catch(error => {
      utils.showErrorMessage(widget, 'Upload Error', error);
    });
  }

  /**
   * Upload a file to the server.
   */
  function uploadFile(widget: FileButtons, file: File): Promise<any> {
    return widget.model.upload(file).catch(error => {
      let exists = error.message.indexOf('already exists') !== -1;
      if (exists) return uploadFileOverride(widget, file);
      throw error;
    });
  }

  /**
   * Upload a file to the server checking for override.
   */
  function uploadFileOverride(widget: FileButtons, file: File): Promise<any> {
    let options = {
      title: 'Overwrite File?',
      host: this.parent.node,
      body: `"${file.name}" already exists, overwrite?`
    };
    return showDialog(options).then(button => {
      if (button.text !== 'Ok') return;
      return widget.model.upload(file, true);
    });
  }
}
