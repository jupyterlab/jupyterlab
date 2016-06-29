// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, ISession
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
  IKernelPreference, populateKernels
} from '../docregistry';

import {
  FileBrowserModel
} from './model';

/**
 * The class name added for a file conflict.
 */
const FILE_CONFLICT_CLASS = 'jp-mod-conflict';


/**
 * Open a file using a dialog.
 */
export
function openWithDialog(path: string, manager: DocumentManager, host?: HTMLElement): Promise<Widget> {
  let handler: OpenWithHandler;
  return manager.listSessions().then(sessions => {
    handler = new OpenWithHandler(path, manager, sessions);
    return showDialog({
      title: 'Open File',
      host,
      body: handler.node,
      okText: 'OPEN'
    });
  }).then(result => {
    if (result.text === 'OPEN') {
      return handler.open();
    }
  });
}


/**
 * Create a new file using a dialog.
 */
export
function createNewDialog(model: FileBrowserModel, manager: DocumentManager, host?: HTMLElement): Promise<Widget> {
  let handler: CreateNewHandler;
  return manager.listSessions().then(sessions => {
    handler = new CreateNewHandler(model, manager, sessions);
    return showDialog({
      title: 'Create New File',
      host,
      body: handler.node,
      okText: 'CREATE'
    });
  }).then(result => {
    if (result.text === 'CREATE') {
      return handler.open();
    }
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
  constructor(path: string, manager: DocumentManager, sessions: ISession.IModel[], host?: HTMLElement) {
    super();
    this._manager = manager;
    this._host = host;
    this._sessions = sessions;

    this.input.textContent = path;
    this._ext = path.split('.').pop();

    this.populateFactories();
    this.widgetDropdown.onchange = this.widgetChanged.bind(this);
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this._host = null;
    this._manager = null;
    this._sessions = null;
    super.dispose();
  }

  /**
   * Get the input text node.
   */
  get input(): HTMLElement {
    return this.node.firstChild as HTMLElement;
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
   * Open the file and return the document widget.
   */
  open(): Widget {
    let path = this.input.textContent;
    let widgetName = this.widgetDropdown.value;
    let kernelValue = this.kernelDropdown.value;
    let kernelId: IKernel.IModel;
    if (kernelValue !== 'null') {
      kernelId = JSON.parse(kernelValue) as IKernel.IModel;
    }
    return this._manager.open(path, widgetName, kernelId);
  }

  /**
   * Populate the widget factories.
   */
  protected populateFactories(): void {
    let factories = this._manager.registry.listWidgetFactories(this._ext);
    let widgetDropdown = this.widgetDropdown;
    for (let factory of factories) {
      let option = document.createElement('option');
      option.text = factory;
      widgetDropdown.appendChild(option);
    }
    this.widgetChanged();
  }

  /**
   * Handle a change to the widget.
   */
  protected widgetChanged(): void {
    let widgetName = this.widgetDropdown.value;
    let preference = this._manager.registry.getKernelPreference(
      this._ext, widgetName
    );
    updateKernels(preference, this.kernelDropdown, this._manager.kernelspecs, this._sessions);
  }

  private _ext = '';
  private _manager: DocumentManager = null;
  private _host: HTMLElement = null;
  private _sessions: ISession.IModel[] = null;
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
  constructor(model: FileBrowserModel, manager: DocumentManager, sessions: ISession.IModel[]) {
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
   * Open the file and return the document widget.
   */
  open(): Widget {
    let path = this.input.textContent;
    let widgetName = this.widgetDropdown.value;
    let kernelValue = this.kernelDropdown.value;
    let kernelId: IKernel.IModel;
    if (kernelValue !== 'null') {
      kernelId = JSON.parse(kernelValue) as IKernel.IModel;
    }
    return this._manager.createNew(path, widgetName, kernelId);
  }

  /**
   * Handle a change to the input.
   */
  protected inputChanged(): void {
    let path = this.input.value;
    for (let item of this._model.items) {
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
   * Populate the file types.
   */
  protected populateFileTypes(): void {
    let fileTypes = this._manager.registry.listFileTypes();
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
    let factories = this._manager.registry.listWidgetFactories(ext);
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
    let preference = this._manager.registry.getKernelPreference(ext, widgetName);
    updateKernels(preference, this.kernelDropdown, this._manager.kernelspecs, this._sessions);
  }

  private _model: FileBrowserModel = null;
  private _manager: DocumentManager = null;
  private _sessions: ISession.IModel[] = null;
  private _sentinal = 'UNKNOWN_EXTENSION';
  private _prevExt = '';
  private _extensions: string[] = [];
}


/**
 * Update a kernel listing based on a kernel preference.
 */
function updateKernels(preference: IKernelPreference, node: HTMLSelectElement, specs: IKernel.ISpecModels, running: ISession.IModel[]): void {
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
