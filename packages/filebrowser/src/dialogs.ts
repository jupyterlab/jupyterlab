// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, Kernel, Session
} from '@jupyterlab/services';

import {
  IterableOrArrayLike, each
} from '@phosphor/algorithm';

import {
  Widget
} from '@phosphor/widgets';

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry, populateKernels
} from '@jupyterlab/docregistry';

import {
  FileBrowserModel
} from './model';


/**
 * The class name added to file dialogs.
 */
const FILE_DIALOG_CLASS = 'jp-FileDialog';

/**
 * The class name added for a file conflict.
 */
const FILE_CONFLICT_CLASS = 'jp-mod-conflict';


/**
 * Create a file using a file creator.
 */
export
function createFromDialog(model: FileBrowserModel, manager: DocumentManager, creatorName: string): Promise<Widget> {
  let handler = new CreateFromHandler(model, manager, creatorName);
  return manager.services.ready.then(() => {
    return handler.populate();
  }).then(() => {
    return handler.showDialog();
  });
}


/**
 * Open a file using a dialog.
 */
export
function openWithDialog(path: string, manager: DocumentManager, host?: HTMLElement): Promise<Widget> {
  let handler: OpenWithHandler;
  return manager.services.ready.then(() => {
    handler = new OpenWithHandler(path, manager);
    return showDialog({
      title: 'Open File',
      body: handler.node,
      primaryElement: handler.inputNode,
      buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'OPEN' })]
    });
  }).then(result => {
    if (result.accept) {
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
  return manager.services.ready.then(() => {
    handler = new CreateNewHandler(model, manager);
    return showDialog({
      title: 'Create New File',
      host,
      body: handler.node,
      primaryElement: handler.inputNode,
      buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'OPEN' })]
    });
  }).then(result => {
    if (result.accept) {
      return handler.open();
    }
  });
}


/**
 * Rename a file with optional dialog.
 */
export
function renameFile(model: FileBrowserModel, oldPath: string, newPath: string): Promise<Contents.IModel> {
  return model.rename(oldPath, newPath).catch(error => {
    if (error.xhr) {
      error.message = `${error.xhr.statusText} ${error.xhr.status}`;
    }
    let overwriteBtn = Dialog.warnButton({ label: 'OVERWRITE' });
    if (error.message.indexOf('409') !== -1) {
      let options = {
        title: 'Overwrite file?',
        body: `"${newPath}" already exists, overwrite?`,
        buttons: [Dialog.cancelButton(), overwriteBtn]
      };
      return showDialog(options).then(button => {
        if (button.accept) {
          return model.overwrite(oldPath, newPath);
        }
      });
    } else {
      throw error;
    }
  });
}


/**
 * A widget used to open files with a specific widget/kernel.
 */
class OpenWithHandler extends Widget {
  /**
   * Construct a new "open with" dialog.
   */
  constructor(path: string, manager: DocumentManager) {
    super({ node: Private.createOpenWithNode() });
    this._manager = manager;

    this.inputNode.textContent = path;
    this._ext = DocumentRegistry.extname(path);

    this.populateFactories();
    this.widgetDropdown.onchange = this.widgetChanged.bind(this);
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this._manager = null;
    super.dispose();
  }

