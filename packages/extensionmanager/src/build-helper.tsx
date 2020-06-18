// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';

import { Builder } from '@jupyterlab/services';

import * as React from 'react';

/**
 * Instruct the server to perform a build
 *
 * @param builder the build manager
 */
export function doBuild(
  app: JupyterFrontEnd,
  builder: Builder.IManager
): Promise<void> {
  if (builder.isAvailable) {
    return builder
      .build()
      .then(() => {
        return showDialog({
          title: 'Build Complete',
          body: (
            <div>
              Build successfully completed, reload page?
              <br />
              You will lose any unsaved changes.
            </div>
          ),
          buttons: [
            Dialog.cancelButton({
              label: 'Reload Without Saving',
              actions: ['reload']
            }),
            Dialog.okButton({ label: 'Save and Reload' })
          ],
          hasClose: true
        });
      })
      .then(({ button: { accept, actions } }) => {
        if (accept) {
          void app.commands
            .execute('docmanager:save')
            .then(() => {
              location.reload();
            })
            .catch((err: any) => {
              void showErrorMessage('Save Failed', {
                message: <pre>{err.message}</pre>
              });
            });
        } else if (actions.includes('reload')) {
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
