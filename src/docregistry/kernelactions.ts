// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Widget
} from '@phosphor/widgets';

import {
  showDialog, cancelButton, warnButton
} from '../common/dialog';

import {
  DocumentRegistry
} from '.'


/**
 * Restart a kernel after presenting a dialog.
 *
 * @param owner: The kernel owner.
 *
 * @returns A promise that resolves to `true` the user elects to restart.
 *
 * #### Notes
 * This is a no-op if there is no kernel.
 */
export
function restartKernel(owner: DocumentRegistry.IKernelOwner): Promise<boolean> {
  if (!owner.kernel) {
    return owner.startDefaultKernel().then(() => true);
  }
  return showDialog({
    title: 'Restart Kernel?',
    body: 'Do you want to restart the current kernel? All variables will be lost.',
    buttons: [cancelButton, warnButton]
  }).then(result => {
    if (!owner.kernel.isDisposed && result.text === 'OK') {
      return owner.kernel.restart().then(() => true);
    } else {
      return false;
    }
  });
}
