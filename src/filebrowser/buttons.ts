// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  ISessionId, IKernelId, IKernelSpecIds
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  showDialog
} from '../dialog';

import {
  DocumentManager, IKernelPreference
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
 * The class name added for a file conflict.
 */
const FILE_CONFLICT_CLASS = 'jp-mod-conflict';


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
function createWithDialog(widget: FileButtons): Promise<Widget> {
  let handler: CreateNewHandler;
  let model = widget.model;
  let manager = widget.manager;
  // Get the current sessions.
  return manager.listSessions().then(sessions => {
    // Create the dialog and show it to the user.
    handler = new CreateNewHandler(model, manager, sessions);
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
    let path = '';
    return manager.createNew(path, widgetName, kernel);
  });
}


/**
 * A widget used to open files with a specific widget/kernel.
 */
class OpenWithHandler extends Widget {
  /**
   * Create the node for an open with handler.
   */
  static createNode(): HTMLElement {
    let body = document.createElement('div');
    let name = document.createElement('span');
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
  constructor(name: string, manager: DocumentManager, sessions: ISessionId[]) {
    super();
    this._manager = manager;
    this._sessions = sessions;

    let input = this.node.firstChild as HTMLElement;
    input.textContent = name;
    this._ext = name.split('.').pop();

    this.populateFactories();
    this.widgetDropdown.onchange = this.widgetChanged.bind(this);
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this._sessions = null;
    this._manager = null;
    super.dispose();
  }

  /**
   * Get the widget dropdown node.
   */
  get widgetDropdown(): HTMLSelectElement {
    return this.node.children[1] as HTMLSelectElement;
  }

  /**
   * Get the kernel dropdown node.
   */
  get kernelDropdown(): HTMLSelectElement {
    return this.node.children[2] as HTMLSelectElement;
  }

  /**
   * Populate the widget factories.
   */
  protected populateFactories(): void {
    let factories = this._manager.listWidgetFactories(this._ext);
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
  protected widgetChanged(): void {
    let widgetName = this.widgetDropdown.value;
    let preference = this._manager.getKernelPreference(this._ext, widgetName);
    updateKernels(preference, this.kernelDropdown, this._manager.kernelSpecs, this._sessions);
  }

  private _ext = '';
  private _manager: DocumentManager = null;
  private _sessions: ISessionId[] = null;
}


/**
 * A widget used to create new files.
 */
class CreateNewHandler extends Widget {
  /**
   * Create the node for a create new handler.
   */
  static createNode(): HTMLElement {
    let body = document.createElement('div');
    let name = document.createElement('input');
    let fileTypeDropdown = document.createElement('select');
    let widgetDropdown = document.createElement('select');
    let kernelDropdown = document.createElement('select');
    body.appendChild(name);
    body.appendChild(fileTypeDropdown);
    body.appendChild(widgetDropdown);
    body.appendChild(kernelDropdown);
    return body;
  }

  /**
   * Construct a new "create new" dialog.
   */
  constructor(model: FileBrowserModel, manager: DocumentManager, sessions: ISessionId[]) {
    super();
    this._model = model;
    this._manager = manager;
    this._sessions = sessions;

    // Create a file name based on the current time.
    let time = new Date();
    time.setMinutes(time.getMinutes() - time.getTimezoneOffset());
    let name = time.toJSON().slice(0, 10);
    name += '-' + time.getHours() + time.getMinutes() + time.getSeconds();
    this.input.value = name + '.txt';

    // Check for name conflicts when the input changes.
    this.input.addEventListener('input', () => {
      this.inputChanged();
    });
    // Update the widget choices when the file type changes.
    this.fileTypeDropdown.addEventListener('change', () => {
      this.fileTypeChanged();
    });
    // Update the kernel choices when the widget changes.
    this.widgetDropdown.addEventListener('change', () => {
      this.widgetDropdownChanged();
    });
    // Populate the lists of file types and widget factories.
    this.populateFileTypes();
    this.populateFactories();
  }

  /**
   * Handle a change to the input.
   */
  inputChanged(): void {
    let path = this.input.value;
    for (let item of this._model.sortedItems) {
      if (item.path === path) {
        this.addClass(FILE_CONFLICT_CLASS);
        return;
      }
    }
    let ext = this.ext;
    if (ext === this._prevExt) {
      return;
    }
    // Update the file type dropdown and the factories.
    if (this._extensions.indexOf(ext) === -1) {
      this.fileTypeDropdown.value = this._sentinal;
    } else {
      this.fileTypeDropdown.value = ext;
    }
    this.populateFactories();
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
   * Get the input text node.
   */
  get input(): HTMLInputElement {
    return this.node.firstChild as HTMLInputElement;
  }

  /**
   * Get the file type dropdown node.
   */
  get fileTypeDropdown(): HTMLSelectElement {
    return this.node.children[1] as HTMLSelectElement;
  }

  /**
   * Get the widget dropdown node.
   */
  get widgetDropdown(): HTMLSelectElement {
    return this.node.children[2] as HTMLSelectElement;
  }

  /**
   * Get the kernel dropdown node.
   */
  get kernelDropdown(): HTMLSelectElement {
    return this.node.children[3] as HTMLSelectElement;
  }

  /**
   * Get the current extension for the file.
   */
  get ext(): string {
    return this.input.value.split('.').pop();
  }

  /**
   * Populate the file types.
   */
  protected populateFileTypes(): void {
    let fileTypes = this._manager.listFileTypes();
    let dropdown = this.fileTypeDropdown;
    let option = document.createElement('option');
    option.text = 'File';
    option.value = this._sentinal;
    for (let ft of fileTypes) {
      option = document.createElement('option');
      option.text = `${ft.name} (${ft.extension})`;
      option.value = ft.extension;
      dropdown.appendChild(option);
      this._extensions.push(ft.extension);
    }
    if (this.ext in this._extensions) {
      dropdown.value = this.ext;
    } else {
      dropdown.value = this._sentinal;
    }
  }

  /**
   * Populate the widget factories.
   */
  protected populateFactories(): void {
    let ext = this.ext;
    let factories = this._manager.listWidgetFactories(ext);
    let widgetDropdown = this.widgetDropdown;
    for (let factory of factories) {
      let option = document.createElement('option');
      option.text = factory;
      widgetDropdown.appendChild(option);
    }
    this.widgetDropdownChanged();
    this._prevExt = ext;
  }

  /**
   * Handle changes to the file type dropdown.
   */
  protected fileTypeChanged(): void {
    // Update the current input.
    let oldExt = this.ext;
    let newExt = this.fileTypeDropdown.value;
    if (oldExt === newExt || newExt === '') {
      return;
    }
    let oldName = this.input.value;
    let base = oldName.slice(0, oldName.length - oldExt.length - 1);
    this.input.value = base + newExt;
  }

  /**
   * Handle a change to the widget dropdown.
   */
  protected widgetDropdownChanged(): void {
    let ext = this.ext;
    let widgetName = this.widgetDropdown.value;
    let preference = this._manager.getKernelPreference(ext, widgetName);
    updateKernels(preference, this.kernelDropdown, this._manager.kernelSpecs, this._sessions);
  }

  private _model: FileBrowserModel = null;
  private _manager: DocumentManager = null;
  private _sessions: ISessionId[] = null;
  private _sentinal = 'UNKNOWN_EXTENSION';
  private _prevExt = '';
  private _extensions: string[] = [];
}


/**
 * Update a kernel listing based on a kernel preference.
 */
function updateKernels(preference: IKernelPreference, node: HTMLSelectElement, specs: IKernelSpecIds, running: ISessionId[]): void {
  if (!preference.canStartKernel) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    node.disabled = true;
    return;
  }
  let lang = preference.language;
  node.disabled = false;
  populateKernels(node, specs, running, lang);
  // Select the "null" valued kernel if we do not prefer a kernel.
  if (!preference.preferKernel) {
    node.value = 'null';
  }
}


/**
 * Populate a kernel dropdown list.
 *
 * @param node - The host html element.
 *
 * @param specs - The available kernel spec information.
 *
 * @param running - The list of running session ids.
 *
 * @param preferredLanguage - The preferred language for the kernel.
 *
 * #### Notes
 * Populates the list with separated sections:
 *   - Kernels matching the preferred language (display names).
 *   - The remaining kernels.
 *   - Sessions matching the preferred language (file names).
 *   - The remaining sessions.
 *   - "None" signifying no kernel.
 * If no preferred language is given or no kernels are found using
 * the preferred language, the default kernel is used in the first
 * section.  Kernels are sorted by display name.  Sessions display the
 * base name of the file with an ellipsis overflow and a tooltip with
 * the explicit session information.
 */
export
function populateKernels(node: HTMLSelectElement, specs: IKernelSpecIds, running: ISessionId[], preferredLanguage?: string): void {
  // Clear any existing options.
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
  let maxLength = 10;
  // Create mappings of display names and languages for kernel name.
  let displayNames: { [key: string]: string } = Object.create(null);
  let languages: { [key: string]: string } = Object.create(null);
  for (let name in specs.kernelspecs) {
    displayNames[name] = specs.kernelspecs[name].spec.display_name;
    maxLength = Math.max(maxLength, displayNames[name].length);
    languages[name] = specs.kernelspecs[name].spec.language;
  }
  // Handle a preferred kernel language in order of display name.
  let names: string[] = [];
  if (preferredLanguage) {
    for (let name in specs.kernelspecs) {
      if (languages[name] === preferredLanguage) {
        names.push(name);
      }
    }
    names.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
    for (let name of names) {
      node.appendChild(optionForName(name, displayNames[name]));
    }
  }
  // Use the default kernel if no preferred language or none were found.
  if (!names) {
    let name = specs.default;
    node.appendChild(optionForName(name, displayNames[name]));
  }
  // Add a separator.
  node.appendChild(createSeparatorOption(maxLength));
  // Add the rest of the kernel names in alphabetical order.
  let otherNames: string[] = [];
  for (let name in specs.kernelspecs) {
    if (names.indexOf(name) !== -1) {
      continue;
    }
    otherNames.push(name);
  }
  otherNames.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
  for (let name of otherNames) {
    node.appendChild(optionForName(name, displayNames[name]));
  }
  // Add a separator option if there were any other names.
  if (otherNames.length) {
    node.appendChild(createSeparatorOption(maxLength));
  }
  // Add the sessions using the preferred language first.
  let matchingSessions: ISessionId[] = [];
  if (preferredLanguage) {
    for (let session of running) {
      if (languages[session.kernel.name] === preferredLanguage) {
        matchingSessions.push(session);
      }
    }
    if (matchingSessions) {
      matchingSessions.sort((a, b) => {
        return a.notebook.path.localeCompare(b.notebook.path);
      });
      for (let session of matchingSessions) {
        let name = displayNames[session.kernel.name];
        node.appendChild(optionForSession(session, name, maxLength));
      }
      node.appendChild(createSeparatorOption(maxLength));
    }
  }
  // Add the other remaining sessions.
  let otherSessions: ISessionId[] = [];
  for (let session of running) {
    if (matchingSessions.indexOf(session) === -1) {
      otherSessions.push(session);
    }
  }
  if (otherSessions) {
    otherSessions.sort((a, b) => {
      return a.notebook.path.localeCompare(b.notebook.path);
    });
    for (let session of otherSessions) {
      let name = displayNames[session.kernel.name];
      node.appendChild(optionForSession(session, name, maxLength));
    }
    node.appendChild(createSeparatorOption(maxLength));
  }
  // Add the option to have no kernel.
  let option = document.createElement('option');
  option.text = 'None';
  option.value = 'null';
  node.appendChild(option);
  node.selectedIndex = 0;
}


/**
 * Create a separator option.
 */
function createSeparatorOption(length: number): HTMLOptionElement {
  let option = document.createElement('option');
  option.disabled = true;
  option.text = Array(length).join('─');
  return option;
}

/**
 * Create an option element for a kernel name.
 */
function optionForName(name: string, displayName: string): HTMLOptionElement {
  let option = document.createElement('option');
  option.text = displayName;
  option.value = JSON.stringify({ name });
  return option;
}


/**
 * Create an option element for a session.
 */
function optionForSession(session: ISessionId, displayName: string, maxLength: number): HTMLOptionElement {
  let option = document.createElement('option');
  let sessionName = session.notebook.path.split('/').pop();
  if (sessionName.length > maxLength) {
    sessionName = sessionName.slice(0, maxLength - 3) + '...';
  }
  option.text = sessionName;
  option.value = JSON.stringify({ id: session.kernel.id });
  option.title = `Path: ${session.notebook.path}\n` +
    `Kernel Name: ${displayName}\n` +
    `Kernel Id: ${session.kernel.id}`;
  return option;
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
