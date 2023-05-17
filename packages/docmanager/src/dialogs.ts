// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PathExt } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { JSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { IDocumentManager } from './';

/**
 * The class name added to file dialogs.
 */
const FILE_DIALOG_CLASS = 'jp-FileDialog';

/**
 * The class name added for the new name label in the rename dialog
 */
const RENAME_NEW_NAME_TITLE_CLASS = 'jp-new-name-title';

/**
 * A stripped-down interface for a file container.
 */
export interface IFileContainer extends JSONObject {
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
export function renameDialog(
  manager: IDocumentManager,
  context: DocumentRegistry.Context,
  translator?: ITranslator
): Promise<void | null> {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  const localPath = context.localPath.split('/');
  const fileName = localPath.pop() || context.localPath;

  return showDialog({
    title: trans.__('Rename File'),
    body: new RenameHandler(fileName),
    focusNodeSelector: 'input',
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({
        label: trans.__('Rename'),
        ariaLabel: trans.__('Rename File')
      })
    ]
  }).then(result => {
    if (!result.value) {
      return null;
    }
    if (!isValidFileName(result.value)) {
      void showErrorMessage(
        trans.__('Rename Error'),
        Error(
          trans.__(
            '"%1" is not a valid name for a file. Names must have nonzero length, and cannot include "/", "\\", or ":"',
            result.value
          )
        )
      );
      return null;
    }
    return context.rename(result.value);
  });
}

/**
 * Rename a file, asking for confirmation if it is overwriting another.
 */
export function renameFile(
  manager: IDocumentManager,
  oldPath: string,
  newPath: string
): Promise<Contents.IModel | null> {
  return manager.rename(oldPath, newPath).catch(error => {
    if (error.response.status !== 409) {
      // if it's not caused by an already existing file, rethrow
      throw error;
    }

    // otherwise, ask for confirmation
    return shouldOverwrite(newPath).then((value: boolean) => {
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
export function shouldOverwrite(
  path: string,
  translator?: ITranslator
): Promise<boolean> {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  const options = {
    title: trans.__('Overwrite file?'),
    body: trans.__('"%1" already exists, overwrite?', path),
    buttons: [
      Dialog.cancelButton(),
      Dialog.warnButton({
        label: trans.__('Overwrite'),
        ariaLabel: trans.__('Overwrite Existing File')
      })
    ]
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
export function isValidFileName(name: string): boolean {
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
    const ext = PathExt.extname(oldPath);
    const value = (this.inputNode.value = PathExt.basename(oldPath));
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

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for a rename handler.
   */
  export function createRenameNode(
    oldPath: string,
    translator?: ITranslator
  ): HTMLElement {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');

    const body = document.createElement('div');
    const existingLabel = document.createElement('label');
    existingLabel.textContent = trans.__('File Path');
    const existingPath = document.createElement('span');
    existingPath.textContent = oldPath;

    const nameTitle = document.createElement('label');
    nameTitle.textContent = trans.__('New Name');
    nameTitle.className = RENAME_NEW_NAME_TITLE_CLASS;
    const name = document.createElement('input');

    body.appendChild(existingLabel);
    body.appendChild(existingPath);
    body.appendChild(nameTitle);
    body.appendChild(name);
    return body;
  }
}
