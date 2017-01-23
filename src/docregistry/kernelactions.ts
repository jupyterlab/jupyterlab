// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  showDialog, cancelButton, warnButton
} from '../common/dialog';


/**
 * Restart a kernel after presenting a dialog.
 *
 * @param kernel - The kernel to restart.
 *
 * @param host - The optional host element for the dialog.
 *
 * @returns A promise that resolves to `true` the user elects to restart.
 *
 * #### Notes
 * This is a no-op if there is no kernel.
 */
export
function restartKernel(kernel: Kernel.IKernel, host?: HTMLElement): Promise<boolean> {
  if (!kernel) {
    return Promise.resolve(false);
  }
  return showDialog({
    title: 'Restart Kernel?',
    body: 'Do you want to restart the current kernel? All variables will be lost.',
    buttons: [cancelButton, warnButton]
  }).then(result => {
    if (!kernel.isDisposed && result.text === 'OK') {
      return kernel.restart().then(() => { return true; });
    } else {
      return false;
    }
  });
}
