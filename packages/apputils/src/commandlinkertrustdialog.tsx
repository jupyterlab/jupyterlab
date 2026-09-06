// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from './dialog';
import * as React from 'react';

interface ICommandLinkerTrustDialogOptions {
  args: string;
  buttons: ReadonlyArray<Dialog.IButton>;
  command: string;
  commandLabel: string;
  defaultButton: number;
  hasTrustCommand: boolean;
  title: string;
}

export function showCommandLinkerTrustDialog(
  options: ICommandLinkerTrustDialogOptions
): Promise<Dialog.IResult<void>> {
  const trans = Dialog.translator.load('jupyterlab');

  return showDialog<void>({
    title: options.title,
    body: (
      <div>
        <p>
          {trans.__(
            'This document is not trusted. Running a command may execute arbitrary code.'
          )}
        </p>
        <p>
          {options.hasTrustCommand
            ? trans.__(
                'Select "Trust" to trust this document, or "Run Once" to allow this command without trusting it.'
              )
            : trans.__('Only proceed if you trust the author of this content.')}
        </p>
        <p>
          <strong>{trans.__('Command Label:')}</strong> {options.commandLabel}
        </p>
        <p>
          <strong>{trans.__('Command ID:')}</strong> {options.command}
        </p>
        <div>
          <strong>{trans.__('Arguments:')}</strong>
          <pre>{options.args}</pre>
        </div>
      </div>
    ),
    buttons: options.buttons,
    defaultButton: options.defaultButton
  });
}
