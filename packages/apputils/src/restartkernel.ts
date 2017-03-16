// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Widget
} from '@phosphor/widgets';

import {
  showDialog, Dialog
} from '.';


/**
 * Restart a kernel after presenting a dialog.
 *
 * @param kernel - The kernel to restart.
 *
 * @param host - The optional host widget that should be activated.
 *
 * @returns A promise that resolves to `true` the user elects to restart.
 *
 * #### Notes
 * This is a no-op if there is no kernel.
 */
export
function restartKernel(kernel: Kernel.IKernel, host?: Widget): Promise<boolean> {
  if (!kernel) {
    return Promise.resolve(false);
  }
  let restartBtn = Dialog.warnButton({ label: 'RESTART '});
  return showDialog({
    title: 'Restart Kernel?',
    body: 'Do you want to restart the current kernel? All variables will be lost.',
    buttons: [Dialog.cancelButton(), restartBtn]
  }).then(result => {
    if (host) {
      host.activate();
    }
    if (!kernel.isDisposed && result.accept) {
      return kernel.restart().then(() => { return true; });
    } else {
      return false;
    }
  });
}
