// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import * as React from 'react';

/**
 * Show a dialog box reporting an error during installation of an extension.
 *
 * @param name The name of the extension
 * @param errorMessage Any error message giving details about the failure.
 */
export function reportInstallError(
  name: string,
  errorMessage?: string,
  translator?: ITranslator
): void {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const entries = [];
  entries.push(<p>{trans.__(`An error occurred installing "${name}".`)}</p>);
  if (errorMessage) {
    entries.push(
      <p>
        <span className="jp-extensionmanager-dialog-subheader">
          {trans.__('Error message:')}
        </span>
      </p>,
      <pre>{errorMessage.trim()}</pre>
    );
  }
  const body = <div className="jp-extensionmanager-dialog">{entries}</div>;
  void showDialog({
    title: trans.__('Extension Installation Error'),
    body,
    buttons: [Dialog.warnButton({ label: trans.__('Ok') })]
  });
}
