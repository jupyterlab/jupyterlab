// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PathExt } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { JSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import {
  IDocumentManager,
  IDocumentManagerDialogArgs,
  IDocumentManagerDialogs
} from './';

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
 * Namespace for DocumentManagerDialogs.
 */
export namespace DocumentManagerDialogs {
  export interface IOptions {
    translator?: ITranslator;
  }
}

/**
 * Default implementation of IDocumentManagerDialogs.
 */
export class DocumentManagerDialogs implements IDocumentManagerDialogs {
  constructor(options: DocumentManagerDialogs.IOptions = {}) {
    this._translator = options.translator || nullTranslator;
  }

  /**
   * Show a dialog to rename a file.
   */
  async rename(context: DocumentRegistry.Context): Promise<void | null> {
    const trans = this._translator.load('jupyterlab');
    const localPath = context.localPath.split('/');
    const fileName = localPath.pop() || context.localPath;
    const handler = new RenameHandler(fileName, this._translator);

    const result = await showDialog({
      title: trans.__('Rename File'),
      body: handler,
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({
          label: trans.__('Rename'),
          ariaLabel: trans.__('Rename File')
        })
      ],
      focusNodeSelector: 'input'
    });

    if (!result.button.accept) {
      return null;
    }

    const newPath = result.value;

    if (!newPath || newPath === fileName) {
      return null;
    }

    if (!isValidFileName(newPath)) {
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
    return context.rename(newPath);
  }

  /**
   * Show a dialog asking whether to close a document.
   */
  async confirmClose(
    options: IDocumentManagerDialogArgs.IConfirmCloseOptions
  ): Promise<IDocumentManagerDialogArgs.IConfirmCloseResult> {
    const trans = this._translator.load('jupyterlab');
    const { fileName, isDirty } = options;

    const buttons = [
      Dialog.cancelButton(),
      Dialog.okButton({
        label: isDirty ? trans.__('Close and save') : trans.__('Close'),
        ariaLabel: isDirty
          ? trans.__('Close and save Document')
          : trans.__('Close Document')
      })
    ];
    if (isDirty) {
      buttons.splice(
        1,
        0,
        Dialog.warnButton({
          label: trans.__('Close without saving'),
          ariaLabel: trans.__('Close Document without saving')
        })
      );
    }

    const confirm = await showDialog({
      title: trans.__('Confirmation'),
      body: trans.__('Please confirm you want to close "%1".', fileName),
      checkbox: isDirty
        ? null
        : {
            label: trans.__('Do not ask me again.'),
            caption: trans.__(
              'If checked, no confirmation to close a document will be asked in the future.'
            )
          },
      buttons
    });

    const shouldClose = confirm.button.accept;
    const ignoreSave = isDirty ? confirm.button.displayType === 'warn' : true;
    const doNotAskAgain = confirm.isChecked === true;

    return { shouldClose, ignoreSave, doNotAskAgain };
  }

  /**
   * Show a dialog asking whether to save before closing a dirty document.
   */
  async saveBeforeClose(
    options: IDocumentManagerDialogArgs.ISaveBeforeCloseOptions
  ): Promise<IDocumentManagerDialogArgs.ISaveBeforeCloseResult> {
    const trans = this._translator.load('jupyterlab');
    const { fileName, writable } = options;

    const saveLabel = writable ? trans.__('Save') : trans.__('Save as');

    const result = await showDialog({
      title: trans.__('Save your work'),
      body: trans.__('Save changes in "%1" before closing?', fileName),
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({
          label: trans.__('Discard'),
          ariaLabel: trans.__('Discard changes to file')
        }),
        Dialog.okButton({ label: saveLabel })
      ]
    });

    const shouldClose = result.button.accept;
    const ignoreSave = result.button.displayType === 'warn';

    return { shouldClose, ignoreSave };
  }

  private _translator: ITranslator;
}

/**
 * Rename a file with a dialog.
 */
export function renameDialog(
  manager: IDocumentManager,
  context: DocumentRegistry.Context,
  translator?: ITranslator,
  dialogs?: IDocumentManagerDialogs
): Promise<void | null> {
  if (dialogs) {
    return dialogs.rename(context);
  }
  const newDialogs = new DocumentManagerDialogs({ translator: translator });
  return newDialogs.rename(context);
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
  constructor(oldPath: string, translator?: ITranslator) {
    super({ node: Private.createRenameNode(oldPath, translator) });
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
