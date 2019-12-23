// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TerminalSession } from '@jupyterlab/services';

import { log } from './log';

export async function main() {
  log('Terminal');

  // See if terminals are available
  if (TerminalSession.isAvailable()) {
    // Create a named terminal session and send some data.
    let session = await TerminalSession.startNew();
    session.send({ type: 'stdin', content: ['foo'] });
  }
}
