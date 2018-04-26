// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog, showErrorMessage
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
 * Rename a file with a dialog.
 */
export
function renameDialog(manager: IDocumentManager, oldPath: string): Promise<Contents.IModel | null> {
  return showDialog({
    title: 'Rename File',
    body: new RenameHandler(oldPath),
    focusNodeSelector: 'input',
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'RENAME' })]
  }).then(result => {
    if (!isValidFileName(result.value)) {
      showErrorMessage('Rename Error', Error(
          `"${result.value}" is not a valid name for a file. ` +
          `Names must have nonzero length, ` +
          `and cannot include "/", "\\", or ":"`
      ));
      return null;
    }
    let basePath = PathExt.dirname(oldPath);
    let newPath = PathExt.join(basePath, result.value);
    return renameFile(manager, oldPath, newPath);
  });
}


/**
 * Rename a file, asking for confirmation if it is overwriting another.
 */
export
function renameFile(manager: IDocumentManager, oldPath: string, newPath: string): Promise<Contents.IModel | null> {
  return manager.rename(oldPath, newPath).catch(error => {
    if (error.message.indexOf('409') === -1) {
      throw error;
    }
    return shouldOverwrite(newPath).then(value => {
      if (value) {
        return manager.overwrite(oldPath, newPath);
      }
      return Promise.reject('File not renamed');
    });
  });
}


/**
 * Ask the user whether to overwrite a file.
 */
export
function shouldOverwrite(path: string): Promise<boolean> {
  let options = {
    title: 'Overwrite file?',
    body: `"${path}" already exists, overwrite?`,
    buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'OVERWRITE' })]
  };
  return showDialog(options).then(result => {
    return Promise.resolve(result.button.accept);
  });
}

/**
 * Test whether a name is a valid file name
 *
 * Disallows "/", "\", and ":" in file names, as well as names with zero length.
 */
export
function isValidFileName(name: string): boolean {
  const validNameExp = /[\/\\:]/;
  return name.length > 0 && !validNameExp.test(name);
}


/**
 * A widget used to rename a file.
 */
class RenameHandler extends Widget {
  /**
   * Construct a new "rename" dialog.
   */
  constructor(oldPath: string) {
    super({ node: Private.createRenameNode(oldPath) });
    this.addClass(FILE_DIALOG_CLASS);
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
   * Get the value of the widget.
   */
  getValue(): string {
    return this.inputNode.value;
  }
}


/*
 * A widget used to open a file directly.
 */
class OpenDirectWidget extends Widget {
  /**
   * Construct a new open file widget.
   */
  constructor() {
    super({ node: Private.createOpenNode() });
  }

  /**
   * Get the value of the widget.
   */
  getValue(): string {
    return this.inputNode.value;
  }

  /**
   * Get the input text node.
   */
  get inputNode(): HTMLInputElement {
    return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
  }
}


/**
 * Create the node for the open handler.
 */
export
function getOpenPath(contentsManager: any): Promise<string | undefined> {
  return showDialog({
    title: 'Open File',
    body: new OpenDirectWidget(),
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'OPEN' })],
    focusNodeSelector: 'input'
  }).then( (result: any) => {
    if (result.button.label === 'OPEN') {
      return result.value;
    }
    return;
  });
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

  /**
   * Create the node for a open widget.
   */
  export
  function createOpenNode(): HTMLElement {
    let body = document.createElement('div');
    let existingLabel = document.createElement('label');
    existingLabel.textContent = 'File Path:';

    let input = document.createElement('input');
    input.value = '';
    input.placeholder = '/path/to/file';

    body.appendChild(existingLabel);
    body.appendChild(input);
    return body;
  }
}
