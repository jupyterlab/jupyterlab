// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';

import { Builder } from '@jupyterlab/services';

import * as React from 'react';

/**
 * Instruct the server to perform a build
 *
 * @param builder the build manager
 */
export function doBuild(builder: Builder.IManager): Promise<void> {
  if (builder.isAvailable) {
    return builder
      .build()
      .then(() => {
        return showDialog({
          title: 'Build Complete',
          body: 'Build successfully completed, reload page?',
          buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({ label: 'Reload' })
          ]
        });
      })
      .then(result => {
        if (result.button.accept) {
          location.reload();
        }
      })
      .catch(err => {
        void showDialog({
          title: 'Build Failed',
          body: <pre>{err.message}</pre>
        });
      });
  }
  return Promise.resolve();
}
