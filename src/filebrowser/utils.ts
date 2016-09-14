// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IContents
} from 'jupyter-js-services';

import {
  okButton, showDialog
} from '../dialog';

import {
  FileBrowserModel
} from './model';

export * from '../utils';


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
function showErrorMessage(host: Widget, title: string, error: Error): Promise<void> {
  console.error(error);
  if (!host.isAttached) {
    return;
  }
  // Find the file browser node.
  let node = host.node;
  while (!node.classList.contains(FILE_BROWSER_CLASS)) {
    node = node.parentElement;
  }
  let options = {
    title: title,
    body: error.message || `File ${title}`,
    buttons: [okButton],
    okText: 'DISMISS'
  };
  return showDialog(options).then(() => { /* no-op */ });
}

/**
 * Create promises for renaming files, where the user is prompted to
 * overwrite existing files.
 */
export
function moveConditionalOverwrite(
    destinationPath: string,
    sourceNames: string[],
    model: FileBrowserModel): Promise<IContents.IModel>[] {
  let promises: Promise<IContents.IModel>[] = [];
  for (let name of sourceNames) {
    let newPath = destinationPath + name;
    promises.push(model.rename(name, newPath).catch(error => {
      if (error.xhr) {
        const xhr = error.xhr as XMLHttpRequest;
        error.message = `${xhr.statusText} ${xhr.status}`;
      }
      if (error.message.indexOf('409') !== -1) {
        let options = {
          title: 'Overwrite file?',
          body: `"${newPath}" already exists, overwrite?`,
          okText: 'OVERWRITE'
        };
        return showDialog(options).then(button => {
          if (button.text === 'OVERWRITE') {
            return model.deleteFile(newPath).then(() => {
              return model.rename(name, newPath);
            });
          }
        });
      }
    }));
  }
  return promises;
}
