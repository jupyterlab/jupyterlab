// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  ISessionId, IKernelId
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  showDialog
} from '../dialog';

import {
  DocumentManager
} from '../docmanager';

import {
  FileBrowserModel
} from './model';

import {
  IWidgetOpener
} from './browser';

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
 * The class name added to the upload button.
 */
const UPLOAD_CLASS = 'jp-id-upload';

/**
 * The class name added to the refresh button.
 */
const REFRESH_CLASS = 'jp-id-refresh';


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
  constructor(model: FileBrowserModel, manager: DocumentManager, opener: IWidgetOpener) {
    super();
    this.addClass(FILE_BUTTONS_CLASS);
    this._model = model;

    this._buttons.create.onclick = this._onCreateButtonClicked;
    this._buttons.upload.onclick = this._onUploadButtonClicked;
    this._buttons.refresh.onclick = this._onRefreshButtonClicked;
    this._input.onchange = this._onInputChanged;

    let node = this.node;
    node.appendChild(this._buttons.create);
    node.appendChild(this._buttons.upload);
    node.appendChild(this._buttons.refresh);

    this._manager = manager;
    this._opener = opener;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._model = null;
    this._buttons = null;
    this._input = null;
    this._manager = null;
    this._opener = null;
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
   * Get the document manager used by the widget.
   */
  get manager(): DocumentManager {
    return this._manager;
  }

  /**
   * Open a file by path.
   */
  open(path: string): void {
    let widget = this._manager.open(path);
    let opener = this._opener;
    opener.open(widget);
  }

  /**
   * The 'mousedown' handler for the create button.
   */
  private _onCreateButtonClicked = (event: MouseEvent) => {
    // Do nothing if nothing if it's not a left press.
    if (event.button !== 0) {
      return;
    }

    createWithDialog(this).catch(error => {
      utils.showErrorMessage(this, 'New File Error', error);
    });
  };


  /**
   * The 'click' handler for the upload button.
   */
  private _onUploadButtonClicked = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    this._input.click();
  };

  /**
   * The 'click' handler for the refresh button.
   */
  private _onRefreshButtonClicked = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    this._model.refresh().catch(error => {
      utils.showErrorMessage(this, 'Server Connection Error', error);
    });
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
  private _manager: DocumentManager = null;
  private _opener: IWidgetOpener = null;
}


/**
 * Create a new file using a dialog.
 */
function
createWithDialog(widget: FileButtons): Promise<Widget> {
  let handler: CreateNewHandler;
  let model = widget.model;
  let manager = widget.manager;
  // Create a file name based on the current time.
  let time = new Date();
  time.setMinutes(time.getMinutes() - time.getTimezoneOffset());
  let name = time.toJSON().slice(0, 10);
  name += '-' + time.getHours() + time.getMinutes() + time.getSeconds();
  name += '.txt';
  // Get the current sessions.
  return manager.listSessions().then(sessions => {
    // Create the dialog and show it to the user.
    handler = new CreateNewHandler(name, model, manager, sessions);
    return showDialog({
      title: 'Create a new file',
      host: widget.parent.node,
      body: handler.node
    });
  }).then(result => {
    if (result.text !== 'OK') {
      throw new Error('Aborted');
    }
    // TODO: check for a name conflict.
  }).then(contents => {
    // Create the widget.
    let widgetName = handler.widgetDropdown.value;
    let value = handler.kernelDropdown.value;
    let kernel: IKernelId;
    if (value === 'None') {
      kernel = void 0;
    } else {
      kernel = JSON.parse(value) as IKernelId;
    }
    // TODO: get the full path here.
    return manager.createNew(contents.path, widgetName, kernel);
  });
}


/**
 * A widget used to open files with a specific widget/kernel.
 */
class OpenWithHandler extends Widget {
  /**
   * Create the node for a create new handler.
   */
  static createNode(): HTMLElement {
    let body = document.createElement('div');
    let name = document.createElement('input');
    let widgetDropdown = document.createElement('select');
    let kernelDropdown = document.createElement('select');
    body.appendChild(name);
    body.appendChild(widgetDropdown);
    body.appendChild(kernelDropdown);
    return body;
  }

  /**
   * Construct a new "open with" dialog.
   */
  constructor(name: string, model: FileBrowserModel, manager: DocumentManager, sessions: ISessionId[]) {
    super();
    this._model = model;
    this._manager = manager;
    this._sessions = sessions;

    this.input.value = name;
    this.input.disabled = true;

    // When a widget changes, we update the kernel list.
    let widgetDropdown = this.node.children[1] as HTMLSelectElement;
    this.populateFactories();
    widgetDropdown.onchange = this.widgetChanged.bind(this);
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this._model = null;
    this._sessions = null;
    this._manager = null;
    super.dispose();
  }

