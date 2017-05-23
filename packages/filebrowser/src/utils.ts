// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

/**
 * An error message dialog to show in the filebrowser widget.
 */
export
function showErrorMessage(title: string, error: any): Promise<void> {
  console.error(error);
  let options = {
    title: title,
    body: error.message || `File ${title}`,
    buttons: [Dialog.okButton()],
    okText: 'DISMISS'
  };
  return showDialog(options).then(() => { /* no-op */ });
}
