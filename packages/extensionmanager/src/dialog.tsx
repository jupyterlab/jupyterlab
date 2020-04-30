// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';

import * as React from 'react';

/**
 * Show a dialog box reporting an error during installation of an extension.
 *
 * @param name The name of the extension
 * @param errorMessage Any error message giving details about the failure.
 */
export function reportInstallError(name: string, errorMessage?: string) {
  const entries = [];
  entries.push(
    <p>
      An error occurred installing <code>{name}</code>.
    </p>
  );
  if (errorMessage) {
    entries.push(
      <p>
        <span className="jp-extensionmanager-dialog-subheader">
          Error message:
        </span>
      </p>,
      <pre>{errorMessage.trim()}</pre>
    );
  }
  const body = <div className="jp-extensionmanager-dialog">{entries}</div>;
  void showDialog({
    title: 'Extension Installation Error',
    body,
    buttons: [Dialog.warnButton({ label: 'OK' })]
  });
}