  /**
   * Get the input node for the dialog.
   */
  get input(): HTMLInputElement {
    return this.node.firstChild as HTMLInputElement;
  }

  /**
   * Get the current extension of the file.
   */
  get ext(): string {
    return '.' + this.input.textContent.split('.').pop();
  }

  /**
   * Get the widget dropdown node for the dialog.
   */
  get widgetDropdown(): HTMLSelectElement {
    return this.node.children[1] as HTMLSelectElement;
  }

  /**
   * Get the kernel dropdown node for the dialog.
   */
  get kernelDropdown(): HTMLSelectElement {
    return this.node.children[2] as HTMLSelectElement;
  }

  /**
   * Populate the widget factories.
   */
  populateFactories(): void {
    let ext = this.ext;
    let factories = this._manager.listWidgetFactories(ext);
    let widgetDropdown = this.widgetDropdown;
    for (let factory of factories) {
      let option = document.createElement('option');
      option.text = factory;
      widgetDropdown.appendChild(option);
    }
  }

  /**
   * Handle a change to the widget.
   */
  widgetChanged(): void {
    let widgetDropdown = this.widgetDropdown;
    let kernelDropdown = this.kernelDropdown;
    let widgetName = widgetDropdown.value;
    let ext = this.ext;
    let preference = this._manager.getKernelPreference(ext, widgetName);
    let lang = preference.language;
    let specs = this._manager.kernelSpecs;
    // Find the preferred kernel name.
    let kernelName = specs.default;
    for (let name in specs.kernelspecs) {
      let kernelLanguage = specs.kernelspecs[name].spec.language;
      if (lang === kernelLanguage) {
        kernelName = name;
        break;
      }
    }
    // Remove existing kernel list.
    while (kernelDropdown.firstChild) {
      kernelDropdown.removeChild(kernelDropdown.firstChild);
    }
    let option: HTMLOptionElement;
    // Put the preferred kernel name first.
    option = document.createElement('option');
    option.text = this.getDisplayName(kernelName);
    option.value = kernelName;
    // Add the rest of the names.
    for (let name in specs.kernelspecs) {
      if (name === kernelName) {
        continue;
      }
      option = document.createElement('option');
      option.text = this.getDisplayName(name);
      option.value = JSON.stringify({ name });
    }
    // Add running session info.
    for (let session of this._sessions) {
      option = document.createElement('option');
      let name = session.notebook.path.split('/').pop();
      name = name.split('.')[0];
      kernelName = session.kernel.name;
      option.text = name + ' (' + this.getDisplayName(kernelName) + ')';
      option.value = JSON.stringify({ id: session.kernel.id });
    }
    // Create an option that starts no kernel.
    option = document.createElement('option');
    option.text = 'None';
    kernelDropdown.value = kernelDropdown.value || kernelName;
    if (!preference.canStartKernel) {
      kernelDropdown.disabled = true;
    } else if (!preference.preferKernel) {
      kernelDropdown.value = 'None';
    }
  }

  /**
   * Get the display name given a kernel name.
   */
  getDisplayName(name: string): string {
    let specs = this._manager.kernelSpecs;
    return specs.kernelspecs[name].spec.display_name;
  }

  private _model: FileBrowserModel = null;
  private _manager: DocumentManager = null;
  private _sessions: ISessionId[] = null;
}


/**
 * A widget used to create new files.
 */
class CreateNewHandler extends OpenWithHandler {
  /**
   * Construct a new "create new" dialog.
   */
  constructor(name: string, model: FileBrowserModel, manager: DocumentManager, sessions: ISessionId[]) {
    super(name, model, manager, sessions);

    // When an extension changes, we update the widget and kernel lists.
    this.input.oninput = this.inputChanged.bind(this);
    this.input.disabled = false;
  }

  /**
   * Handle a change to the input.
   */
  inputChanged(): void {
    let ext = this.ext;
    if (ext === this._prevExt) {
      return;
    }
    let widgetDropdown = this.widgetDropdown;
    while (widgetDropdown.firstChild) {
      widgetDropdown.removeChild(widgetDropdown.firstChild);
    }
    this.populateFactories();
    this.widgetChanged();
    this._prevExt = ext;
  }

  private _prevExt = '';
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

    createContent.appendChild(createIcon);
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
    let options = {
      title: 'Overwrite File?',
      host: widget.parent.node,
      body: `"${file.name}" already exists, overwrite?`
    };
    return showDialog(options).then(button => {
      if (button.text !== 'OK') {
        return;
      }
      return widget.model.upload(file, true);
    });
  }
}
