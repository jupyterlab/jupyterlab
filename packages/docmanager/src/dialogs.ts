// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog,
  InputDialog,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { JSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { IDocumentManager, IDocumentManagerDialogs } from './';

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
   * Ask user whether to reload from disk.
   */
  async reload(
    options: IDocumentManagerDialogs.Reload.IOptions
  ): Promise<IDocumentManagerDialogs.Reload.IResult> {
    const trans = this._translator.load('jupyterlab');
    const result = await showDialog({
      title: trans.__('Reload %1 from Disk', options.type),
      body: trans.__(
        'Are you sure you want to reload the %1 from the disk?',
        options.type
      ),
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: trans.__('Reload') })
      ]
    });
    return { shouldReload: !!result.button.accept };
  }

  /**
   * Ask user whether to delete a file.
   */
  async delete(
    options: IDocumentManagerDialogs.Delete.IOptions
  ): Promise<IDocumentManagerDialogs.Delete.IResult> {
    const trans = this._translator.load('jupyterlab');
    const result = await showDialog({
      title: trans.__('Delete'),
      body: trans.__('Are you sure you want to delete %1', options.path),
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: trans.__('Delete') })
      ]
    });
    return { shouldDelete: !!result.button.accept };
  }

  /**
   * Ask the user to select a checkpoint to revert to.
   */
  async chooseCheckpoint(
    options: IDocumentManagerDialogs.ChooseCheckpoint.IOptions
  ): Promise<IDocumentManagerDialogs.ChooseCheckpoint.IResult> {
    const trans = this._translator.load('jupyterlab');
    const items = options.checkpoints.map((checkpoint, index) => {
      const isoDate = new Date(checkpoint.last_modified).toISOString();
      return `${index}. ${isoDate}`;
    });
    const selection = await InputDialog.getItem({
      items,
      title: trans.__('Choose a checkpoint')
    });
    if (!selection.value) {
      return { checkpoint: undefined };
    }
    const idx = parseInt(selection.value.split('.', 1)[0], 10);
    const checkpoint = options.checkpoints[idx];
    return { checkpoint };
  }

  /**
   * Ask the user to confirm reverting to a checkpoint.
   */
  async revert(
    options: IDocumentManagerDialogs.Revert.IOptions
  ): Promise<IDocumentManagerDialogs.Revert.IResult> {
    const trans = this._translator.load('jupyterlab');

    // Build a confirmation body similar to the extension's RevertConfirmWidget
    const body = document.createElement('div');
    const confirmMessage = document.createElement('p');
    const confirmText = document.createTextNode(
      trans.__(
        'Are you sure you want to revert the %1 to checkpoint? ',
        options.fileType
      )
    );
    const cannotUndoText = document.createElement('strong');
    cannotUndoText.textContent = trans.__('This cannot be undone.');

    confirmMessage.appendChild(confirmText);
    confirmMessage.appendChild(cannotUndoText);

    const lastCheckpointMessage = document.createElement('p');
    const lastCheckpointText = document.createTextNode(
      trans.__('The checkpoint was last updated at: ')
    );
    const lastCheckpointDate = document.createElement('p');
    const date = new Date(options.checkpoint.last_modified);
    lastCheckpointDate.style.textAlign = 'center';
    lastCheckpointDate.textContent =
      Time.format(date) + ' (' + Time.formatHuman(date) + ')';

    lastCheckpointMessage.appendChild(lastCheckpointText);
    lastCheckpointMessage.appendChild(lastCheckpointDate);

    body.appendChild(confirmMessage);
    body.appendChild(lastCheckpointMessage);

    const result = await showDialog({
      title: trans.__('Revert %1 to checkpoint', options.fileType),
      body: new Widget({ node: body }),
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({
          label: trans.__('Revert'),
          ariaLabel: trans.__('Revert to Checkpoint')
        })
      ]
    });
    return { shouldRevert: !!result.button.accept };
  }

  /**
   * Prompt to rename on first save.
   */
  async renameOnSave(
    options: IDocumentManagerDialogs.RenameOnSave.IOptions
  ): Promise<IDocumentManagerDialogs.RenameOnSave.IResult> {
    const trans = this._translator.load('jupyterlab');
    const oldName = options.name || '';
    const selectionRange = oldName.length - PathExt.extname(oldName).length;
    const result = await InputDialog.getText({
      title: trans.__('Rename file'),
      okLabel: trans.__('Rename and Save'),
      placeholder: trans.__('File name'),
      text: oldName,
      selectionRange,
      checkbox: {
        label: trans.__('Do not ask for rename on first save.'),
        caption: trans.__(
          'If checked, you will not be asked to rename future untitled files when saving them.'
        )
      }
    });

    return {
      accepted: !!result.button.accept,
      newName: result.value === null ? undefined : result.value,
      doNotAskAgain:
        typeof result.isChecked === 'boolean' ? result.isChecked : undefined
    };
  }

  /**
   * Show a dialog asking whether to close a document.
   */
  async confirmClose(
    options: IDocumentManagerDialogs.ConfirmClose.IOptions
  ): Promise<IDocumentManagerDialogs.ConfirmClose.IResult> {
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
    options: IDocumentManagerDialogs.SaveBeforeClose.IOptions
  ): Promise<IDocumentManagerDialogs.SaveBeforeClose.IResult> {
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
 *
 * @deprecated You should use {@link DocumentManagerDialogs.rename}
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