  /**
   * Get the input text node.
   */
  get inputNode(): HTMLElement {
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
  get kernelDropdownNode(): HTMLSelectElement {
    return this.node.children[2] as HTMLSelectElement;
  }

  /**
   * Open the file and return the document widget.
   */
  open(): Widget {
    let path = this.inputNode.textContent;
    let widgetName = this.widgetDropdown.value;
    let kernelValue = this.kernelDropdownNode.value;
    let kernelId: Kernel.IModel;
    if (kernelValue !== 'null') {
      kernelId = JSON.parse(kernelValue) as Kernel.IModel;
    }
    return this._manager.open(path, widgetName, kernelId);
  }

  /**
   * Populate the widget factories.
   */
  protected populateFactories(): void {
    let factories = this._manager.registry.preferredWidgetFactories(this._ext);
    let widgetDropdown = this.widgetDropdown;
    each(factories, factory => {
      let option = document.createElement('option');
      option.text = factory.name;
      widgetDropdown.appendChild(option);
    });
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
    let specs = this._manager.services.specs;
    let sessions = this._manager.services.sessions.running();
    Private.updateKernels(this.kernelDropdownNode,
      { preference, specs, sessions }
    );
  }

  private _ext = '';
  private _manager: DocumentManager = null;
}


/**
 * A widget used to create a file using a creator.
 */
class CreateFromHandler extends Widget {
  /**
   * Construct a new "create from" dialog.
   */
  constructor(model: FileBrowserModel, manager: DocumentManager, creatorName: string) {
    super({ node: Private.createCreateFromNode() });
    this.addClass(FILE_DIALOG_CLASS);
    this._model = model;
    this._manager = manager;
    this._creatorName = creatorName;

    // Check for name conflicts when the inputNode changes.
    this.inputNode.addEventListener('input', () => {
      let value = this.inputNode.value;
      if (value !== this._orig) {
        each(this._model.items(), item => {
          if (item.name === value) {
            this.addClass(FILE_CONFLICT_CLASS);
            return;
          }
        });
      }
      this.removeClass(FILE_CONFLICT_CLASS);
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this._model = null;
    this._manager = null;
    super.dispose();
  }

  /**
   * Get the input text node.
   */
  get inputNode(): HTMLInputElement {
    return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
  }

  /**
   * Get the kernel dropdown node.
   */
  get kernelDropdownNode(): HTMLSelectElement {
    return this.node.getElementsByTagName('select')[0] as HTMLSelectElement;
  }

  /**
   * Show the createNew dialog.
   */
  showDialog(): Promise<Widget> {
    return showDialog({
      title: `Create New ${this._creatorName}`,
      body: this.node,
      primaryElement: this.inputNode,
      buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'CREATE' })]
    }).then(result => {
      if (result.accept) {
        return this._open().then(widget => {
          if (!widget) {
            return this.showDialog();
          }
          return widget;
        });
      }
      this._model.deleteFile('/' + this._orig.path);
      return null;
    });
  }

  /**
   * Populate the create from widget.
   */
  populate(): Promise<void> {
    let model = this._model;
    let manager = this._manager;
    let registry = manager.registry;
    let creator = registry.getCreator(this._creatorName);
    if (!creator) {
      return Promise.reject(`Creator not registered: ${this._creatorName}`);
    }
    let { fileType, widgetName, kernelName } = creator;
    let fType = registry.getFileType(fileType);
    let ext = '.txt';
    let type: Contents.ContentType = 'file';
    if (fType) {
      ext = fType.extension;
      type = fType.contentType || 'file';
    }
    if (!widgetName || widgetName === 'default') {
      this._widgetName = widgetName = registry.defaultWidgetFactory(ext).name;
    }

    // Handle the kernel preferences.
    let preference = registry.getKernelPreference(ext, widgetName);
    if (preference.canStartKernel) {
      let specs = this._manager.services.specs;
      let sessions = this._manager.services.sessions.running();
      let preferredKernel = kernelName;
      Private.updateKernels(this.kernelDropdownNode,
        { specs, sessions, preferredKernel, preference }
      );
    } else {
      this.node.removeChild(this.kernelDropdownNode.previousSibling);
      this.node.removeChild(this.kernelDropdownNode);
    }

    return model.newUntitled({ ext, type }).then(contents => {
      let value = this.inputNode.value = contents.name;
      this.inputNode.setSelectionRange(0, value.length - ext.length);
      this._orig = contents;
    });
  }

  /**
   * Open the file and return the document widget.
   */
  private _open(): Promise<Widget> {
    let file = this.inputNode.value;
    let widgetName = this._widgetName;
    let kernelValue = this.kernelDropdownNode ? this.kernelDropdownNode.value
      : 'null';
    let kernelId: Kernel.IModel;
    if (kernelValue !== 'null') {
      kernelId = JSON.parse(kernelValue) as Kernel.IModel;
    }
    if (file !== this._orig.name) {
      let promise = renameFile(this._model, this._orig.name, file);
      return promise.then((contents: Contents.IModel) => {
        if (!contents) {
          return null;
        }
        return this._manager.open(contents.path, widgetName, kernelId);
      });
    }
    let path = this._orig.path;
    return Promise.resolve(this._manager.createNew(path, widgetName, kernelId));
  }

