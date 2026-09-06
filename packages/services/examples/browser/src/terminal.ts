// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Terminal, TerminalManager } from '@jupyterlab/services';

import { log } from './log';

export async function main(): Promise<void> {
  log('Terminal');

  // See if terminals are available
  if (Terminal.isAvailable()) {
    const manager = new TerminalManager();
    // Create a named terminal session and send some data.
    const session = await manager.startNew();
    session.send({ type: 'stdin', content: ['foo'] });
  }
}
