// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';

import { Builder } from '@jupyterlab/services';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import * as React from 'react';

/**
 * Instruct the server to perform a build
 *
 * @param builder the build manager
 */
export function doBuild(
  app: JupyterFrontEnd,
  builder: Builder.IManager,
  translator?: ITranslator
): Promise<void> {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  if (builder.isAvailable) {
    return builder
      .build()
      .then(() => {
        return showDialog({
          title: trans.__('Build Complete'),
          body: (
            <div>
              {trans.__('Build successfully completed, reload page?')}
              <br />
              {trans.__('You will lose any unsaved changes.')}
            </div>
          ),
          buttons: [
            Dialog.cancelButton({
              label: trans.__('Reload Without Saving'),
              actions: ['reload']
            }),
            Dialog.okButton({ label: trans.__('Save and Reload') })
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
              void showErrorMessage(trans.__('Save Failed'), {
                message: <pre>{err.message}</pre>
              });
            });
        } else if (actions.includes('reload')) {
          location.reload();
        }
      })
      .catch(err => {
        void showDialog({
          title: trans.__('Build Failed'),
          body: <pre>{err.message}</pre>
        });
      });
  }
  return Promise.resolve();
}