  private _model: FileBrowserModel = null;
  private _creatorName: string;
  private _widgetName: string;
  private _orig: Contents.IModel = null;
  private _manager: DocumentManager;
}


/**
 * A widget used to create new files.
 */
class CreateNewHandler extends Widget {
  /**
   * Construct a new "create new" dialog.
   */
  constructor(model: FileBrowserModel, manager: DocumentManager) {
    super({ node: Private.createCreateNewNode() });
    this._model = model;
    this._manager = manager;

    // Create a file name based on the current time.
    let time = new Date();
    time.setMinutes(time.getMinutes() - time.getTimezoneOffset());
    let name = time.toJSON().slice(0, 10);
    name += '-' + time.getHours() + time.getMinutes() + time.getSeconds();
    this.inputNode.value = name + '.txt';
    this.inputNode.setSelectionRange(0, name.length);

    // Check for name conflicts when the inputNode changes.
    this.inputNode.addEventListener('input', () => {
      this.inputNodeChanged();
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
    this._manager = null;
    super.dispose();
  }

  /**
   * Get the input text node.
   */
  get inputNode(): HTMLInputElement {
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
  get kernelDropdownNode(): HTMLSelectElement {
    return this.node.children[3] as HTMLSelectElement;
  }

  /**
   * Get the current extension for the file.
   */
  get ext(): string {
    return DocumentRegistry.extname(this.inputNode.value);
  }

  /**
   * Open the file and return the document widget.
   */
  open(): Widget {
    let path = this.inputNode.textContent;
    let widgetName = this.widgetDropdown.value;
    let kernelValue = this.kernelDropdownNode.value;
    let kernelId: Kernel.IModel;
    if (kernelValue !== 'null') {
      kernelId = JSON.parse(kernelValue) as Kernel.IModel;
    }
    return this._manager.createNew(path, widgetName, kernelId);
  }

  /**
   * Handle a change to the inputNode.
   */
  protected inputNodeChanged(): void {
    let path = this.inputNode.value;
    each(this._model.items(), item => {
      if (item.path === path) {
        this.addClass(FILE_CONFLICT_CLASS);
        return;
      }
    });
    let ext = this.ext;
    if (ext === this._prevExt) {
      return;
    }
    // Update the file type dropdown and the factories.
    if (this._extensions.indexOf(ext) === -1) {
      this.fileTypeDropdown.value = this._sentinel;
    } else {
      this.fileTypeDropdown.value = ext;
    }
    this.populateFactories();
  }

  /**
   * Populate the file types.
   */
  protected populateFileTypes(): void {
    let dropdown = this.fileTypeDropdown;
    let option = document.createElement('option');
    option.text = 'File';
    option.value = this._sentinel;

    each(this._manager.registry.fileTypes(), ft => {
      option = document.createElement('option');
      option.text = `${ft.name} (${ft.extension})`;
      option.value = ft.extension;
      dropdown.appendChild(option);
      this._extensions.push(ft.extension);
    });
    if (this.ext in this._extensions) {
      dropdown.value = this.ext;
    } else {
      dropdown.value = this._sentinel;
    }
  }

  /**
   * Populate the widget factories.
   */
  protected populateFactories(): void {
    let ext = this.ext;
    let factories = this._manager.registry.preferredWidgetFactories(ext);
    let widgetDropdown = this.widgetDropdown;
    each(factories, factory => {
      let option = document.createElement('option');
      option.text = factory.name;
      widgetDropdown.appendChild(option);
    });
    this.widgetDropdownChanged();
    this._prevExt = ext;
  }

  /**
   * Handle changes to the file type dropdown.
   */
  protected fileTypeChanged(): void {
    // Update the current inputNode.
    let oldExt = this.ext;
    let newExt = this.fileTypeDropdown.value;
    if (oldExt === newExt || newExt === '') {
      return;
    }
    let oldName = this.inputNode.value;
    let base = oldName.slice(0, oldName.length - oldExt.length - 1);
    this.inputNode.value = base + newExt;
  }

  /**
   * Handle a change to the widget dropdown.
   */
  protected widgetDropdownChanged(): void {
    let ext = this.ext;
    let widgetName = this.widgetDropdown.value;
    let manager = this._manager;
    let preference = manager.registry.getKernelPreference(ext, widgetName);
    let specs = manager.services.specs;
    let sessions = manager.services.sessions.running();
    Private.updateKernels(this.kernelDropdownNode,
      { preference, sessions, specs }
    );
  }

  private _model: FileBrowserModel = null;
  private _manager: DocumentManager = null;
  private _sentinel = 'UNKNOWN_EXTENSION';
  private _prevExt = '';
  private _extensions: string[] = [];
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for an open with handler.
   */
  export
  function createOpenWithNode(): HTMLElement {
    let body = document.createElement('div');
    let nameTitle = document.createElement('label');
    nameTitle.textContent = 'File Name';
    let name = document.createElement('div');
    let widgetTitle = document.createElement('label');
    widgetTitle.textContent = 'Widget Type';
    let widgetDropdown = document.createElement('select');
    let kernelTitle = document.createElement('label');
    kernelTitle.textContent = 'Kernel';
    let kernelDropdownNode = document.createElement('select');
    body.appendChild(nameTitle);
    body.appendChild(name);
    body.appendChild(widgetTitle);
    body.appendChild(widgetDropdown);
    body.appendChild(kernelTitle);
    body.appendChild(kernelDropdownNode);
    return body;
  }

  /**
   * Create the node for a create new handler.
   */
  export
  function createCreateNewNode(): HTMLElement {
    let body = document.createElement('div');
    let nameTitle = document.createElement('label');
    nameTitle.textContent = 'File Name';
    let name = document.createElement('input');
    let typeTitle = document.createElement('label');
    typeTitle.textContent = 'File Type';
    let fileTypeDropdown = document.createElement('select');
    let widgetTitle = document.createElement('label');
    widgetTitle.textContent = 'Widget Type';
    let widgetDropdown = document.createElement('select');
    let kernelTitle = document.createElement('label');
    kernelTitle.textContent = 'Kernel';
    let kernelDropdownNode = document.createElement('select');
    body.appendChild(nameTitle);
    body.appendChild(name);
    body.appendChild(typeTitle);
    body.appendChild(fileTypeDropdown);
    body.appendChild(widgetTitle);
    body.appendChild(widgetDropdown);
    body.appendChild(kernelTitle);
    body.appendChild(kernelDropdownNode);
    return body;
  }

  /**
   * Create the node for a create from handler.
   */
  export
  function createCreateFromNode(): HTMLElement {
    let body = document.createElement('div');
    let nameTitle = document.createElement('label');
    nameTitle.textContent = 'File Name';
    let name = document.createElement('input');
    let kernelTitle = document.createElement('label');
    kernelTitle.textContent = 'Kernel';
    let kernelDropdownNode = document.createElement('select');
    body.appendChild(nameTitle);
    body.appendChild(name);
    body.appendChild(kernelTitle);
    body.appendChild(kernelDropdownNode);
    return body;
  }

  /**
   * Update a kernel listing based on a kernel preference.
   */
  export
  function updateKernels(node: HTMLSelectElement, options: IKernelOptions): void {
    let { preference, specs, sessions, preferredKernel } = options;
    if (!preference.canStartKernel) {
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
      node.disabled = true;
      return;
    }
    // Bail if there are no kernel specs.
    if (!specs) {
      return;
    }
    let preferredLanguage = preference.language;
    node.disabled = false;

    populateKernels(node,
      { specs, sessions, preferredLanguage, preferredKernel }
    );

    // Select the "null" valued kernel if we do not prefer a kernel.
    if (!preference.preferKernel) {
      node.value = 'null';
    }
  }

  /**
   * The options for updating kernels.
   */
  export
  interface IKernelOptions {
    /**
     * The kernel preference.
     */
    preference: DocumentRegistry.IKernelPreference;

    /**
     * The kernel specs.
     */
    specs: Kernel.ISpecModels;

    /**
     * The running sessions.
     */
    sessions: IterableOrArrayLike<Session.IModel>;

    /**
     * The preferred kernel name.
     */
    preferredKernel?: string;
  }
}
