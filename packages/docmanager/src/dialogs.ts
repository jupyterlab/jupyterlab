// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  PathExt
} from '@jupyterlab/coreutils';

import {
  Contents
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  IDocumentManager
} from './';


/**
 * The class name added to file dialogs.
 */
const FILE_DIALOG_CLASS = 'jp-FileDialog';

/**
 * The class name added for the new name label in the rename dialog
 */
const RENAME_NEWNAME_TITLE_CLASS = 'jp-new-name-title';

/**
 * A stripped-down interface for a file container.
 */
export
interface IFileContainer extends JSONObject {
  /**
   * The list of item names in the current working directory.
   */
  items: string[];
  /**
   * The current working directory of the file container.
   */
  path: string;
}


/**
 * Rename a file with an optional dialog.
 */
export
function renameDialog(manager: IDocumentManager, oldPath: string): Promise<Contents.IModel | null> {
  return (new RenameHandler(manager, oldPath)).showDialog();
}


/**
 * Rename a file with optional dialog.
 */
export
function renameFile(manager: IDocumentManager, oldPath: string, newPath: string): Promise<Contents.IModel | null> {
  return manager.rename(oldPath, newPath).catch(error => {
    if (error.xhr) {
      error.message = `${error.xhr.statusText} ${error.xhr.status}`;
    }
    if (error.message.indexOf('409') === -1) {
      throw error;
    }
    let options = {
      title: 'Overwrite file?',
      body: `"${newPath}" already exists, overwrite?`,
      buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'OVERWRITE' })]
    };
    return showDialog(options).then(button => {
      if (!button.accept) {
        return Promise.resolve(null);
      }
      return manager.overwrite(oldPath, newPath);
    });
  });
}


/**
 * An error message dialog to upon document manager errors.
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
 * A widget used to rename a file.
 */
class RenameHandler extends Widget {
  /**
   * Construct a new "rename" dialog.
   */
  constructor(manager: IDocumentManager, oldPath: string) {
    super({ node: Private.createRenameNode(oldPath) });
    this.addClass(FILE_DIALOG_CLASS);
    this._manager = manager;
    this._oldPath = oldPath;
    let ext = PathExt.extname(oldPath);
    let value = this.inputNode.value = PathExt.basename(oldPath);
    this.inputNode.setSelectionRange(0, value.length - ext.length);
  }

  /**
   * Get the input text node.
   */
  get inputNode(): HTMLInputElement {
    return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
  }

  /**
   * Show the rename dialog.
   */
  showDialog(): Promise<Contents.IModel | null> {
    return showDialog({
      title: 'Rename File',
      body: this.node,
      primaryElement: this.inputNode,
      buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'RENAME' })]
    }).then(result => {
      if (!result.accept || !this.inputNode.value) {
        return null;
      }
      let basePath = PathExt.dirname(this._oldPath);
      let newPath = PathExt.join(basePath, this.inputNode.value);
      return renameFile(this._manager, this._oldPath, newPath);
    });
  }

  private _oldPath: string;
  private _manager: IDocumentManager;
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for a rename handler.
   */
  export
  function createRenameNode(oldPath: string): HTMLElement {
    let body = document.createElement('div');
    let existingLabel = document.createElement('label');
    existingLabel.textContent = 'File Path';
    let existingPath = document.createElement('span');
    existingPath.textContent = oldPath;

    let nameTitle = document.createElement('label');
    nameTitle.textContent = 'New Name';
    nameTitle.className = RENAME_NEWNAME_TITLE_CLASS;
    let name = document.createElement('input');

    body.appendChild(existingLabel);
    body.appendChild(existingPath);
    body.appendChild(nameTitle);
    body.appendChild(name);
    return body;
  }
}
