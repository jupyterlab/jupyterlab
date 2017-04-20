// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ClientSession, Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  PathExt
} from '@jupyterlab/coreutils';

import {
  Contents, IServiceManager, Kernel
} from '@jupyterlab/services';

import {
 each, IIterator
} from '@phosphor/algorithm';

import {
  Widget
} from '@phosphor/widgets';

import {
  DocumentManager
} from './';


/**
 * The class name added to file dialogs.
 */
const FILE_DIALOG_CLASS = 'jp-FileDialog';

/**
 * The class name added for a file conflict.
 */
const FILE_CONFLICT_CLASS = 'jp-mod-conflict';


/**
 * A stripped-down interface for a file container.
 */
export
interface IFileContainer {
  /**
   * Returns an iterator over the container's items.
   */
  items(): IIterator<Contents.IModel>;

  /**
   * The current working directory of the file container.
   */
  path: string;
}


/**
 * Create a file using a file creator.
 */
export
function createFromDialog(container: IFileContainer, manager: DocumentManager, creatorName: string): Promise<Widget> {
  let handler = new CreateFromHandler(container, manager, creatorName);
  return manager.services.ready.then(() => {
    return handler.populate();
  }).then(() => {
    return handler.showDialog();
  });
}


/**
 * Create a new untitled file.
 */
export
function newUntitled(manager: DocumentManager, options: Contents.ICreateOptions): Promise<Contents.IModel> {
  if (options.type === 'file') {
    options.ext = options.ext || '.txt';
  }

  return manager.services.contents.newUntitled(options);
}


/**
 * Rename a file with optional dialog.
 */
export
function renameFile(manager: DocumentManager, container: IFileContainer, oldPath: string, newPath: string): Promise<Contents.IModel> {
  const rename = Private.rename(manager.services, container, oldPath, newPath);
  return rename.catch(error => {
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
          return Private.overwrite(oldPath, newPath);
        }
      });
    } else {
      throw error;
    }
  });
}


/**
 * An error message dialog to show in the filebrowser widget.
 */
export
function showErrorMessage(title: string, error: Error): Promise<void> {
  console.error(error);
  let options = {
    title: title,
    body: error.message || `File ${title}`,
    buttons: [Dialog.okButton()],
    okText: 'DISMISS'
  };
  return showDialog(options).then(() => { /* no-op */ });
}


/**
 * A widget used to create a file using a creator.
 */
class CreateFromHandler extends Widget {
  /**
   * Construct a new "create from" dialog.
   */
  constructor(container: IFileContainer, manager: DocumentManager, creatorName: string) {
    super({ node: Private.createCreateFromNode() });
    this.addClass(FILE_DIALOG_CLASS);
    this._container = container;
    this._manager = manager;
    this._creatorName = creatorName;

    // Check for name conflicts when the inputNode changes.
    this.inputNode.addEventListener('input', () => {
      let value = this.inputNode.value;
      if (value !== this._orig) {
        each(this._container.items(), item => {
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
    this._container = null;
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
      // this._model.deleteFile('/' + this._orig.path);
      return null;
    });
  }

  /**
   * Populate the create from widget.
   */
  populate(): Promise<void> {
    let container = this._container;
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
    let preference = registry.getKernelPreference(
      ext, widgetName, { name: kernelName }
    );
    if (!preference.canStart) {
      this.node.removeChild(this.kernelDropdownNode.previousSibling);
      this.node.removeChild(this.kernelDropdownNode);
    } else {
      let services = this._manager.services;
      ClientSession.populateKernelSelect(this.kernelDropdownNode, {
        specs: services.specs,
        sessions: services.sessions.running(),
        preference
      });
    }

    let path = container.path;
    return newUntitled(manager, { ext, path, type }).then(contents => {
      let value = this.inputNode.value = contents.name;
      this.inputNode.setSelectionRange(0, value.length - ext.length);
      this._orig = contents;
    });
  }

  /**
   * Open the file and return the document widget.
   */
  private _open(): Promise<Widget> {
    let oldPath = this._orig.name;
    let file = this.inputNode.value;
    let widgetName = this._widgetName;
    let kernelValue = this.kernelDropdownNode ? this.kernelDropdownNode.value
      : 'null';
    let kernelId: Kernel.IModel;
    if (kernelValue !== 'null') {
      kernelId = JSON.parse(kernelValue) as Kernel.IModel;
    }
    if (file !== oldPath) {
      let promise = renameFile(this._manager, this._container, oldPath, file);
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

  private _container: IFileContainer = null;
  private _creatorName: string;
  private _manager: DocumentManager;
  private _orig: Contents.IModel = null;
  private _widgetName: string;
}


/**
 * A namespace for private data.
 */
namespace Private {
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
   * Overwrite a file.
   *
   * @param path - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @returns A promise containing the new file contents model.
   */
  export
  function overwrite(path: string, newPath: string): Promise<Contents.IModel> {
    return Promise.reject('temporary');
  }

  /**
   * Rename a file or directory.
   *
   * @param path - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @returns A promise containing the new file contents model.  The promise
   *   will reject if the newPath already exists.  Use [[overwrite]] to
   *   overwrite a file.
   */
  export
  function rename(manager: IServiceManager, container: IFileContainer, path: string, newPath: string): Promise<Contents.IModel> {
    const base = container.path;

    // Normalize paths.
    path = PathExt.resolve(base, path);
    newPath = PathExt.resolve(base, newPath);

    return manager.contents.rename(path, newPath);
  }
}
