// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';


/**
 * The class name added to FileBrowser instances.
 */
export
const FILE_BROWSER_CLASS = 'jp-FileBrowser';

/**
 * The class name added to drop targets.
 */
export
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

/**
 * The class name added to selected rows.
 */
export
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * The mime type for a contents drag object.
 */
export
const CONTENTS_MIME = 'application/x-jupyter-icontents';


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
